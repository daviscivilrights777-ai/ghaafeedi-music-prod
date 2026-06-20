# ============================================================
# FILE: knowledge/camera_moves.py
# PURPOSE: Complete camera trajectory library — 19 named moves
# Each move is defined as keyframe positions [x,y,z,pan,tilt,roll,fov]
# interpolate_trajectory() produces per-frame arrays for CameraCtrl
# ============================================================

import math
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class CameraTrajectory:
    """
    A named camera move defined by keyframe positions.
    Each keyframe: [x, y, z, pan, tilt, roll, fov]
    - x, y, z: position in world space (meters)
    - pan: horizontal rotation (degrees, + = right)
    - tilt: vertical rotation (degrees, + = up)
    - roll: camera roll (degrees)
    - fov: field of view (degrees)
    """
    name: str
    description: str
    keyframes: List[List[float]]  # [[x,y,z,pan,tilt,roll,fov], ...]
    keyframe_times: List[float]   # normalized 0.0 to 1.0
    energy: str = "calm"          # calm / dynamic / dramatic


CAMERA_MOVES: dict[str, CameraTrajectory] = {

    "STATIC": CameraTrajectory(
        name="STATIC",
        description="Completely locked-off tripod shot, no movement",
        keyframes=[
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0],
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0],
        ],
        keyframe_times=[0.0, 1.0],
        energy="calm",
    ),

    "SLOW_PUSH_IN": CameraTrajectory(
        name="SLOW_PUSH_IN",
        description="Very slow dolly push toward subject, increasing intimacy",
        keyframes=[
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0],
            [0.0, 0.0, 0.3, 0.0, 0.0, 0.0, 48.0],
            [0.0, 0.0, 0.6, 0.0, 0.0, 0.0, 46.0],
        ],
        keyframe_times=[0.0, 0.5, 1.0],
        energy="calm",
    ),

    "MEDIUM_PUSH_IN": CameraTrajectory(
        name="MEDIUM_PUSH_IN",
        description="Deliberate dolly push in, noticeable approach",
        keyframes=[
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0],
            [0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 47.0],
            [0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 44.0],
        ],
        keyframe_times=[0.0, 0.5, 1.0],
        energy="calm",
    ),

    "SLOW_PULL_OUT": CameraTrajectory(
        name="SLOW_PULL_OUT",
        description="Very slow dolly pull back, gentle reveal of space",
        keyframes=[
            [0.0, 0.0, 0.6, 0.0, 0.0, 0.0, 46.0],
            [0.0, 0.0, 0.3, 0.0, 0.0, 0.0, 48.0],
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0],
        ],
        keyframe_times=[0.0, 0.5, 1.0],
        energy="calm",
    ),

    "CRANE_DOWN": CameraTrajectory(
        name="CRANE_DOWN",
        description="Descend from elevated high angle to eye level",
        keyframes=[
            [0.0, 2.0, 0.0, 0.0, -30.0, 0.0, 50.0],
            [0.0, 1.0, 0.0, 0.0, -15.0, 0.0, 50.0],
            [0.0, 0.0, 0.0, 0.0,   0.0, 0.0, 50.0],
        ],
        keyframe_times=[0.0, 0.5, 1.0],
        energy="dynamic",
    ),

    "CRANE_UP": CameraTrajectory(
        name="CRANE_UP",
        description="Rise from eye level to elevated angle, transcendent",
        keyframes=[
            [0.0, 0.0, 0.0, 0.0,  0.0, 0.0, 50.0],
            [0.0, 1.0, 0.0, 0.0, 10.0, 0.0, 50.0],
            [0.0, 2.0, 0.0, 0.0, 20.0, 0.0, 50.0],
        ],
        keyframe_times=[0.0, 0.5, 1.0],
        energy="dynamic",
    ),

    "SLOW_PAN_RIGHT": CameraTrajectory(
        name="SLOW_PAN_RIGHT",
        description="Smooth horizontal pan left to right",
        keyframes=[
            [0.0, 0.0, 0.0, -20.0, 0.0, 0.0, 50.0],
            [0.0, 0.0, 0.0,   0.0, 0.0, 0.0, 50.0],
            [0.0, 0.0, 0.0,  20.0, 0.0, 0.0, 50.0],
        ],
        keyframe_times=[0.0, 0.5, 1.0],
        energy="calm",
    ),

    "SLOW_PAN_LEFT": CameraTrajectory(
        name="SLOW_PAN_LEFT",
        description="Smooth horizontal pan right to left",
        keyframes=[
            [0.0, 0.0, 0.0,  20.0, 0.0, 0.0, 50.0],
            [0.0, 0.0, 0.0,   0.0, 0.0, 0.0, 50.0],
            [0.0, 0.0, 0.0, -20.0, 0.0, 0.0, 50.0],
        ],
        keyframe_times=[0.0, 0.5, 1.0],
        energy="calm",
    ),

    "ORBIT_RIGHT": CameraTrajectory(
        name="ORBIT_RIGHT",
        description="Clockwise arc shot circling the subject",
        keyframes=[
            [-1.0, 0.0, 1.0,  -30.0, 0.0, 0.0, 50.0],
            [ 0.0, 0.0, 1.4,    0.0, 0.0, 0.0, 50.0],
            [ 1.0, 0.0, 1.0,   30.0, 0.0, 0.0, 50.0],
        ],
        keyframe_times=[0.0, 0.5, 1.0],
        energy="dynamic",
    ),

    "ORBIT_LEFT": CameraTrajectory(
        name="ORBIT_LEFT",
        description="Counter-clockwise arc shot circling the subject",
        keyframes=[
            [ 1.0, 0.0, 1.0,   30.0, 0.0, 0.0, 50.0],
            [ 0.0, 0.0, 1.4,    0.0, 0.0, 0.0, 50.0],
            [-1.0, 0.0, 1.0,  -30.0, 0.0, 0.0, 50.0],
        ],
        keyframe_times=[0.0, 0.5, 1.0],
        energy="dynamic",
    ),

    "STEADICAM_FOLLOW": CameraTrajectory(
        name="STEADICAM_FOLLOW",
        description="Smooth follow shot gliding through space",
        keyframes=[
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0],
            [0.1, 0.0, 0.4, 2.0, 0.0, 0.0, 50.0],
            [0.0, 0.0, 0.8, 0.0, 0.0, 0.0, 50.0],
        ],
        keyframe_times=[0.0, 0.5, 1.0],
        energy="calm",
    ),

    "DOLLY_ZOOM_IN": CameraTrajectory(
        name="DOLLY_ZOOM_IN",
        description="Hitchcock vertigo dolly zoom — push in while widening FOV",
        keyframes=[
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0],
            [0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 60.0],
            [0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 70.0],
        ],
        keyframe_times=[0.0, 0.5, 1.0],
        energy="dramatic",
    ),

    "TILT_UP_REVEAL": CameraTrajectory(
        name="TILT_UP_REVEAL",
        description="Camera tilts upward to reveal subject or sky",
        keyframes=[
            [0.0, 0.0, 0.0, 0.0, -20.0, 0.0, 50.0],
            [0.0, 0.0, 0.0, 0.0, -10.0, 0.0, 50.0],
            [0.0, 0.0, 0.0, 0.0,   5.0, 0.0, 50.0],
        ],
        keyframe_times=[0.0, 0.5, 1.0],
        energy="dynamic",
    ),

    "TRUCK_RIGHT": CameraTrajectory(
        name="TRUCK_RIGHT",
        description="Lateral slide to the right, parallel to subject",
        keyframes=[
            [-0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0],
            [ 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0],
            [ 0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0],
        ],
        keyframe_times=[0.0, 0.5, 1.0],
        energy="calm",
    ),

    "DRAMATIC_PUSH_IN": CameraTrajectory(
        name="DRAMATIC_PUSH_IN",
        description="Aggressive, purposeful push in, ends in tight close-up",
        keyframes=[
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0],
            [0.0, 0.0, 0.8, 0.0, 0.0, 0.0, 46.0],
            [0.0, 0.0, 1.8, 0.0, 0.0, 0.0, 40.0],
        ],
        keyframe_times=[0.0, 0.4, 1.0],
        energy="dramatic",
    ),

    "HANDHELD_SUBTLE": CameraTrajectory(
        name="HANDHELD_SUBTLE",
        description="Organic handheld micro-movement, documentary realism",
        keyframes=[
            [ 0.00,  0.00, 0.0,  0.0,  0.0, 0.0, 50.0],
            [ 0.02,  0.01, 0.0,  0.5,  0.3, 0.2, 50.0],
            [-0.01,  0.02, 0.0, -0.3,  0.5, 0.0, 50.0],
            [ 0.01, -0.01, 0.0,  0.4, -0.2, 0.1, 50.0],
        ],
        keyframe_times=[0.0, 0.33, 0.66, 1.0],
        energy="calm",
    ),

    "BIRDS_EYE_DESCENT": CameraTrajectory(
        name="BIRDS_EYE_DESCENT",
        description="From aerial birds-eye looking down to eye level",
        keyframes=[
            [0.0, 4.0, 0.0, 0.0, -85.0, 0.0, 50.0],
            [0.0, 2.0, 0.5, 0.0, -45.0, 0.0, 50.0],
            [0.0, 0.0, 1.0, 0.0,   0.0, 0.0, 50.0],
        ],
        keyframe_times=[0.0, 0.5, 1.0],
        energy="dramatic",
    ),

    "FLOAT_DRIFT": CameraTrajectory(
        name="FLOAT_DRIFT",
        description="Ethereal weightless drift, memory/dream camera",
        keyframes=[
            [ 0.0, 0.0, 0.0,  0.0, 0.0, 0.0, 50.0],
            [ 0.1, 0.1, 0.2,  2.0, 1.0, 1.0, 50.0],
            [-0.1, 0.2, 0.1, -1.0, 2.0, 0.0, 50.0],
            [ 0.0, 0.1, 0.3,  0.0, 1.0, 0.5, 50.0],
        ],
        keyframe_times=[0.0, 0.33, 0.66, 1.0],
        energy="calm",
    ),

    "RISE_AND_REVEAL": CameraTrajectory(
        name="RISE_AND_REVEAL",
        description="Rise while pulling back — epic reveal of grand scope",
        keyframes=[
            [0.0,  0.0, 1.0, 0.0,  0.0, 0.0, 50.0],
            [0.0,  1.5, 0.4, 0.0, 10.0, 0.0, 55.0],
            [0.0,  3.0, 0.0, 0.0, 20.0, 0.0, 65.0],
        ],
        keyframe_times=[0.0, 0.5, 1.0],
        energy="dramatic",
    ),
}


def get_camera_move(name: str) -> CameraTrajectory:
    """
    Retrieve a camera move by name.
    Supports exact match and fuzzy name matching.
    """
    # Exact match
    normalized = name.upper().replace(" ", "_").replace("-", "_")
    if normalized in CAMERA_MOVES:
        return CAMERA_MOVES[normalized]

    # Fuzzy: try partial match
    for key in CAMERA_MOVES:
        if normalized in key or key in normalized:
            return CAMERA_MOVES[key]

    # Default to STATIC
    return CAMERA_MOVES["STATIC"]


def interpolate_trajectory(
    trajectory: CameraTrajectory,
    num_output_frames: int = 49
) -> List[List[float]]:
    """
    Interpolate a camera trajectory to produce per-frame data.

    Returns a list of num_output_frames frames.
    Each frame: [x, y, z, pan, tilt, roll, fov] (7 floats).
    """
    keyframes = trajectory.keyframes
    times = trajectory.keyframe_times

    if num_output_frames < 1:
        return []

    if len(keyframes) == 1:
        return [list(keyframes[0])] * num_output_frames

    result = []

    for i in range(num_output_frames):
        t = i / max(1, num_output_frames - 1)  # 0.0 → 1.0

        # Find surrounding keyframes
        seg_idx = 0
        for j in range(len(times) - 1):
            if times[j] <= t <= times[j + 1]:
                seg_idx = j
                break
            elif t > times[j + 1]:
                seg_idx = j + 1

        seg_idx = min(seg_idx, len(keyframes) - 2)

        t0 = times[seg_idx]
        t1 = times[seg_idx + 1]

        if t1 == t0:
            alpha = 0.0
        else:
            alpha = (t - t0) / (t1 - t0)
            alpha = max(0.0, min(1.0, alpha))

        # Smooth step interpolation
        alpha = alpha * alpha * (3 - 2 * alpha)

        kf0 = keyframes[seg_idx]
        kf1 = keyframes[seg_idx + 1]

        frame = [
            kf0[k] + alpha * (kf1[k] - kf0[k])
            for k in range(7)
        ]
        result.append(frame)

    return result
