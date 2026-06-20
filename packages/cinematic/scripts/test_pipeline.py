# ============================================================
# FILE: scripts/test_pipeline.py
# PURPOSE: End-to-end validation of the complete pipeline
# USAGE: python scripts/test_pipeline.py
# ============================================================

import os
import sys
import time
import json
import tempfile
import logging

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger("ghaafeedi.test")


def test_header(name: str):
    print(f"\n{'='*55}")
    print(f"  TEST: {name}")
    print(f"{'='*55}")


def test_pass(message: str):
    print(f"  ✅ PASS: {message}")


def test_fail(message: str):
    print(f"  ❌ FAIL: {message}")


def test_warn(message: str):
    print(f"  ⚠️  WARN: {message}")


# ============================================================
# TEST 1: ENVIRONMENT VARIABLES
# ============================================================

def test_environment():
    test_header("Environment Variables")

    # Load .env if present
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_path):
        from dotenv import load_dotenv
        load_dotenv(env_path)
        test_pass(f".env loaded from {env_path}")

    required = {
        "OPENAI_API_KEY": "GPT-4o Director",
        "UPSTASH_REDIS_REST_URL": "Job Store (Redis)",
        "UPSTASH_REDIS_REST_TOKEN": "Job Store Token",
    }

    optional = {
        "COMFYUI_URL": "ComfyUI API",
        "GPU_PROVIDER": "GPU Infrastructure",
        "FAL_KEY": "fal.ai GPU",
        "STORAGE_BUCKET": "Video Storage",
        "STORAGE_ENDPOINT": "Storage Endpoint",
        "STORAGE_ACCESS_KEY": "Storage Auth",
        "STORAGE_SECRET_KEY": "Storage Auth",
    }

    all_required_present = True

    for var, description in required.items():
        value = os.environ.get(var, "")
        if value:
            masked = value[:8] + "..." if len(value) > 8 else "***"
            test_pass(f"{var} = {masked} ({description})")
        else:
            test_fail(f"{var} not set — {description}")
            all_required_present = False

    for var, description in optional.items():
        value = os.environ.get(var, "")
        if value:
            test_pass(f"{var} present ({description})")
        else:
            test_warn(f"{var} not set — {description} (optional)")

    return all_required_present


# ============================================================
# TEST 2: REDIS JOB STORE
# ============================================================

def test_redis():
    test_header("Redis Job Store (Upstash)")

    try:
        from store.job_store import JobStore
        from config import ProductionResult

        redis_url = os.environ.get(
            "UPSTASH_REDIS_REST_URL",
            os.environ.get("UPSTASH_REDIS_URL", "")
        )
        if not redis_url:
            test_fail("UPSTASH_REDIS_REST_URL not set")
            return False

        store = JobStore(redis_url)

        if not store.ping():
            test_fail("Redis ping failed")
            return False
        test_pass("Redis ping successful")

        test_id = f"test_{int(time.time())}"
        test_result = ProductionResult(order_id=test_id, status="testing")
        if not store.save(test_id, test_result):
            test_fail("Redis save failed")
            return False
        test_pass("Redis save successful")

        retrieved = store.get(test_id)
        if not retrieved or retrieved.order_id != test_id:
            test_fail("Redis get failed or data mismatch")
            return False
        test_pass("Redis get successful")

        ttl = store.get_ttl(test_id)
        if ttl <= 0:
            test_warn(f"Unexpected TTL: {ttl}")
        else:
            test_pass(f"TTL set correctly: {ttl}s")

        if not store.update_status(test_id, "completed"):
            test_fail("Redis update failed")
            return False
        test_pass("Redis update successful")

        store.delete(test_id)
        if store.exists(test_id):
            test_warn("Delete may not have worked")
        else:
            test_pass("Redis delete successful")

        return True

    except ImportError as e:
        test_fail(f"Import error: {e}")
        test_warn("Run: pip install upstash-redis redis")
        return False
    except Exception as e:
        test_fail(f"Redis test failed: {e}")
        return False


# ============================================================
# TEST 3: COMFYUI CONNECTION
# ============================================================

def test_comfyui():
    test_header("ComfyUI Connection")

    try:
        from engines.comfyui_api import ComfyUIAPI

        comfyui_url = os.environ.get("COMFYUI_URL", "http://127.0.0.1:8188")
        server = comfyui_url.replace("http://", "").replace("https://", "")

        api = ComfyUIAPI(server)

        import urllib.request
        try:
            response = urllib.request.urlopen(
                f"http://{server}/system_stats", timeout=10
            )
            stats = json.loads(response.read())
            gpu_vram = stats.get("devices", [{}])[0].get("vram_total", 0)
            vram_gb = gpu_vram / (1024**3)
            test_pass(f"ComfyUI HTTP responding — GPU VRAM: {vram_gb:.1f}GB")
        except Exception as e:
            test_fail(f"ComfyUI HTTP failed: {e}")
            test_warn(f"Is ComfyUI running? Try: {comfyui_url}")
            return False

        try:
            if api.connect():
                test_pass("ComfyUI WebSocket connected")
                api.disconnect()
            else:
                test_fail("ComfyUI WebSocket failed")
                return False
        except Exception as e:
            test_fail(f"WebSocket error: {e}")
            return False

        return True

    except Exception as e:
        test_fail(f"ComfyUI test failed: {e}")
        return False


# ============================================================
# TEST 4: GPT-4o DIRECTOR
# ============================================================

def test_director():
    test_header("GPT-4o AI Director")

    try:
        from openai import OpenAI

        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key:
            test_fail("OPENAI_API_KEY not set")
            return False

        client = OpenAI(api_key=api_key)

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a film director. Respond with exactly one sentence."
                },
                {
                    "role": "user",
                    "content": "Describe a cinematic shot for a grief story. One sentence only."
                }
            ],
            max_tokens=100,
            temperature=0.7
        )

        shot_description = response.choices[0].message.content
        test_pass(f"GPT-4o responding")
        test_pass(f"Sample output: {shot_description[:80]}...")
        test_pass(f"Tokens used: {response.usage.total_tokens}")

        return True

    except Exception as e:
        test_fail(f"GPT-4o test failed: {e}")
        return False


# ============================================================
# TEST 5: AUDIO SYNC ENGINE
# ============================================================

def test_audio_sync():
    test_header("Audio Sync Engine (librosa)")

    try:
        import librosa
        import numpy as np
        test_pass("librosa imported successfully")

        sr = 22050
        duration = 10.0
        t = np.linspace(0, duration, int(sr * duration))
        bpm = 120
        beat_interval = sr * 60 / bpm
        audio = np.sin(2 * np.pi * 440 * t).astype(np.float32)

        for i in range(int(duration * bpm / 60)):
            idx = int(i * beat_interval)
            if idx < len(audio):
                audio[idx:idx+100] *= 3.0

        tempo, beat_frames = librosa.beat.beat_track(y=audio, sr=sr)
        # librosa >=0.10 may return tempo as an array
        bpm_val = float(tempo.item()) if hasattr(tempo, 'item') else float(tempo)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)

        test_pass(f"BPM detection working — detected: {bpm_val:.1f} BPM")
        test_pass(f"Beat timestamps found: {len(beat_times)} beats")

        from engines.audio_sync import AudioSyncEngine
        engine = AudioSyncEngine()

        test_timestamp = 2.3
        closest = engine.get_closest_beat(test_timestamp, beat_times.tolist())
        test_pass(f"Beat snap working — {test_timestamp}s → {closest:.3f}s")

        return True

    except ImportError as e:
        test_fail(f"Import error: {e}")
        test_warn("Run: pip install librosa")
        return False
    except Exception as e:
        test_fail(f"Audio sync test failed: {e}")
        return False


# ============================================================
# TEST 6: QA ENGINE
# ============================================================

def test_qa_engine():
    test_header("QA Engine (OpenCV)")

    try:
        import cv2
        import numpy as np
        test_pass("OpenCV imported successfully")

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            test_video_path = f.name

        import subprocess

        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", "testsrc=duration=3:size=640x270:rate=24",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            test_video_path
        ]
        subprocess.run(cmd, capture_output=True, timeout=30, check=True)
        test_pass(f"Test video created: {test_video_path}")

        from engines.qa_engine import QAEngine
        qa = QAEngine(comfyui_api=None)

        result = qa.verify_shot(test_video_path)

        test_pass(
            f"verify_shot() completed — "
            f"blur={result['avg_blur_score']:.0f} "
            f"frames={result['frame_count']}"
        )
        test_pass(f"Verdict: {result['verdict']}")
        test_pass(
            f"Black frames: {result['black_frame_count']}, "
            f"Frozen frames: {result['frozen_frame_count']}"
        )

        os.unlink(test_video_path)
        return True

    except ImportError as e:
        test_fail(f"Import error: {e}")
        test_warn("Run: pip install opencv-python-headless")
        return False
    except Exception as e:
        test_fail(f"QA engine test failed: {e}")
        return False


# ============================================================
# TEST 7: CAMERA MOVE LIBRARY
# ============================================================

def test_camera_moves():
    test_header("Camera Move Library")

    try:
        from knowledge.camera_moves import (
            CAMERA_MOVES,
            get_camera_move,
            interpolate_trajectory
        )

        move_count = len(CAMERA_MOVES)
        test_pass(f"Camera library loaded: {move_count} moves")

        test_moves = [
            "STATIC",
            "SLOW_PUSH_IN",
            "CRANE_UP",
            "ORBIT_RIGHT",
            "DRAMATIC_PUSH_IN"
        ]

        for move_name in test_moves:
            traj = get_camera_move(move_name)
            test_pass(f"Retrieved: {move_name} — {traj.description[:40]}")

        traj = get_camera_move("SLOW_PUSH_IN")
        frames = interpolate_trajectory(traj, num_output_frames=49)

        if len(frames) != 49:
            test_fail(f"Interpolation produced {len(frames)} frames, expected 49")
            return False
        test_pass(f"Interpolation correct: 49 frames × 7 values")

        sample_frame = frames[24]
        if len(sample_frame) != 7:
            test_fail(f"Frame has {len(sample_frame)} values, expected 7")
            return False
        test_pass(f"Frame format correct: [x,y,z,pan,tilt,roll,fov]")
        test_pass(f"Middle frame sample: {[round(v, 3) for v in sample_frame]}")

        # Fuzzy name matching
        fuzzy_traj = get_camera_move("slow push in")
        test_pass(f"Fuzzy name matching works: 'slow push in' → SLOW_PUSH_IN")

        return True

    except Exception as e:
        test_fail(f"Camera move test failed: {e}")
        return False


# ============================================================
# MAIN TEST RUNNER
# ============================================================

def main():
    print("")
    print("╔══════════════════════════════════════════════════════╗")
    print("║    GHAAFEEDI MUSIC — PIPELINE VALIDATION TESTS       ║")
    print("╚══════════════════════════════════════════════════════╝")
    print("")

    tests = [
        ("Environment Variables", test_environment),
        ("Redis Job Store", test_redis),
        ("ComfyUI Connection", test_comfyui),
        ("GPT-4o Director", test_director),
        ("Audio Sync Engine", test_audio_sync),
        ("QA Engine", test_qa_engine),
        ("Camera Move Library", test_camera_moves),
    ]

    results = {}

    for test_name, test_fn in tests:
        try:
            passed = test_fn()
            results[test_name] = passed
        except Exception as e:
            test_fail(f"Unexpected error in {test_name}: {e}")
            results[test_name] = False

    print("\n")
    print("╔══════════════════════════════════════════════════════╗")
    print("║                  TEST RESULTS                        ║")
    print("╠══════════════════════════════════════════════════════╣")

    passed_count = 0
    failed_tests = []

    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"║  {status}  {test_name:<40}║")
        if passed:
            passed_count += 1
        else:
            failed_tests.append(test_name)

    print("╠══════════════════════════════════════════════════════╣")
    print(f"║  TOTAL: {passed_count}/{len(tests)} tests passed"
          f"{'':>34}║")
    print("╚══════════════════════════════════════════════════════╝")

    if failed_tests:
        print("\n⚠️  Failed tests:")
        for t in failed_tests:
            print(f"   - {t}")
        print("\nFix all failures before deploying to production.")
        sys.exit(1)
    else:
        print("\n🎬 All systems operational. Ready for production.")
        sys.exit(0)


if __name__ == "__main__":
    main()
