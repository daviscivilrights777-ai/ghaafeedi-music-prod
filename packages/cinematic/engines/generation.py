# ============================================================
# FILE: engines/generation.py
# PURPOSE: Generate all shots using ComfyUI on GPU infrastructure
# RUNABLE: Orchestrate this on fal.ai / Modal / Vast.ai
# Final version — all 3 camera injection levels wired
# ============================================================

import logging
import time
from pathlib import Path
from typing import List, Optional, Callable
from dataclasses import dataclass

from config import Shot, ShotPlan, GhaafeediSettings
from engines.comfyui_api import ComfyUIAPI, WorkflowBuilder
from engines.camera_injection import CameraInjectionEngine
from knowledge.camera_moves import get_camera_move, interpolate_trajectory

logger = logging.getLogger("ghaafeedi.generation")


@dataclass
class GeneratedShot:
    """Result of generating a single shot."""
    shot: Shot
    keyframe_path: Optional[str] = None
    raw_video_path: Optional[str] = None
    interpolated_video_path: Optional[str] = None
    success: bool = False
    error: Optional[str] = None
    generation_time_seconds: float = 0.0


class ShotGenerationEngine:
    """
    Generates all shots in a shot plan using ComfyUI.
    Handles keyframe generation, video generation, and frame interpolation.
    All 3 camera injection levels are attempted in order.
    """

    def __init__(self, settings: GhaafeediSettings,
                 output_dir: str = "/tmp/ghaafeedi_production"):
        self.settings = settings
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Create subdirectories
        self.keyframes_dir = self.output_dir / "keyframes"
        self.raw_video_dir = self.output_dir / "raw_video"
        self.interpolated_dir = self.output_dir / "interpolated"
        for d in [self.keyframes_dir, self.raw_video_dir, self.interpolated_dir]:
            d.mkdir(parents=True, exist_ok=True)

        self.comfyui = ComfyUIAPI(
            settings.comfyui_url.replace("http://", "").replace("https://", "")
        )

    def generate_all_shots(self, shot_plan: ShotPlan,
                           progress_callback: Optional[Callable] = None
                           ) -> List[GeneratedShot]:
        """
        Generate all shots in the plan.
        Returns list of GeneratedShot results.
        """
        logger.info(
            f"Starting generation of {len(shot_plan.shots)} shots"
        )

        # Connect to ComfyUI
        if not self.comfyui.connect():
            raise ConnectionError("Cannot connect to ComfyUI")

        results = []
        total = len(shot_plan.shots)

        for i, shot in enumerate(shot_plan.shots):
            logger.info(
                f"\n{'='*50}\n"
                f"GENERATING SHOT {i+1}/{total}\n"
                f"Type: {shot.shot_type.value}\n"
                f"Camera: {shot.camera_movement.value}\n"
                f"Duration: {shot.duration_seconds}s\n"
                f"{'='*50}"
            )

            start_time = time.time()

            try:
                result = self._generate_single_shot(shot, i)
                result.generation_time_seconds = time.time() - start_time
                results.append(result)

                if progress_callback:
                    progress_callback({
                        "current": i + 1,
                        "total": total,
                        "shot_id": shot.shot_id,
                        "success": result.success,
                        "progress_percent": ((i + 1) / total) * 100
                    })

                logger.info(
                    f"Shot {i+1} {'✅ COMPLETE' if result.success else '❌ FAILED'} "
                    f"({result.generation_time_seconds:.1f}s)"
                )

            except Exception as e:
                logger.error(f"Shot {i+1} failed: {e}")
                results.append(GeneratedShot(
                    shot=shot,
                    success=False,
                    error=str(e),
                    generation_time_seconds=time.time() - start_time
                ))

        self.comfyui.disconnect()

        success_count = sum(1 for r in results if r.success)
        logger.info(
            f"\nGeneration complete: {success_count}/{total} shots successful"
        )

        return results

    def _generate_single_shot(self, shot: Shot, index: int) -> GeneratedShot:
        """
        FINAL COMPLETE VERSION.
        Camera injection is fully wired — all 3 levels attempted in order.
        Production never fails due to camera conditioning.
        """
        result = GeneratedShot(shot=shot)

        width = self.settings.default_video_width
        height = int(width / 2.39)
        num_frames = min(49, max(25, int(shot.duration_seconds * 8)))

        # Initialize camera injection engine
        camera_engine = CameraInjectionEngine(
            comfyui_api=self.comfyui
        )

        # ---- Step 1: Generate Keyframe ----
        logger.info(f"  [1/4] Generating keyframe...")

        keyframe_workflow = WorkflowBuilder.build_keyframe(
            prompt=shot.visual_prompt,
            negative_prompt=shot.negative_prompt,
            width=width,
            height=height,
            steps=self.settings.keyframe_steps,
            cfg=self.settings.cfg_scale,
        )

        prompt_id = self.comfyui.queue_prompt(keyframe_workflow)
        self.comfyui.wait_for_completion(prompt_id, timeout=300)
        outputs = self.comfyui.get_outputs(prompt_id)

        image_outputs = [
            o for o in outputs
            if o["filename"].endswith((".png", ".jpg", ".jpeg"))
        ]

        if not image_outputs:
            result.error = "No keyframe generated"
            return result

        keyframe_path = self.comfyui.download_file(
            image_outputs[0]["filename"],
            image_outputs[0].get("subfolder", ""),
            str(self.keyframes_dir)
        )
        result.keyframe_path = str(keyframe_path)
        logger.info(f"  Keyframe saved: {keyframe_path}")

        # ---- Step 2: Apply Camera Injection (Levels 1 and 2) ----
        logger.info(
            f"  [2/4] Applying camera: {shot.camera_movement.value}..."
        )

        camera_result = camera_engine.apply_to_shot(
            shot=shot,
            original_prompt=shot.visual_prompt,
            raw_video_path="",   # Not yet generated
            output_video_path="",
            num_frames=num_frames,
            width=width,
            height=height
        )

        enhanced_prompt = camera_result["enhanced_prompt"]
        cameractrl_node = camera_result.get("cameractrl_node", {})
        camera_frames = camera_result.get("camera_frames", None)
        level = camera_result["level_applied"]

        logger.info(
            f"  Camera conditioning Level {level} ready: "
            f"{shot.camera_movement.value}"
        )

        # ---- Step 3: Generate Video ----
        logger.info(f"  [3/4] Generating video...")

        video_workflow = WorkflowBuilder.build_video_cogvideox(
            keyframe_filename=image_outputs[0]["filename"],
            prompt=enhanced_prompt,           # Level 1 prompt
            num_frames=num_frames,
            steps=self.settings.video_steps,
            cfg=self.settings.cfg_scale,
            camera_trajectory=camera_frames   # Level 2 trajectory
        )

        # Wire Level 2 CameraCtrl node if available
        if cameractrl_node:
            node_id = str(len(video_workflow) + 1)
            video_workflow[node_id] = cameractrl_node
            # Wire into sampler
            video_workflow["5"]["inputs"]["camera_conditioning"] = [
                node_id, 0
            ]
            logger.info("  CameraCtrl node wired into sampler")

        prompt_id = self.comfyui.queue_prompt(video_workflow)
        self.comfyui.wait_for_completion(prompt_id, timeout=900)
        outputs = self.comfyui.get_outputs(prompt_id)

        video_outputs = [
            o for o in outputs
            if o["filename"].endswith((".mp4", ".webm", ".gif"))
        ]

        if not video_outputs:
            result.error = "No video generated"
            return result

        raw_video_path = self.comfyui.download_file(
            video_outputs[0]["filename"],
            video_outputs[0].get("subfolder", ""),
            str(self.raw_video_dir)
        )
        result.raw_video_path = str(raw_video_path)

        # ---- Step 4: Frame Interpolation + Level 3 Warp ----
        logger.info(
            f"  [4/4] Interpolating to "
            f"{self.settings.default_fps}fps + camera warp..."
        )

        interpolated_path = str(
            self.interpolated_dir /
            f"shot_{index+1:04d}_24fps.mp4"
        )

        # Interpolate to 24fps first
        try:
            self._interpolate_video(
                str(raw_video_path),
                interpolated_path,
                self.settings.default_fps
            )
        except Exception as e:
            logger.warning(f"  Interpolation failed: {e}")
            interpolated_path = str(raw_video_path)

        # Apply Level 3 post-warp if Level 2 was not used
        if level < 2 and shot.camera_movement.value != "STATIC":
            warped_path = str(
                self.interpolated_dir /
                f"shot_{index+1:04d}_warped.mp4"
            )
            final_path = camera_engine.apply_post_generation_warp(
                input_video_path=interpolated_path,
                output_video_path=warped_path,
                move_name=shot.camera_movement.value,
                duration_seconds=shot.duration_seconds,
                width=width,
                height=height
            )
            result.interpolated_video_path = final_path
            logger.info(
                f"  Level 3 warp applied: {shot.camera_movement.value}"
            )
        else:
            result.interpolated_video_path = interpolated_path

        result.success = True
        logger.info(
            f"  ✅ Shot {index+1} complete — camera Level {level} applied"
        )

        return result

    def _interpolate_video(self, input_path: str, output_path: str,
                           target_fps: int = 24):
        """Frame interpolation using FFmpeg minterpolate."""
        import subprocess

        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-vf", (
                f"minterpolate=fps={target_fps}:"
                f"mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"
            ),
            "-c:v", "libx264",
            "-preset", "slow",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            output_path
        ]

        subprocess.run(cmd, check=True, capture_output=True, timeout=300)
