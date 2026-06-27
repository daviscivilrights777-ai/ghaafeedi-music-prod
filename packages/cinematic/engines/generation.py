# ============================================================
# FILE: engines/generation.py
# PURPOSE: Generate all shots using Poyo.ai Seedance 2
# REPLACED: ComfyUI/CogVideoX backend — now calls Poyo REST API directly
# ============================================================

import logging
import time
import os
import json
import requests
from pathlib import Path
from typing import List, Optional, Callable
from dataclasses import dataclass, field

from config import Shot, ShotPlan, GhaafeediSettings
from engines.camera_injection import CameraInjectionEngine
from knowledge.camera_moves import get_camera_move

# ── Consistency + Security (lazy — only imported when order_id provided) ──────
import sys
_CONSISTENCY_AVAILABLE = False
try:
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    _CONSISTENCY_AVAILABLE = True
except Exception:
    pass


logger = logging.getLogger("ghaafeedi.generation")

# ── Poyo.ai constants ────────────────────────────────────────────────────────
POYO_BASE        = "https://api.poyo.ai"
POYO_SUBMIT      = f"{POYO_BASE}/api/generate/submit"
POYO_DETAIL      = f"{POYO_BASE}/api/generate/detail/music"  # universal endpoint
POYO_POLL_SECS   = 8     # poll every 8s
POYO_TIMEOUT     = 300   # 5min max per clip


# ─── Result dataclasses ───────────────────────────────────────────────────────

@dataclass
class GeneratedShot:
    """Result of generating a single shot via Poyo Seedance 2."""
    shot: Shot
    raw_video_path: Optional[str]    = None
    video_url:      Optional[str]    = None
    task_id:        Optional[str]    = None
    success:        bool             = False
    error:          Optional[str]    = None
    generation_time_seconds: float   = 0.0
    # Legacy fields kept for compatibility with assembly pipeline
    keyframe_path:           Optional[str] = None
    interpolated_video_path: Optional[str] = None


# ─── Poyo Video Engine ────────────────────────────────────────────────────────

class PoyoVideoEngine:
    """
    Dispatches video generation to Poyo.ai Seedance 2 via HTTP.
    Handles submit → poll → download flow.

    Model routing:
      clip_batch / video / visualization → seedance-2 (cinematic, 1080p/720p)
      draft (shot.draft=True)            → seedance-2-fast (720p, cheaper)
      music_video                        → seedance-2-mini (480p/720p + audio)
    """

    def __init__(self, api_key: str, output_dir: str = "/tmp/ghaafeedi_production"):
        self.api_key    = api_key
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.raw_video_dir = self.output_dir / "raw_video"
        self.raw_video_dir.mkdir(parents=True, exist_ok=True)

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type":  "application/json",
        }

    def submit_shot(
        self,
        shot: Shot,
        index: int,
        resolution: str = "1080p",
        aspect_ratio: str = "16:9",
        draft: bool = False,
        music_video: bool = False,
    ) -> str:
        """Submit one shot to Poyo Seedance 2. Returns task_id."""

        # ── Model selection ──────────────────────────────────────────────────
        if music_video:
            model = "seedance-2-mini"
            res   = "720p"
        elif draft:
            model = "seedance-2-fast"
            res   = "720p"
        else:
            model = "seedance-2"
            res   = resolution

        # ── Build prompt (Level 1 camera injection via text) ─────────────────
        camera_engine = CameraInjectionEngine(comfyui_api=None)
        camera_result = camera_engine.apply_to_shot(
            shot=shot,
            original_prompt=shot.visual_prompt,
            raw_video_path="",
            output_video_path="",
            num_frames=int(shot.duration_seconds * 8),
            width=1920 if res == "1080p" else 1280,
            height=1080 if res == "1080p" else 720,
        )
        enhanced_prompt = camera_result.get("enhanced_prompt", shot.visual_prompt)

        # ── Duration clamp ───────────────────────────────────────────────────
        duration = max(4, min(15, round(shot.duration_seconds)))

        payload = {
            "model": model,
            "input": {
                "prompt":          enhanced_prompt,
                "duration":        duration,
                "aspect_ratio":    aspect_ratio,
                "resolution":      res,
                "generate_audio":  False,  # audio added in edit_assemble
                "negative_prompt": getattr(shot, "negative_prompt", "blurry, low quality, amateur, watermark"),
            },
        }

        # First/last frame conditioning if shot carries reference images
        if hasattr(shot, "start_image_url") and shot.start_image_url:
            payload["input"]["image_url"] = shot.start_image_url
        if hasattr(shot, "end_image_url") and shot.end_image_url:
            payload["input"]["end_image_url"] = shot.end_image_url

        logger.info(
            f"  [Poyo] Submitting shot {index+1}: model={model} "
            f"res={res} dur={duration}s"
        )

        resp = requests.post(
            POYO_SUBMIT,
            headers=self._headers(),
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        if data.get("error"):
            raise RuntimeError(f"[Poyo] Submit error: {data['error']['message']}")

        task_id = data["data"]["task_id"]
        logger.info(f"  [Poyo] Task dispatched: {task_id}")
        return task_id

    def poll_until_complete(self, task_id: str, timeout: int = POYO_TIMEOUT) -> dict:
        """Poll /api/generate/detail/music until status=finished. Returns files[]."""
        deadline = time.time() + timeout
        while time.time() < deadline:
            time.sleep(POYO_POLL_SECS)
            resp = requests.get(
                POYO_DETAIL,
                params={"task_id": task_id},
                headers=self._headers(),
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json().get("data", {})
            status = (data.get("status") or "").lower()

            if status == "finished":
                logger.info(f"  [Poyo] Task {task_id} finished ✅")
                return data
            elif status == "failed":
                err = data.get("error_message") or "Seedance 2 generation failed"
                raise RuntimeError(f"[Poyo] Task {task_id} failed: {err}")
            else:
                progress = data.get("progress", 0)
                logger.debug(f"  [Poyo] {task_id} status={status} progress={progress}%")

        raise TimeoutError(f"[Poyo] Task {task_id} timed out after {timeout}s")

    def download_clip(self, video_url: str, shot_index: int) -> str:
        """Download MP4 from Poyo CDN to local raw_video_dir. Returns path."""
        out_path = str(self.raw_video_dir / f"shot_{shot_index+1:04d}_raw.mp4")
        resp = requests.get(video_url, timeout=120, stream=True)
        resp.raise_for_status()
        with open(out_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=65536):
                f.write(chunk)
        logger.info(f"  [Poyo] Downloaded clip → {out_path}")
        return out_path

    def generate_shot(
        self,
        shot: Shot,
        index: int,
        resolution: str = "1080p",
        aspect_ratio: str = "16:9",
        draft: bool = False,
        music_video: bool = False,
        download: bool = True,
    ) -> GeneratedShot:
        """Full submit → poll → download flow for a single shot."""
        result = GeneratedShot(shot=shot)
        start  = time.time()

        try:
            task_id = self.submit_shot(
                shot=shot,
                index=index,
                resolution=resolution,
                aspect_ratio=aspect_ratio,
                draft=draft,
                music_video=music_video,
            )
            result.task_id = task_id

            finished_data = self.poll_until_complete(task_id)
            files = finished_data.get("files", [])
            video_url = None
            for f in files:
                if f.get("video_url"):
                    video_url = f["video_url"]
                    break

            if not video_url:
                result.error = f"No video_url in Poyo response: {json.dumps(files)}"
                return result

            result.video_url = video_url
            result.interpolated_video_path = video_url  # URL — assembly downloads it

            if download:
                local_path = self.download_clip(video_url, index)
                result.raw_video_path = local_path
                result.interpolated_video_path = local_path  # ready for assembly

            result.success = True

        except Exception as e:
            result.error = str(e)
            logger.error(f"  [Poyo] Shot {index+1} failed: {e}")
        finally:
            result.generation_time_seconds = time.time() - start

        return result


# ─── ShotGenerationEngine (drop-in replacement for ComfyUI version) ───────────

class ShotGenerationEngine:
    """
    Generates all shots via Poyo.ai Seedance 2.
    Drop-in replacement for the former ComfyUI-based engine.
    Camera injection Level 1 (prompt enhancement) is preserved.
    Level 2/3 warp is applied post-download via FFmpeg (unchanged).
    """

    def __init__(self, settings: GhaafeediSettings,
                 output_dir: str = "/tmp/ghaafeedi_production",
                 order_id: Optional[str] = None,
                 character_id: Optional[str] = None,
                 character_ids: Optional[List[str]] = None):
        """
        Parameters
        ----------
        character_id  : Single character ID (backwards-compat).
        character_ids : List of character IDs for multi-character productions.
                        If both provided, character_ids takes precedence.
                        Couples Journey Film, Family Vault, etc. should pass
                        all character IDs here.
        """
        self.settings   = settings
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.interpolated_dir = self.output_dir / "interpolated"
        self.interpolated_dir.mkdir(parents=True, exist_ok=True)

        api_key = os.environ.get("POYO_API_KEY", "")
        if not api_key:
            logger.warning("[ShotGenerationEngine] POYO_API_KEY not set in environment")

        self.poyo = PoyoVideoEngine(api_key=api_key, output_dir=str(self.output_dir))
        self.order_id     = order_id
        # Resolve character list — prefer explicit character_ids, fall back to singular
        if character_ids:
            self.character_ids: Optional[List[str]] = character_ids
            self.character_id  = character_ids[0]  # primary
        elif character_id:
            self.character_ids = [character_id]
            self.character_id  = character_id
        else:
            self.character_ids = None
            self.character_id  = None

    def _tier_to_resolution(self) -> str:
        """Map production tier to Seedance 2 resolution."""
        tier = getattr(self.settings, "production_tier", "premium").lower()
        return {
            "elite":   "1080p",
            "premium": "1080p",
            "starter": "720p",
            "draft":   "480p",
        }.get(tier, "1080p")

    def generate_all_shots(
        self,
        shot_plan: ShotPlan,
        progress_callback: Optional[Callable] = None,
    ) -> List[GeneratedShot]:
        """
        Generate all shots sequentially via Poyo Seedance 2.
        Returns list of GeneratedShot results.
        """
        total      = len(shot_plan.shots)
        resolution = self._tier_to_resolution()

        logger.info(
            f"[ShotGenerationEngine] Starting {total} shots via Poyo Seedance 2 "
            f"(resolution={resolution})"
        )

        results: List[GeneratedShot] = []

        # ── Consent gate (async-safe: called synchronously via asyncio.run if needed) ──
        _consistency_mgr = None
        _multi_char_mode = False
        if self.order_id and self.character_ids and _CONSISTENCY_AVAILABLE:
            try:
                import asyncio
                from security.consent.consent_manager import ConsentManager

                consent_mgr = ConsentManager()
                loop = asyncio.new_event_loop()

                # Check consent for every character in this production
                for _cid in self.character_ids:
                    ok, reason = loop.run_until_complete(
                        consent_mgr.check_gate(
                            order_id=self.order_id,
                            character_id=_cid,
                            user_id=getattr(self.settings, "user_id", "unknown"),
                        )
                    )
                    if not ok:
                        logger.error(
                            "[ShotGenerationEngine] Consent gate BLOCKED for char %s: %s",
                            _cid, reason,
                        )
                        loop.close()
                        return [
                            GeneratedShot(
                                shot=s,
                                success=False,
                                error=f"Consent gate [{_cid}]: {reason}",
                            )
                            for s in shot_plan.shots
                        ]

                loop.close()

                # Pick single vs multi-character consistency manager
                if len(self.character_ids) > 1:
                    from consistency.multi_character_manager import MultiCharacterConsistencyManager
                    _consistency_mgr = MultiCharacterConsistencyManager(
                        order_id=self.order_id,
                        character_ids=self.character_ids,
                    )
                    _multi_char_mode = True
                    logger.info(
                        "[ShotGenerationEngine] Consent gate PASSED — multi-char mode (%d chars)",
                        len(self.character_ids),
                    )
                else:
                    from consistency.consistency_manager import ConsistencyManager
                    _consistency_mgr = ConsistencyManager(
                        order_id=self.order_id,
                        character_id=self.character_ids[0],
                    )
                    logger.info("[ShotGenerationEngine] Consent gate PASSED — single-char consistency manager ready")
            except Exception as cg_err:
                logger.warning("[ShotGenerationEngine] Consent/consistency init failed (non-blocking): %s", cg_err)

        for i, shot in enumerate(shot_plan.shots):
            logger.info(
                f"\n{'='*50}\n"
                f"GENERATING SHOT {i+1}/{total}\n"
                f"Type:     {shot.shot_type.value}\n"
                f"Camera:   {shot.camera_movement.value}\n"
                f"Duration: {shot.duration_seconds}s\n"
                f"{'='*50}"
            )

            # ── Level 1+2: Consistency payload injection ─────────────────────
            _shot_desc = getattr(shot, 'description', '') or ''
            _base_payload: dict = {}
            if _consistency_mgr is not None:
                try:
                    import asyncio
                    _loop2 = asyncio.new_event_loop()
                    if _multi_char_mode:
                        # Multi-char: get merged consistency context for all chars
                        _base_payload = _loop2.run_until_complete(
                            _consistency_mgr.get_consistent_payload_multi({}, _shot_desc)
                        )
                    else:
                        _base_payload = _loop2.run_until_complete(
                            _consistency_mgr.get_consistent_payload({}, _shot_desc)
                        )
                    _loop2.close()
                    # Merge consistency context into shot description
                    if _base_payload.get("prompt"):
                        shot = type(shot)(
                            **{**shot.__dict__, "description": _base_payload["prompt"]}
                        )
                except Exception as _ci_err:
                    logger.warning("Consistency injection failed (non-blocking): %s", _ci_err)

            result = self.poyo.generate_shot(
                shot=shot,
                index=i,
                resolution=resolution,
                aspect_ratio="16:9",
                draft=False,
                download=True,
            )

            # ── Level 3: Post-generation QA ───────────────────────────────────
            if _consistency_mgr is not None and result.success and result.video_url:
                try:
                    import asyncio
                    _loop3 = asyncio.new_event_loop()
                    if _multi_char_mode:
                        # Multi-char: broadcast one video URL to all character managers
                        _verify = _loop3.run_until_complete(
                            _consistency_mgr.verify_shot_broadcast(
                                video_url=result.video_url,
                                shot_index=i,
                            )
                        )
                        _loop3.close()
                        _is_paused   = _verify.any_paused
                        _qa_passed   = _verify.all_passed
                        _worst_score = _verify.worst_score
                    else:
                        _verify = _loop3.run_until_complete(
                            _consistency_mgr.verify_shot_with_pause(
                                generated_frame_url=result.video_url,
                                shot_index=i,
                            )
                        )
                        _loop3.close()
                        _is_paused   = _verify.paused
                        _qa_passed   = _verify.passed
                        _worst_score = (
                            getattr(_verify.qa, "score", 0.0)
                            if hasattr(_verify, "qa") and _verify.qa else 0.0
                        )

                    if _is_paused:
                        logger.error(
                            "Shot %d: double QA fail — job paused. order=%s",
                            i, self.order_id,
                        )
                        results.append(result)
                        for remaining in shot_plan.shots[i+1:]:
                            results.append(GeneratedShot(
                                shot=remaining, success=False,
                                error="Job paused after double QA fail on shot " + str(i+1),
                            ))
                        return results
                    elif not _qa_passed:
                        logger.warning(
                            "Shot %d QA fail (worst_score=%.3f) — continuing.",
                            i, _worst_score,
                        )
                except Exception as _qa_err:
                    logger.warning("Post-gen QA failed (non-blocking): %s", _qa_err)

            # Level 3 post-warp if shot is non-static and generation succeeded
            if result.success and shot.camera_movement.value != "STATIC":
                warped_path = str(
                    self.interpolated_dir / f"shot_{i+1:04d}_warped.mp4"
                )
                try:
                    camera_engine = CameraInjectionEngine(comfyui_api=None)
                    final_path = camera_engine.apply_post_generation_warp(
                        input_video_path=result.raw_video_path or "",
                        output_video_path=warped_path,
                        move_name=shot.camera_movement.value,
                        duration_seconds=shot.duration_seconds,
                        width=1920 if resolution == "1080p" else 1280,
                        height=1080 if resolution == "1080p" else 720,
                    )
                    result.interpolated_video_path = final_path
                    logger.info(f"  Level 3 warp applied: {shot.camera_movement.value}")
                except Exception as warp_err:
                    logger.warning(f"  Level 3 warp skipped: {warp_err}")
                    # Fall back to raw downloaded clip — still valid output
                    result.interpolated_video_path = result.raw_video_path

            results.append(result)

            if progress_callback:
                progress_callback({
                    "current":          i + 1,
                    "total":            total,
                    "shot_id":          shot.shot_id,
                    "success":          result.success,
                    "progress_percent": ((i + 1) / total) * 100,
                    "task_id":          result.task_id,
                    "video_url":        result.video_url,
                })

            logger.info(
                f"Shot {i+1} {'✅ COMPLETE' if result.success else '❌ FAILED'} "
                f"({result.generation_time_seconds:.1f}s)"
            )

        success_count = sum(1 for r in results if r.success)
        logger.info(
            f"\n[ShotGenerationEngine] Done: {success_count}/{total} shots successful"
        )
        return results
