# ============================================================
# FILE: engines/comfyui_api.py
# PURPOSE: Control ComfyUI headlessly for video generation
# RUNABLE: This runs on the GPU instance (fal.ai/Modal/Vast.ai)
# ============================================================

import json
import uuid
import time
import logging
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Optional, Dict, List, Any

import websocket

logger = logging.getLogger("ghaafeedi.comfyui")


class ComfyUIAPI:
    """
    Controls ComfyUI via WebSocket/REST API.
    Designed to run on remote GPU instances.
    """

    def __init__(self, server_address: str = "127.0.0.1:8188"):
        self.server_address = server_address
        self.client_id = str(uuid.uuid4())
        self.ws: Optional[websocket.WebSocket] = None

    def connect(self) -> bool:
        """Establish websocket connection to ComfyUI."""
        try:
            self.ws = websocket.WebSocket()
            self.ws.connect(
                f"ws://{self.server_address}/ws?clientId={self.client_id}",
                timeout=30
            )
            logger.info(f"Connected to ComfyUI at {self.server_address}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to ComfyUI: {e}")
            return False

    def disconnect(self):
        """Close websocket connection."""
        if self.ws:
            try:
                self.ws.close()
            except:
                pass

    def queue_prompt(self, workflow: dict) -> str:
        """Queue a workflow for execution. Returns prompt_id."""
        payload = {"prompt": workflow, "client_id": self.client_id}
        data = json.dumps(payload).encode("utf-8")

        req = urllib.request.Request(
            f"http://{self.server_address}/prompt",
            data=data,
            headers={"Content-Type": "application/json"}
        )

        response = json.loads(urllib.request.urlopen(req).read())
        prompt_id = response["prompt_id"]
        logger.info(f"Queued prompt: {prompt_id}")
        return prompt_id

    def wait_for_completion(self, prompt_id: str,
                            timeout: int = 900,
                            progress_callback=None) -> dict:
        """
        Wait for a queued prompt to finish.
        Returns the execution history.
        """
        start_time = time.time()

        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout:
                raise TimeoutError(
                    f"Generation timed out after {timeout}s"
                )

            try:
                out = self.ws.recv()
            except websocket.WebSocketTimeoutException:
                continue
            except websocket.WebSocketConnectionClosedException:
                logger.warning("WebSocket closed, reconnecting...")
                self.connect()
                continue

            if isinstance(out, str):
                message = json.loads(out)
                msg_type = message.get("type", "")

                if msg_type == "executing":
                    data = message["data"]
                    if data["node"] is None and data["prompt_id"] == prompt_id:
                        logger.info("Generation complete!")
                        break

                elif msg_type == "progress":
                    data = message["data"]
                    progress = data["value"] / data["max"] * 100
                    logger.info(f"Progress: {progress:.1f}%")
                    if progress_callback:
                        progress_callback(progress)

                elif msg_type == "execution_error":
                    error_data = message.get("data", {})
                    raise RuntimeError(
                        f"ComfyUI execution error: {json.dumps(error_data, indent=2)}"
                    )

        history = self.get_history(prompt_id)
        return history.get(prompt_id, {})

    def get_history(self, prompt_id: str) -> dict:
        """Get execution history for a prompt."""
        url = f"http://{self.server_address}/history/{prompt_id}"
        response = urllib.request.urlopen(url)
        return json.loads(response.read())

    def get_outputs(self, prompt_id: str) -> List[Dict]:
        """Get output file info from a completed generation."""
        history = self.get_history(prompt_id)
        prompt_data = history.get(prompt_id, {})
        outputs = prompt_data.get("outputs", {})

        files = []
        for node_id, node_output in outputs.items():
            for key in ["images", "gifs", "videos"]:
                for item in node_output.get(key, []):
                    files.append({
                        "filename": item["filename"],
                        "subfolder": item.get("subfolder", ""),
                        "type": item.get("type", "output"),
                        "node_id": node_id,
                        "output_key": key,
                    })

        return files

    def download_file(self, filename: str, subfolder: str = "",
                      output_dir: str = "outputs") -> Path:
        """Download a file from ComfyUI's output."""
        params = urllib.parse.urlencode({
            "filename": filename,
            "subfolder": subfolder,
            "type": "output"
        })
        url = f"http://{self.server_address}/view?{params}"

        output_path = Path(output_dir) / filename
        output_path.parent.mkdir(parents=True, exist_ok=True)

        urllib.request.urlretrieve(url, str(output_path))
        logger.info(f"Downloaded: {output_path}")
        return output_path

    def upload_image(self, filepath: str) -> dict:
        """Upload a reference image to ComfyUI's input directory."""
        filename = Path(filepath).name

        with open(filepath, "rb") as f:
            file_data = f.read()

        boundary = f"----WebKitFormBoundary{uuid.uuid4().hex[:16]}"

        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="image"; '
            f'filename="{filename}"\r\n'
            f"Content-Type: application/octet-stream\r\n\r\n"
        ).encode() + file_data + (
            f"\r\n--{boundary}\r\n"
            f'Content-Disposition: form-data; name="subfolder"\r\n\r\n'
            f"\r\n--{boundary}--\r\n"
        ).encode()

        req = urllib.request.Request(
            f"http://{self.server_address}/upload/image",
            data=body,
            headers={
                "Content-Type": f"multipart/form-data; boundary={boundary}"
            }
        )
        response = json.loads(urllib.request.urlopen(req).read())
        return response


class WorkflowBuilder:
    """
    Builds ComfyUI workflows programmatically.
    Each method returns a complete workflow dict ready to queue.
    """

    @staticmethod
    def build_keyframe(prompt: str, negative_prompt: str,
                       width: int = 1280, height: int = 536,
                       seed: int = -1, steps: int = 30,
                       cfg: float = 7.0,
                       checkpoint: str = "sd_xl_base_1.0.safetensors") -> dict:
        """
        Build SDXL keyframe generation workflow.
        Produces a single high-quality still image for the shot.
        """
        import random
        if seed == -1:
            seed = random.randint(0, 2**32 - 1)

        enhanced_prompt = (
            f"masterpiece, best quality, cinematic, {prompt}, "
            f"shot on ARRI Alexa Mini LF, Panavision Primo 70 lens, "
            f"2.39:1 anamorphic widescreen, Kodak Vision3 500T, "
            f"professional color grading, volumetric lighting, "
            f"depth of field, film grain, 8K resolution"
        )

        enhanced_negative = (
            f"{negative_prompt}, worst quality, low quality, "
            f"jpeg artifacts, blurry, noisy, cartoon, anime, "
            f"illustration, painting, drawing, text, watermark, "
            f"logo, oversaturated, flat lighting, amateur, "
            f"CG render, video game, plastic, deformed"
        )

        return {
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": checkpoint}
            },
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": enhanced_prompt,
                    "clip": ["1", 1]
                }
            },
            "3": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": enhanced_negative,
                    "clip": ["1", 1]
                }
            },
            "4": {
                "class_type": "EmptyLatentImage",
                "inputs": {
                    "width": width,
                    "height": height,
                    "batch_size": 1
                }
            },
            "5": {
                "class_type": "KSampler",
                "inputs": {
                    "model": ["1", 0],
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "latent_image": ["4", 0],
                    "seed": seed,
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": "dpmpp_2m_sde",
                    "scheduler": "karras",
                    "denoise": 1.0
                }
            },
            "6": {
                "class_type": "VAEDecode",
                "inputs": {
                    "samples": ["5", 0],
                    "vae": ["1", 2]
                }
            },
            "7": {
                "class_type": "SaveImage",
                "inputs": {
                    "images": ["6", 0],
                    "filename_prefix": "ghaafeedi_keyframe"
                }
            }
        }

    @staticmethod
    def build_video_cogvideox(keyframe_filename: str,
                               prompt: str,
                               num_frames: int = 49,
                               steps: int = 50,
                               cfg: float = 6.0,
                               seed: int = -1,
                               camera_trajectory=None) -> dict:
        """
        Build CogVideoX-5B image-to-video workflow.
        Takes a keyframe image and generates video from it.
        camera_trajectory: optional list of [x,y,z,pan,tilt,roll,fov] frames
        """
        import random
        if seed == -1:
            seed = random.randint(0, 2**32 - 1)

        workflow = {
            "1": {
                "class_type": "CogVideoXModelLoader",
                "inputs": {
                    "model_name": "cogvideox-5b-i2v",
                    "precision": "bf16",
                    "quantization": "disabled",
                    "enable_sequential_cpu_offload": True
                }
            },
            "2": {
                "class_type": "CogVideoXTextEncode",
                "inputs": {
                    "pipeline": ["1", 0],
                    "prompt": prompt
                }
            },
            "3": {
                "class_type": "LoadImage",
                "inputs": {
                    "image": keyframe_filename
                }
            },
            "4": {
                "class_type": "CogVideoXImageEncode",
                "inputs": {
                    "pipeline": ["1", 0],
                    "image": ["3", 0]
                }
            },
            "5": {
                "class_type": "CogVideoXSampler",
                "inputs": {
                    "pipeline": ["1", 0],
                    "positive": ["2", 0],
                    "image_cond": ["4", 0],
                    "num_frames": num_frames,
                    "steps": steps,
                    "cfg": cfg,
                    "seed": seed,
                    "scheduler": "DPM++"
                }
            },
            "6": {
                "class_type": "CogVideoXDecode",
                "inputs": {
                    "pipeline": ["1", 0],
                    "samples": ["5", 0]
                }
            },
            "7": {
                "class_type": "VHS_VideoCombine",
                "inputs": {
                    "images": ["6", 0],
                    "frame_rate": 8,
                    "loop_count": 0,
                    "filename_prefix": "ghaafeedi_shot",
                    "format": "video/h264-mp4",
                    "pingpong": False,
                    "save_output": True
                }
            }
        }

        return workflow

    @staticmethod
    def build_upscale(input_filename: str,
                      model_name: str = "realesr-general-x4v3.pth") -> dict:
        """Build upscaling workflow for final quality enhancement."""
        return {
            "1": {
                "class_type": "LoadImage",
                "inputs": {"image": input_filename}
            },
            "2": {
                "class_type": "UpscaleModelLoader",
                "inputs": {"model_name": model_name}
            },
            "3": {
                "class_type": "ImageUpscaleWithModel",
                "inputs": {
                    "upscale_model": ["2", 0],
                    "image": ["1", 0]
                }
            },
            "4": {
                "class_type": "SaveImage",
                "inputs": {
                    "images": ["3", 0],
                    "filename_prefix": "ghaafeedi_upscaled"
                }
            }
        }
