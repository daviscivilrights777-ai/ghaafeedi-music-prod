# ============================================================
# FILE: engines/camera_injection.py
# PURPOSE: Complete camera trajectory injection system
#
# This module implements all 3 levels of camera conditioning.
# The system automatically detects what is available and
# falls back gracefully without failing the production.
#
# Level 1: Prompt language injection (always available)
# Level 2: CameraCtrl node conditioning (when available)
# Level 3: FFmpeg post-warp (reliable fallback)
# ============================================================

import logging
import subprocess
import json
from typing import List, Optional
from pathlib import Path
from dataclasses import dataclass

from knowledge.camera_moves import (
    CameraTrajectory,
    get_camera_move,
    interpolate_trajectory
)

logger = logging.getLogger("ghaafeedi.camera")


# ============================================================
# CAMERA MOVE TO LANGUAGE MAPPING
# Used by Level 1 (prompt injection)
# ============================================================

TRAJECTORY_TO_LANGUAGE = {
    "STATIC": {
        "movement_description": (
            "completely static locked-off camera, "
            "no movement whatsoever, tripod mounted, "
            "perfectly still frame"
        ),
        "technical": "static shot, locked tripod",
    },

    "SLOW_PUSH_IN": {
        "movement_description": (
            "very slow subtle dolly push in toward the subject, "
            "camera gradually moves forward through the scene, "
            "gentle increasing intimacy, slow zoom in feeling"
        ),
        "technical": "slow dolly in, subtle camera push",
    },

    "MEDIUM_PUSH_IN": {
        "movement_description": (
            "deliberate dolly push in toward subject, "
            "camera clearly moves forward, "
            "noticeable approach toward the scene"
        ),
        "technical": "dolly in, camera approach",
    },

    "SLOW_PULL_OUT": {
        "movement_description": (
            "very slow subtle dolly pull back away from subject, "
            "camera gradually retreats, "
            "gentle reveal of surrounding space, "
            "slow zoom out feeling"
        ),
        "technical": "slow dolly out, camera retreat",
    },

    "CRANE_DOWN": {
        "movement_description": (
            "camera slowly descends from elevated high angle "
            "down to eye level, crane down movement, "
            "begins looking down then levels to straight ahead"
        ),
        "technical": "crane down, descending camera",
    },

    "CRANE_UP": {
        "movement_description": (
            "camera slowly rises from eye level upward "
            "to elevated high angle, crane up movement, "
            "ascending camera revealing more of the scene below, "
            "transcendent upward movement"
        ),
        "technical": "crane up, ascending camera, rising shot",
    },

    "SLOW_PAN_RIGHT": {
        "movement_description": (
            "smooth slow horizontal pan from left to right, "
            "camera pivots on fixed axis revealing "
            "the scene from left to right"
        ),
        "technical": "slow pan right, horizontal pivot",
    },

    "SLOW_PAN_LEFT": {
        "movement_description": (
            "smooth slow horizontal pan from right to left, "
            "camera pivots on fixed axis revealing "
            "the scene from right to left"
        ),
        "technical": "slow pan left, horizontal pivot",
    },

    "ORBIT_RIGHT": {
        "movement_description": (
            "camera orbits clockwise around the subject, "
            "arc shot circling around the focal point, "
            "360 degree examination movement, "
            "subject stays centered while background rotates"
        ),
        "technical": "arc shot, orbital movement, circling camera",
    },

    "ORBIT_LEFT": {
        "movement_description": (
            "camera orbits counter-clockwise around the subject, "
            "arc shot circling the other direction, "
            "subject stays centered while background sweeps"
        ),
        "technical": "arc shot, counter-clockwise orbit",
    },

    "STEADICAM_FOLLOW": {
        "movement_description": (
            "smooth steadicam follow shot moving through space, "
            "camera glides forward following natural path, "
            "subtle organic micro-movements, "
            "immersive walking-with-subject feel"
        ),
        "technical": "steadicam, smooth follow, tracking shot",
    },

    "DOLLY_ZOOM_IN": {
        "movement_description": (
            "vertigo dolly zoom effect, "
            "camera pushes in while field of view widens, "
            "subject stays same size while background stretches, "
            "psychological disorientation effect, Hitchcock zoom"
        ),
        "technical": "dolly zoom, vertigo effect, trombone shot",
    },

    "TILT_UP_REVEAL": {
        "movement_description": (
            "camera tilts upward from low angle, "
            "begins pointed down then tilts up to reveal "
            "subject or sky, vertical revelation movement"
        ),
        "technical": "tilt up, vertical reveal",
    },

    "TRUCK_RIGHT": {
        "movement_description": (
            "camera trucks laterally to the right, "
            "sliding movement parallel to the subject, "
            "camera moves sideways while maintaining angle"
        ),
        "technical": "truck right, lateral slide, crab right",
    },

    "DRAMATIC_PUSH_IN": {
        "movement_description": (
            "aggressive purposeful dramatic dolly push in, "
            "camera moves forcefully toward subject, "
            "intense urgent approach, "
            "ends in tight close-up"
        ),
        "technical": "dramatic push in, intense dolly, aggressive approach",
    },

    "HANDHELD_SUBTLE": {
        "movement_description": (
            "subtle organic handheld camera movement, "
            "slight natural drift and breathing, "
            "documentary realism feel, "
            "human operator presence"
        ),
        "technical": "handheld, organic movement, documentary style",
    },

    "BIRDS_EYE_DESCENT": {
        "movement_description": (
            "begins as birds eye view looking straight down, "
            "camera descends and levels from aerial to eye level, "
            "god-like perspective becoming human"
        ),
        "technical": "birds eye, aerial descent, overhead to eye level",
    },

    "FLOAT_DRIFT": {
        "movement_description": (
            "ethereal dreamlike floating drift, "
            "weightless slow gentle movement, "
            "otherworldly floating sensation, "
            "memory or dream sequence camera"
        ),
        "technical": "ethereal float, dreamlike drift, memory shot",
    },

    "RISE_AND_REVEAL": {
        "movement_description": (
            "camera rises while simultaneously pulling back, "
            "epic reveal of grand scope and scale, "
            "ascending and widening simultaneously, "
            "triumphant revelation movement"
        ),
        "technical": "rise and reveal, ascending pullback, epic reveal",
    },
}


# ============================================================
# TRAJECTORY TO FFMPEG FILTER MAPPING
# Used by Level 3 (post-generation warp)
# ============================================================

@dataclass
class FFmpegCameraFilter:
    """FFmpeg filter to simulate camera movement in post."""
    filter_string: str
    description: str


def trajectory_to_ffmpeg_filter(
    move_name: str,
    duration_seconds: float,
    width: int = 1280,
    height: int = 536
) -> FFmpegCameraFilter:
    """
    Convert a named camera move to an FFmpeg filter
    that approximates the visual effect in post-processing.
    """
    fps = 24
    total_frames = max(1, int(duration_seconds * fps))

    filters = {

        "STATIC": FFmpegCameraFilter(
            filter_string=f"scale={width}:{height}",
            description="No movement"
        ),

        "SLOW_PUSH_IN": FFmpegCameraFilter(
            filter_string=(
                f"zoompan="
                f"z='if(lte(on,1),1.0,min(zoom+0.0015,1.12))':"
                f"d={total_frames}:"
                f"x='iw/2-(iw/zoom/2)':"
                f"y='ih/2-(ih/zoom/2)':"
                f"s={width}x{height}"
            ),
            description="Slow zoom in simulating push in"
        ),

        "MEDIUM_PUSH_IN": FFmpegCameraFilter(
            filter_string=(
                f"zoompan="
                f"z='if(lte(on,1),1.0,min(zoom+0.003,1.20))':"
                f"d={total_frames}:"
                f"x='iw/2-(iw/zoom/2)':"
                f"y='ih/2-(ih/zoom/2)':"
                f"s={width}x{height}"
            ),
            description="Medium zoom in simulating push"
        ),

        "SLOW_PULL_OUT": FFmpegCameraFilter(
            filter_string=(
                f"zoompan="
                f"z='if(lte(on,1),1.12,max(zoom-0.0015,1.0))':"
                f"d={total_frames}:"
                f"x='iw/2-(iw/zoom/2)':"
                f"y='ih/2-(ih/zoom/2)':"
                f"s={width}x{height}"
            ),
            description="Slow zoom out simulating pull back"
        ),

        "CRANE_UP": FFmpegCameraFilter(
            filter_string=(
                f"zoompan="
                f"z='if(lte(on,1),1.08,max(zoom-0.001,1.0))':"
                f"d={total_frames}:"
                f"x='iw/2-(iw/zoom/2)':"
                f"y='if(lte(on,1),ih*0.3,max(y-{height*0.006/total_frames:.6f},0))':"
                f"s={width}x{height}"
            ),
            description="Pan up and zoom out simulating crane up"
        ),

        "CRANE_DOWN": FFmpegCameraFilter(
            filter_string=(
                f"zoompan="
                f"z='if(lte(on,1),1.0,min(zoom+0.001,1.08))':"
                f"d={total_frames}:"
                f"x='iw/2-(iw/zoom/2)':"
                f"y='if(lte(on,1),0,min(y+{height*0.006/total_frames:.6f},ih*0.3))':"
                f"s={width}x{height}"
            ),
            description="Pan down and zoom in simulating crane down"
        ),

        "SLOW_PAN_RIGHT": FFmpegCameraFilter(
            filter_string=(
                f"crop="
                f"w={int(width*0.85)}:h={height}:"
                f"x='(iw-ow)*on/{total_frames}':"
                f"y=0,"
                f"scale={width}:{height}"
            ),
            description="Lateral crop shift simulating pan right"
        ),

        "SLOW_PAN_LEFT": FFmpegCameraFilter(
            filter_string=(
                f"crop="
                f"w={int(width*0.85)}:h={height}:"
                f"x='(iw-ow)*(1-on/{total_frames})':"
                f"y=0,"
                f"scale={width}:{height}"
            ),
            description="Lateral crop shift simulating pan left"
        ),

        "TRUCK_RIGHT": FFmpegCameraFilter(
            filter_string=(
                f"crop="
                f"w={int(width*0.85)}:h={height}:"
                f"x='(iw-ow)*on/{total_frames}':"
                f"y=0,"
                f"scale={width}:{height}"
            ),
            description="Lateral shift simulating truck right"
        ),

        "DRAMATIC_PUSH_IN": FFmpegCameraFilter(
            filter_string=(
                f"zoompan="
                f"z='if(lte(on,1),1.0,min(zoom+0.005,1.35))':"
                f"d={total_frames}:"
                f"x='iw/2-(iw/zoom/2)':"
                f"y='ih/2-(ih/zoom/2)':"
                f"s={width}x{height}"
            ),
            description="Aggressive zoom in simulating dramatic push"
        ),

        "TILT_UP_REVEAL": FFmpegCameraFilter(
            filter_string=(
                f"crop="
                f"w={width}:h={int(height*0.85)}:"
                f"x=0:"
                f"y='(ih-oh)*(1-on/{total_frames})',"
                f"scale={width}:{height}"
            ),
            description="Vertical crop shift simulating tilt up"
        ),

        "HANDHELD_SUBTLE": FFmpegCameraFilter(
            filter_string=(
                f"crop="
                f"w={int(width*0.97)}:h={int(height*0.97)}:"
                f"x='(iw-ow)/2+3*sin(on/3)':"
                f"y='(ih-oh)/2+2*sin(on/2.3)',"
                f"scale={width}:{height}"
            ),
            description="Sinusoidal micro-motion simulating handheld"
        ),

        "ORBIT_RIGHT": FFmpegCameraFilter(
            filter_string=(
                f"zoompan="
                f"z='1.05+0.05*sin(2*PI*on/{total_frames})':"
                f"d={total_frames}:"
                f"x='iw/2-(iw/zoom/2)+{int(width*0.05)}*sin(PI*on/{total_frames})':"
                f"y='ih/2-(ih/zoom/2)':"
                f"s={width}x{height}"
            ),
            description="Combined zoom and shift simulating orbit"
        ),

        "ORBIT_LEFT": FFmpegCameraFilter(
            filter_string=(
                f"zoompan="
                f"z='1.05+0.05*sin(2*PI*on/{total_frames})':"
                f"d={total_frames}:"
                f"x='iw/2-(iw/zoom/2)-{int(width*0.05)}*sin(PI*on/{total_frames})':"
                f"y='ih/2-(ih/zoom/2)':"
                f"s={width}x{height}"
            ),
            description="Combined zoom and shift simulating orbit left"
        ),

        "DOLLY_ZOOM_IN": FFmpegCameraFilter(
            filter_string=(
                f"zoompan="
                f"z='if(lte(on,1),1.0,min(zoom+0.004,1.25))':"
                f"d={total_frames}:"
                f"x='iw/2-(iw/zoom/2)':"
                f"y='ih/2-(ih/zoom/2)':"
                f"s={width}x{height}"
            ),
            description="Zoom in approximating dolly zoom"
        ),

        "FLOAT_DRIFT": FFmpegCameraFilter(
            filter_string=(
                f"crop="
                f"w={int(width*0.95)}:h={int(height*0.95)}:"
                f"x='(iw-ow)/2+{int(width*0.02)}*sin(on/8)':"
                f"y='(ih-oh)/2+{int(height*0.015)}*sin(on/6)',"
                f"scale={width}:{height}"
            ),
            description="Gentle sinusoidal drift simulating float"
        ),

        "BIRDS_EYE_DESCENT": FFmpegCameraFilter(
            filter_string=(
                f"zoompan="
                f"z='if(lte(on,1),1.3,max(zoom-0.004,1.0))':"
                f"d={total_frames}:"
                f"x='iw/2-(iw/zoom/2)':"
                f"y='if(lte(on,1),0,min(y+{int(height*0.008)},ih/2))':"
                f"s={width}x{height}"
            ),
            description="Zoom out and pan down simulating descent"
        ),

        "RISE_AND_REVEAL": FFmpegCameraFilter(
            filter_string=(
                f"zoompan="
                f"z='if(lte(on,1),1.25,max(zoom-0.004,1.0))':"
                f"d={total_frames}:"
                f"x='iw/2-(iw/zoom/2)':"
                f"y='if(lte(on,1),ih*0.3,max(y-{int(height*0.006)},0))':"
                f"s={width}x{height}"
            ),
            description="Zoom out and pan up simulating rise and reveal"
        ),

        "STEADICAM_FOLLOW": FFmpegCameraFilter(
            filter_string=(
                f"crop="
                f"w={int(width*0.97)}:h={int(height*0.97)}:"
                f"x='(iw-ow)/2+{int(width*0.015)}*sin(on/5)+on*{1.5/total_frames:.6f}':"
                f"y='(ih-oh)/2+{int(height*0.01)}*sin(on/4.5)',"
                f"scale={width}:{height}"
            ),
            description="Drift and slight advance simulating steadicam"
        ),
    }

    return filters.get(move_name, filters["STATIC"])


# ============================================================
# MAIN CAMERA INJECTION CLASS
# ============================================================

class CameraInjectionEngine:
    """
    Complete camera trajectory injection system.

    Automatically detects available capabilities and
    applies the highest quality implementation possible.

    Implements all 3 levels:
    Level 1: Prompt language injection (always available)
    Level 2: CameraCtrl node conditioning (when available)
    Level 3: Post-generation FFmpeg warp (reliable fallback)
    """

    def __init__(self, comfyui_api=None):
        self.comfyui = comfyui_api
        self._cameractrl_available = None

    def check_cameractrl_available(self) -> bool:
        """Check if CameraCtrl ComfyUI node is installed."""
        if self._cameractrl_available is not None:
            return self._cameractrl_available

        if self.comfyui is None:
            self._cameractrl_available = False
            return False

        try:
            import urllib.request
            url = (
                f"http://{self.comfyui.server_address}"
                f"/object_info/CameraCtrl_Conditioning"
            )
            response = urllib.request.urlopen(url, timeout=5)
            data = json.loads(response.read())
            self._cameractrl_available = bool(data)
            logger.info(
                f"CameraCtrl node available: {self._cameractrl_available}"
            )
        except Exception:
            self._cameractrl_available = False
            logger.info("CameraCtrl node not available — using fallbacks")

        return self._cameractrl_available

    def enhance_prompt_with_camera(
        self,
        original_prompt: str,
        move_name: str
    ) -> str:
        """LEVEL 1: Inject camera movement language into prompt."""
        move_language = TRAJECTORY_TO_LANGUAGE.get(
            move_name,
            TRAJECTORY_TO_LANGUAGE["STATIC"]
        )

        enhanced = (
            f"{original_prompt}, "
            f"{move_language['movement_description']}, "
            f"{move_language['technical']}"
        )

        logger.info(f"Level 1 camera injection: {move_name} → prompt enhanced")
        return enhanced

    def build_cameractrl_workflow_node(
        self,
        camera_frames: List[List[float]],
        num_frames: int,
        width: int = 1280,
        height: int = 536
    ) -> dict:
        """LEVEL 2: Build CameraCtrl conditioning node for ComfyUI."""
        if not self.check_cameractrl_available():
            logger.info("CameraCtrl not available — Level 2 skipped")
            return {}

        if not camera_frames or len(camera_frames[0]) != 7:
            logger.warning("Invalid camera_frames format — Level 2 skipped")
            return {}

        node = {
            "class_type": "CameraCtrl_Conditioning",
            "inputs": {
                "camera_poses": camera_frames,
                "num_frames": num_frames,
                "image_width": width,
                "image_height": height,
                "focal_length": 1.0,
                "conditioning_strength": 0.85,
                "pose_format": "absolute",
            }
        }

        logger.info(f"Level 2 CameraCtrl node built: {len(camera_frames)} frames")
        return node

    def apply_post_generation_warp(
        self,
        input_video_path: str,
        output_video_path: str,
        move_name: str,
        duration_seconds: float,
        width: int = 1280,
        height: int = 536
    ) -> str:
        """LEVEL 3: Apply camera movement as post-generation FFmpeg effect."""
        camera_filter = trajectory_to_ffmpeg_filter(
            move_name=move_name,
            duration_seconds=duration_seconds,
            width=width,
            height=height
        )

        if move_name == "STATIC":
            logger.info("Level 3: STATIC — no warp needed")
            return input_video_path

        logger.info(f"Level 3 post-warp: {move_name} → {camera_filter.description}")

        cmd = [
            "ffmpeg", "-y",
            "-i", input_video_path,
            "-vf", camera_filter.filter_string,
            "-c:v", "libx264",
            "-preset", "slow",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-an",
            output_video_path
        ]

        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=120)
            logger.info(f"Level 3 warp applied: {output_video_path}")
            return output_video_path
        except subprocess.CalledProcessError as e:
            logger.error(
                f"Level 3 warp failed for {move_name}: "
                f"{e.stderr.decode()[:200]}"
            )
            logger.info("Falling back to input video without warp")
            return input_video_path

    def apply_to_shot(
        self,
        shot,
        original_prompt: str,
        raw_video_path: str,
        output_video_path: str,
        num_frames: int = 49,
        width: int = 1280,
        height: int = 536
    ) -> dict:
        """
        MASTER METHOD — called by the generation engine.

        Returns:
        {
            "enhanced_prompt": str,
            "cameractrl_node": dict,
            "warped_video_path": str,
            "level_applied": int,
            "move_name": str,
        }
        """
        move_name = shot.camera_movement.value
        duration = shot.duration_seconds

        result = {
            "enhanced_prompt": original_prompt,
            "cameractrl_node": {},
            "warped_video_path": raw_video_path,
            "level_applied": 0,
            "move_name": move_name,
        }

        # ---- LEVEL 1: Always apply prompt enhancement ----
        enhanced_prompt = self.enhance_prompt_with_camera(
            original_prompt, move_name
        )
        result["enhanced_prompt"] = enhanced_prompt
        result["level_applied"] = 1
        logger.info(f"Camera injection Level 1 applied: {move_name}")

        # ---- LEVEL 2: Try CameraCtrl if available ----
        trajectory = get_camera_move(move_name)
        camera_frames = interpolate_trajectory(
            trajectory,
            num_output_frames=num_frames
        )

        cameractrl_node = self.build_cameractrl_workflow_node(
            camera_frames=camera_frames,
            num_frames=num_frames,
            width=width,
            height=height
        )

        if cameractrl_node:
            result["cameractrl_node"] = cameractrl_node
            result["camera_frames"] = camera_frames
            result["level_applied"] = 2
            logger.info(f"Camera injection Level 2 applied: {move_name}")

        # ---- LEVEL 3: Post-generation warp ----
        if result["level_applied"] < 2 and move_name != "STATIC":
            warped_path = self.apply_post_generation_warp(
                input_video_path=raw_video_path,
                output_video_path=output_video_path,
                move_name=move_name,
                duration_seconds=duration,
                width=width,
                height=height
            )
            result["warped_video_path"] = warped_path

            if warped_path == output_video_path:
                result["level_applied"] = 3
                logger.info(f"Camera injection Level 3 applied: {move_name}")

        return result
