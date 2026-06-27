# ============================================================
# FILE: consistency/character_extractor.py
# PURPOSE: Extract or generate reference faces for characters
#
# TWO MODES:
#   Mode A: Customer submits a photo → detect face, describe it,
#           upload to R2, return CharacterReference
#   Mode B: No photo → GPT-4o writes a character description →
#           FAL.ai flux/schnell generates a reference portrait
#
# NO ComfyUI. NO IP-Adapter. NO angle variants.
# Poyo.ai Seedance 2 handles angle variance natively via the
# 'image' reference parameter (Level 2 face-lock).
# ============================================================

import base64
import logging
import os
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import httpx

from consistency.r2_storage import upload_face_image, upload_embedding

logger = logging.getLogger("ghaafeedi.consistency.extractor")


@dataclass
class CharacterReference:
    """
    Complete reference package for one character.
    Contains everything needed for Level 1 + Level 2 + Level 3 consistency.
    """
    character_id: str
    character_name: str

    # Level 1: text fingerprint injected into every Poyo prompt
    visual_description: str
    prompt_prefix: str
    negative_prefix: str

    # Level 2: face-lock image reference for Poyo.ai 'image' parameter
    front_face_path: str       # local /tmp path (may not persist after session)
    r2_key: str                # R2 storage key — permanent
    poyo_image_url: str        # public URL passed to Poyo seedance-2 'image' param

    # Level 3: InsightFace embedding for QA comparison
    face_embedding_path: str   # local /tmp path or R2 key

    # Metadata
    source: str                # "customer_photo" | "ai_generated"
    quality_score: float = 1.0


# ─── FAL.ai flux/schnell constants ───────────────────────────────────────────
_FAL_BASE      = "https://queue.fal.run"
_FAL_SUBMIT    = f"{_FAL_BASE}/fal-ai/flux/schnell"
_FAL_POLL_SECS = 3
_FAL_TIMEOUT   = 120


class CharacterExtractor:
    """
    Extracts or generates character reference images.
    Run once per character per order before shot generation begins.

    Dependencies:
        openai_client  — already-instantiated OpenAI client
        fal_api_key    — FAL.ai key (Mode B portrait generation)
        r2_client      — unused directly; r2_storage module handles it
        tmp_dir        — local scratch dir (default /tmp/ghaafeedi_chars)
    """

    def __init__(
        self,
        openai_client,
        fal_api_key: str = "",
        tmp_dir: str = "/tmp/ghaafeedi_chars",
    ):
        self.openai     = openai_client
        self.fal_key    = fal_api_key or os.environ.get("FAL_KEY", "")
        self.tmp_dir    = Path(tmp_dir)
        self.tmp_dir.mkdir(parents=True, exist_ok=True)

    # ──────────────────────────────────────────────────────────────────────────
    # PUBLIC: Mode A — customer submitted a photo
    # ──────────────────────────────────────────────────────────────────────────

    def extract_from_photo(
        self,
        photo_path: str,
        character_name: str,
        order_id: str,
    ) -> CharacterReference:
        """
        Mode A: Customer submitted a photo.

        1. Detect + crop face from photo (OpenCV)
        2. GPT-4o Vision → verbal description
        3. Upload cropped face to R2
        4. Extract InsightFace embedding (optional, graceful fail)
        5. Build prompt tokens
        6. Return CharacterReference
        """
        logger.info(f"[Extractor] Mode A: extracting from photo for '{character_name}'")

        character_id = f"{order_id}_{character_name.lower().replace(' ', '_')}"
        char_dir     = self.tmp_dir / character_id
        char_dir.mkdir(parents=True, exist_ok=True)

        # Step 1 — face detection + crop
        face_detected, face_crop_path = self._detect_and_crop_face(
            photo_path,
            str(char_dir / "face_crop.jpg"),
        )

        if not face_detected or not face_crop_path:
            logger.warning(
                f"[Extractor] No face detected for '{character_name}'. "
                "Falling back to Mode B (AI-generated reference)."
            )
            return self.generate_from_description(
                character_description=f"A person named {character_name}",
                character_name=character_name,
                order_id=order_id,
            )

        # Step 2 — GPT-4o Vision description
        visual_description = self._describe_face_with_gpt4o(face_crop_path)
        logger.info(f"[Extractor] Description: {visual_description[:80]}...")

        # Step 3 — upload to R2
        r2_key       = f"consistency/{order_id}/{character_id}/face.jpg"
        poyo_img_url = upload_face_image(face_crop_path, r2_key)

        # Step 4 — InsightFace embedding (optional)
        embedding_path = self._extract_face_embedding(
            face_crop_path,
            str(char_dir / "embedding.npy"),
        )

        # Step 5 — prompt tokens
        prompt_prefix, negative_prefix = self._build_prompt_tokens(visual_description)

        return CharacterReference(
            character_id=character_id,
            character_name=character_name,
            visual_description=visual_description,
            prompt_prefix=prompt_prefix,
            negative_prefix=negative_prefix,
            front_face_path=face_crop_path,
            r2_key=r2_key,
            poyo_image_url=poyo_img_url,
            face_embedding_path=embedding_path,
            source="customer_photo",
            quality_score=0.95,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # PUBLIC: Mode B — no photo, generate from story
    # ──────────────────────────────────────────────────────────────────────────

    def generate_from_description(
        self,
        character_description: str,
        character_name: str,
        order_id: str,
        emotion: str = "neutral",
        age_hint: str = "adult",
        gender_hint: str = "unspecified",
    ) -> CharacterReference:
        """
        Mode B: No customer photo.

        1. GPT-4o writes detailed visual character description
        2. FAL.ai flux/schnell generates a portrait
        3. Upload portrait to R2
        4. Extract InsightFace embedding (optional)
        5. Build prompt tokens
        6. Return CharacterReference
        """
        logger.info(f"[Extractor] Mode B: generating reference for '{character_name}'")

        character_id = f"{order_id}_{character_name.lower().replace(' ', '_')}"
        char_dir     = self.tmp_dir / character_id
        char_dir.mkdir(parents=True, exist_ok=True)

        # Step 1 — GPT-4o character description
        visual_description = self._generate_character_description(
            story_description=character_description,
            character_name=character_name,
            emotion=emotion,
            age_hint=age_hint,
            gender_hint=gender_hint,
        )
        logger.info(f"[Extractor] Description: {visual_description[:80]}...")

        # Step 2 — FAL.ai flux/schnell portrait
        portrait_path = self._generate_reference_portrait_fal(
            description=visual_description,
            output_path=str(char_dir / "front_face.jpg"),
        )

        if not portrait_path:
            logger.error("[Extractor] Portrait generation failed — using placeholder")
            # Return a degraded reference (Level 1 only, no Level 2 image lock)
            prompt_prefix, negative_prefix = self._build_prompt_tokens(visual_description)
            return CharacterReference(
                character_id=character_id,
                character_name=character_name,
                visual_description=visual_description,
                prompt_prefix=prompt_prefix,
                negative_prefix=negative_prefix,
                front_face_path="",
                r2_key="",
                poyo_image_url="",
                face_embedding_path="",
                source="ai_generated",
                quality_score=0.5,
            )

        # Step 3 — upload to R2
        r2_key       = f"consistency/{order_id}/{character_id}/face.jpg"
        poyo_img_url = upload_face_image(portrait_path, r2_key)

        # Step 4 — embedding (optional)
        embedding_path = self._extract_face_embedding(
            portrait_path,
            str(char_dir / "embedding.npy"),
        )

        # Step 5 — prompt tokens
        prompt_prefix, negative_prefix = self._build_prompt_tokens(visual_description)

        return CharacterReference(
            character_id=character_id,
            character_name=character_name,
            visual_description=visual_description,
            prompt_prefix=prompt_prefix,
            negative_prefix=negative_prefix,
            front_face_path=portrait_path,
            r2_key=r2_key,
            poyo_image_url=poyo_img_url,
            face_embedding_path=embedding_path,
            source="ai_generated",
            quality_score=0.85,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # PRIVATE: GPT-4o character description (Mode B text generation)
    # ──────────────────────────────────────────────────────────────────────────

    def _generate_character_description(
        self,
        story_description: str,
        character_name: str,
        emotion: str,
        age_hint: str,
        gender_hint: str,
    ) -> str:
        response = self.openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a character designer for a cinematic music video production.\n"
                        "Create a precise, detailed visual description of a character "
                        "that an AI video generator can use to keep the same person consistent "
                        "across many shots.\n\n"
                        "RULES:\n"
                        "1. Be SPECIFIC — not 'brown hair' but 'medium-length dark chestnut brown "
                        "hair with subtle waves'\n"
                        "2. Include: age range, face shape, eye color, hair color and style, "
                        "skin tone, any distinctive features\n"
                        "3. 2-3 sentences maximum\n"
                        "4. Write in the style of visual prompt engineering\n"
                        "5. Do NOT mention clothing\n"
                        "6. Focus ONLY on face and head features\n\n"
                        "OUTPUT: Return ONLY the character description. No preamble."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"CHARACTER NAME: {character_name}\n"
                        f"STORY CONTEXT: {story_description[:500]}\n"
                        f"PRIMARY EMOTION: {emotion}\n"
                        f"AGE HINT: {age_hint}\n"
                        f"GENDER HINT: {gender_hint}\n\n"
                        "Create a precise visual description."
                    ),
                },
            ],
            temperature=0.3,
            max_tokens=200,
        )
        return response.choices[0].message.content.strip()

    # ──────────────────────────────────────────────────────────────────────────
    # PRIVATE: GPT-4o Vision face description (Mode A)
    # ──────────────────────────────────────────────────────────────────────────

    def _describe_face_with_gpt4o(self, face_path: str) -> str:
        try:
            with open(face_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode()

            response = self.openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": (
                                    "Describe this person's face precisely for use in "
                                    "AI video generation prompts.\n\n"
                                    "Focus on: age range, face shape, eye color and shape, "
                                    "hair color/length/texture, skin tone, distinctive features.\n"
                                    "Write 2-3 sentences maximum. Be specific enough that "
                                    "an AI could generate the same face consistently.\n"
                                    "Do NOT mention clothing. Output ONLY the description."
                                ),
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_data}",
                                    "detail": "high",
                                },
                            },
                        ],
                    }
                ],
                max_tokens=200,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"[Extractor] GPT-4o Vision failed: {e}")
            return "a person with a warm and expressive face"

    # ──────────────────────────────────────────────────────────────────────────
    # PRIVATE: FAL.ai flux/schnell portrait generation (Mode B)
    # ──────────────────────────────────────────────────────────────────────────

    def _generate_reference_portrait_fal(
        self,
        description: str,
        output_path: str,
    ) -> Optional[str]:
        """Generate a portrait using FAL.ai flux/schnell."""
        if not self.fal_key:
            logger.warning("[Extractor] FAL_KEY not set — skipping portrait generation")
            return None

        prompt = (
            f"{description}, front-facing portrait, looking directly at camera, "
            "neutral expression, studio lighting, sharp focus on face, "
            "professional portrait photography, 85mm lens, "
            "shallow depth of field, cinematic, highly detailed face, "
            "photorealistic, masterpiece quality"
        )
        neg_prompt = (
            "cartoon, anime, illustration, deformed face, distorted, blurry, "
            "multiple people, sunglasses, mask, hat covering face, watermark, text"
        )

        headers = {
            "Authorization": f"Key {self.fal_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "prompt": prompt,
            "negative_prompt": neg_prompt,
            "image_size": "portrait_4_3",
            "num_inference_steps": 4,
            "num_images": 1,
            "enable_safety_checker": False,
        }

        try:
            # Submit
            resp = httpx.post(
                _FAL_SUBMIT,
                json=payload,
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()

            # Handle sync response (flux/schnell returns immediately)
            images = data.get("images") or []
            if images and images[0].get("url"):
                img_url = images[0]["url"]
            else:
                # Async queue — poll
                request_id = data.get("request_id") or data.get("id")
                if not request_id:
                    logger.error(f"[Extractor] FAL no request_id: {data}")
                    return None
                img_url = self._poll_fal(request_id, headers)
                if not img_url:
                    return None

            # Download image
            img_resp = httpx.get(img_url, timeout=60)
            img_resp.raise_for_status()
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(img_resp.content)

            logger.info(f"[Extractor] Portrait generated: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"[Extractor] FAL portrait generation failed: {e}")
            return None

    def _poll_fal(self, request_id: str, headers: dict) -> Optional[str]:
        """Poll FAL.ai queue until image is ready."""
        status_url = f"{_FAL_BASE}/fal-ai/flux/schnell/requests/{request_id}"
        deadline = time.time() + _FAL_TIMEOUT
        while time.time() < deadline:
            time.sleep(_FAL_POLL_SECS)
            try:
                resp = httpx.get(status_url, headers=headers, timeout=15)
                resp.raise_for_status()
                data = resp.json()
                status = (data.get("status") or "").lower()
                if status in ("completed", "ok"):
                    images = data.get("images") or []
                    if images:
                        return images[0].get("url")
                elif status == "failed":
                    logger.error(f"[Extractor] FAL task failed: {data}")
                    return None
            except Exception as e:
                logger.warning(f"[Extractor] FAL poll error: {e}")
        return None

    # ──────────────────────────────────────────────────────────────────────────
    # PRIVATE: OpenCV face detection + crop
    # ──────────────────────────────────────────────────────────────────────────

    def _detect_and_crop_face(
        self,
        photo_path: str,
        output_path: str,
    ) -> tuple:
        """Detect face in customer photo, crop to face region with padding."""
        try:
            import cv2

            img = cv2.imread(photo_path)
            if img is None:
                return False, ""

            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            )
            gray  = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=5, minSize=(100, 100)
            )

            if len(faces) == 0:
                logger.warning("[Extractor] No face found with cascade — using full image")
                resized = cv2.resize(img, (768, 768))
                cv2.imwrite(output_path, resized)
                return True, output_path

            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            padding = int(max(w, h) * 0.4)
            x1 = max(0, x - padding)
            y1 = max(0, y - padding)
            x2 = min(img.shape[1], x + w + padding)
            y2 = min(img.shape[0], y + h + padding)
            face_crop = img[y1:y2, x1:x2]
            face_crop = cv2.resize(face_crop, (768, 768))

            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(output_path, face_crop)
            logger.info(f"[Extractor] Face cropped: {output_path}")
            return True, output_path

        except Exception as e:
            logger.error(f"[Extractor] Face detection failed: {e}")
            return False, ""

    # ──────────────────────────────────────────────────────────────────────────
    # PRIVATE: InsightFace embedding extraction (optional)
    # ──────────────────────────────────────────────────────────────────────────

    def _extract_face_embedding(
        self,
        face_path: str,
        embedding_path: str,
    ) -> str:
        """
        Extract InsightFace face embedding for Level 3 QA comparison.
        Gracefully returns '' if insightface is not installed or GPU unavailable.
        """
        try:
            import insightface  # lazy import — not required for Levels 1+2
            import numpy as np
            import cv2

            # Try GPU first, fall back to CPU
            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
            app = insightface.app.FaceAnalysis(providers=providers)
            app.prepare(ctx_id=0, det_size=(640, 640))

            img = cv2.imread(face_path)
            if img is None:
                return ""

            faces = app.get(img)
            if not faces:
                logger.warning("[Extractor] InsightFace: no face found for embedding")
                return ""

            largest_face = max(
                faces,
                key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
            )
            embedding = largest_face.normed_embedding

            Path(embedding_path).parent.mkdir(parents=True, exist_ok=True)
            np.save(embedding_path, embedding)
            logger.info(
                f"[Extractor] Embedding extracted: shape={embedding.shape}"
            )
            return embedding_path

        except ImportError:
            logger.warning("[Extractor] insightface not installed — Level 3 will use SSIM fallback")
            return ""
        except Exception as e:
            logger.error(f"[Extractor] Embedding extraction failed: {e}")
            return ""

    # ──────────────────────────────────────────────────────────────────────────
    # PRIVATE: Build prompt tokens from visual description
    # ──────────────────────────────────────────────────────────────────────────

    def _build_prompt_tokens(self, visual_description: str) -> tuple:
        """
        Convert visual description into prompt/negative tokens.
        Returns (prompt_prefix, negative_prefix).
        """
        prompt_prefix = visual_description.rstrip(".,") + ","
        negative_prefix = (
            "different person, face change, inconsistent appearance, "
            "morphed features, wrong person, different identity, face swap, "
            "character inconsistency"
        )
        return prompt_prefix, negative_prefix
