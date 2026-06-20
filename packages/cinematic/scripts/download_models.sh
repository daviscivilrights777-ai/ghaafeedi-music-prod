#!/bin/bash
# ============================================================
# FILE: scripts/download_models.sh
# PURPOSE: Download required AI models for video generation
# USAGE: bash scripts/download_models.sh
# Run AFTER install_comfyui.sh
# ============================================================

set -e

COMFYUI_DIR="${COMFYUI_DIR:-/workspace/ComfyUI}"

echo "=================================================="
echo "  GHAAFEEDI MUSIC — Model Downloader"
echo "=================================================="
echo "ComfyUI dir: $COMFYUI_DIR"

mkdir -p "$COMFYUI_DIR/models/checkpoints"
mkdir -p "$COMFYUI_DIR/models/cogvideox"
mkdir -p "$COMFYUI_DIR/models/upscale_models"

# ---- SDXL Base (keyframe generation) ----
echo ""
echo "[1/3] Downloading SDXL Base..."
SDXL_PATH="$COMFYUI_DIR/models/checkpoints/sd_xl_base_1.0.safetensors"
if [ ! -f "$SDXL_PATH" ]; then
    wget -q --show-progress \
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors" \
        -O "$SDXL_PATH"
    echo "✅ SDXL Base downloaded"
else
    echo "✅ SDXL Base already present"
fi

# ---- CogVideoX-5B I2V (video generation) ----
echo ""
echo "[2/3] Downloading CogVideoX-5B I2V..."
COG_DIR="$COMFYUI_DIR/models/cogvideox/cogvideox-5b-i2v"
if [ ! -d "$COG_DIR" ]; then
    if [ -n "$HF_TOKEN" ]; then
        python3 -c "
from huggingface_hub import snapshot_download
snapshot_download(
    repo_id='THUDM/CogVideoX-5b-I2V',
    local_dir='$COG_DIR',
    token='$HF_TOKEN',
    ignore_patterns=['*.git*', 'README*']
)
print('✅ CogVideoX-5B I2V downloaded')
"
    else
        echo "⚠️  HF_TOKEN not set. Trying without auth..."
        python3 -c "
from huggingface_hub import snapshot_download
snapshot_download(
    repo_id='THUDM/CogVideoX-5b-I2V',
    local_dir='$COG_DIR',
    ignore_patterns=['*.git*', 'README*']
)
print('✅ CogVideoX-5B I2V downloaded')
" 2>/dev/null || echo "❌ CogVideoX download failed — set HF_TOKEN"
    fi
else
    echo "✅ CogVideoX-5B I2V already present"
fi

# ---- Real-ESRGAN Upscaler ----
echo ""
echo "[3/3] Downloading Real-ESRGAN upscaler..."
ESRGAN_PATH="$COMFYUI_DIR/models/upscale_models/realesr-general-x4v3.pth"
if [ ! -f "$ESRGAN_PATH" ]; then
    wget -q --show-progress \
        "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth" \
        -O "$ESRGAN_PATH"
    echo "✅ Real-ESRGAN downloaded"
else
    echo "✅ Real-ESRGAN already present"
fi

echo ""
echo "=================================================="
echo "  All models downloaded."
echo "  Start ComfyUI: python main.py --listen 0.0.0.0"
echo "=================================================="
