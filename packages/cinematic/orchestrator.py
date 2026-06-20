# ============================================================
# FILE: orchestrator.py
# PURPOSE: Master orchestrator - THIS IS WHAT RUNABLE CALLS
# ============================================================

import logging
import time
import tempfile
import os
from pathlib import Path
from typing import Optional, Callable

from config import (
    CustomerInput, ProductionResult, GhaafeediSettings
)
from agents.director import AIDirector
from engines.generation import ShotGenerationEngine, GeneratedShot
from engines.editing import EditingEngine

logger = logging.getLogger("ghaafeedi.orchestrator")


class GhaafeediCinematicProducer:
    """
    MASTER ORCHESTRATOR

    This is the main class that Runable calls.

    It takes the output from the existing Ghaafeedi pipeline
    (emotional analysis, lyrics, song, video script) and
    produces a complete cinematic music video.

    RUNABLE INTEGRATION:

        from orchestrator import GhaafeediCinematicProducer
        from config import CustomerInput, GhaafeediSettings

        settings = GhaafeediSettings()
        producer = GhaafeediCinematicProducer(settings)

        result = producer.produce(customer_input)

        # result.final_video_url = URL to completed music video
        # result.thumbnail_url = URL to thumbnail
        # result.shot_gallery_urls = URLs to individual keyframes
        # result.status = "completed" or "failed"
    """

    def __init__(self, settings: GhaafeediSettings):
        self.settings = settings
        self.director = AIDirector(settings)

    def produce(self, customer_input: CustomerInput,
                progress_callback: Optional[Callable] = None
                ) -> ProductionResult:
        """
        MAIN ENTRY POINT FOR RUNABLE

        Takes CustomerInput from existing pipeline,
        returns ProductionResult with the completed music video.
        """
        start_time = time.time()
        order_id = customer_input.order_id

        logger.info("=" * 60)
        logger.info("GHAAFEEDI CINEMATIC PRODUCER - STARTING")
        logger.info(f"Order: {order_id}")
        logger.info(f"Emotion: {customer_input.primary_emotion.value}")
        logger.info(f"Song Duration: {customer_input.song_duration_seconds}s")
        logger.info("=" * 60)

        result = ProductionResult(order_id=order_id)

        try:
            work_dir = tempfile.mkdtemp(prefix=f"ghaafeedi_{order_id}_")

            self._report_progress(progress_callback, "phase", "directing", 5)

            # ===== PHASE 1: AI DIRECTION =====
            logger.info("\n🎬 PHASE 1: AI Director creating shot plan...")

            shot_plan = self.director.create_shot_plan(customer_input)
            result.total_shots_planned = len(shot_plan.shots)

            plan_path = Path(work_dir) / "shot_plan.json"
            with open(plan_path, "w") as f:
                f.write(shot_plan.model_dump_json(indent=2))

            logger.info(f"Shot plan created: {len(shot_plan.shots)} shots")

            self._report_progress(progress_callback, "phase", "generating", 15)

            # ===== PHASE 2: SHOT GENERATION =====
            logger.info("\n🎥 PHASE 2: Generating shots on GPU...")

            gen_engine = ShotGenerationEngine(
                self.settings,
                output_dir=os.path.join(work_dir, "generation")
            )

            generated_shots = gen_engine.generate_all_shots(
                shot_plan,
                progress_callback=lambda p: self._report_progress(
                    progress_callback,
                    "generating_shot", p,
                    15 + (p.get("progress_percent", 0) * 0.6)
                )
            )

            successful_shots = [s for s in generated_shots if s.success]
            failed_shots = [s for s in generated_shots if not s.success]

            result.total_shots_generated = len(successful_shots)
            result.total_shots_failed = len(failed_shots)

            if not successful_shots:
                raise RuntimeError("No shots were successfully generated")

            result.shot_gallery_urls = [
                s.keyframe_path for s in successful_shots
                if s.keyframe_path
            ]

            logger.info(
                f"Generated {len(successful_shots)}/{len(generated_shots)} shots"
            )

            self._report_progress(progress_callback, "phase", "editing", 75)

            # ===== PHASE 3: EDITING & POST-PRODUCTION =====
            logger.info("\n✂️ PHASE 3: Editing and post-production...")

            edit_engine = EditingEngine(
                output_dir=os.path.join(work_dir, "editing"),
                fps=self.settings.default_fps
            )

            shot_files = []
            for gs in successful_shots:
                video_path = gs.interpolated_video_path or gs.raw_video_path
                if video_path and os.path.exists(video_path):
                    shot_files.append(video_path)

            # Download song file
            song_local_path = os.path.join(work_dir, "song.mp3")
            self._download_file(customer_input.song_file_url, song_local_path)

            assembled_path = os.path.join(work_dir, "assembled_video.mp4")
            edit_engine.assemble_music_video(
                shot_files=shot_files,
                shot_plan=shot_plan,
                song_file=song_local_path,
                output_path=assembled_path
            )

            self._report_progress(progress_callback, "phase", "mastering", 90)

            # ===== PHASE 4: FINAL MASTERING =====
            logger.info("\n📀 PHASE 4: Final mastering...")

            final_path = os.path.join(
                work_dir, f"ghaafeedi_{order_id}_FINAL.mp4"
            )
            edit_engine.create_final_master(assembled_path, final_path)

            thumbnail_path = os.path.join(work_dir, "thumbnail.jpg")
            best_thumbnail_time = customer_input.song_duration_seconds * 0.3
            edit_engine.extract_thumbnail(
                final_path, thumbnail_path,
                time_seconds=best_thumbnail_time
            )

            # ===== PHASE 5: UPLOAD TO STORAGE =====
            logger.info("\n☁️ PHASE 5: Uploading to storage...")

            final_video_url = self._upload_to_storage(
                final_path, f"videos/{order_id}/final.mp4"
            )
            thumbnail_url = self._upload_to_storage(
                thumbnail_path, f"videos/{order_id}/thumbnail.jpg"
            )

            gallery_urls = []
            for kf_path in result.shot_gallery_urls:
                if kf_path and os.path.exists(kf_path):
                    kf_name = os.path.basename(kf_path)
                    url = self._upload_to_storage(
                        kf_path, f"videos/{order_id}/gallery/{kf_name}"
                    )
                    gallery_urls.append(url)

            # ===== BUILD RESULT =====
            result.status = "completed"
            result.final_video_url = final_video_url
            result.thumbnail_url = thumbnail_url
            result.shot_gallery_urls = gallery_urls
            result.final_video_duration_seconds = self._get_duration(final_path)
            result.production_time_seconds = time.time() - start_time

            result.quality_report = {
                "shots_planned": result.total_shots_planned,
                "shots_generated": result.total_shots_generated,
                "shots_failed": result.total_shots_failed,
                "success_rate": (
                    result.total_shots_generated / max(1, result.total_shots_planned)
                ) * 100,
                "total_production_time_seconds": result.production_time_seconds,
                "video_resolution": f"{self.settings.default_video_width}x{int(self.settings.default_video_width / 2.39)}",
                "aspect_ratio": "2.39:1",
                "fps": self.settings.default_fps,
                "color_grade": "cinematic",
                "film_grain": True,
            }

            self._report_progress(progress_callback, "phase", "completed", 100)

            logger.info("=" * 60)
            logger.info("🎬 PRODUCTION COMPLETE!")
            logger.info(f"Final video: {final_video_url}")
            logger.info(f"Duration: {result.final_video_duration_seconds:.1f}s")
            logger.info(f"Time taken: {result.production_time_seconds:.1f}s")
            logger.info("=" * 60)

        except Exception as e:
            logger.exception(f"Production failed: {e}")
            result.status = "failed"
            result.error_message = str(e)
            result.production_time_seconds = time.time() - start_time

        return result

    def _download_file(self, url: str, local_path: str):
        """Download a file from URL to local path."""
        import urllib.request
        urllib.request.urlretrieve(url, local_path)

    def _upload_to_storage(self, local_path: str, remote_key: str) -> str:
        """Upload file to Cloudflare R2."""
        try:
            import boto3

            s3 = boto3.client(
                "s3",
                endpoint_url=self.settings.storage_endpoint,
                aws_access_key_id=self.settings.storage_access_key,
                aws_secret_access_key=self.settings.storage_secret_key,
            )

            s3.upload_file(
                local_path,
                self.settings.storage_bucket,
                remote_key,
                ExtraArgs={"ACL": "public-read"}
            )

            url = (
                f"https://pub-bc7b203485814e1186102277ad450211.r2.dev/"
                f"{remote_key}"
            )
            return url

        except Exception as e:
            logger.warning(f"Storage upload failed: {e}")
            return local_path

    def _get_duration(self, filepath: str) -> float:
        """Get media file duration."""
        import subprocess
        try:
            cmd = [
                "ffprobe", "-v", "quiet",
                "-print_format", "json",
                "-show_format", filepath
            ]
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=30
            )
            import json
            data = json.loads(result.stdout)
            return float(data["format"]["duration"])
        except:
            return 0.0

    def _report_progress(self, callback, key, value, percent):
        """Report progress if callback exists."""
        if callback:
            callback({
                key: value,
                "progress_percent": percent
            })
