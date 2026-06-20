#!/bin/bash
# ============================================================
# FILE: scripts/install_comfyui.sh
# PURPOSE: Install ComfyUI and required custom nodes on GPU instance
# USAGE: bash scripts/install_comfyui.sh
# ============================================================

set -e

echo "=================================================="
echo "  GHAAFEEDI MUSIC — ComfyUI Installer"
echo "=================================================="

# System deps
apt-get update -q
apt-get install -y -q git wget curl python3-pip ffmpeg libgl1 libglib2.0-0

# ComfyUI
cd /workspace || cd /tmp
if [ ! -d "ComfyUI" ]; then
    git clone https://github.com/comfyanonymous/ComfyUI.git
fi
cd ComfyUI
pip install -r requirements.txt -q

# Custom nodes
mkdir -p custom_nodes
cd custom_nodes

# ComfyUI-VideoHelperSuite (VHS_VideoCombine)
if [ ! -d "ComfyUI-VideoHelperSuite" ]; then
    git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git
    pip install -r ComfyUI-VideoHelperSuite/requirements.txt -q 2>/dev/null || true
fi

# ComfyUI-CogVideoX (CogVideoX nodes)
if [ ! -d "ComfyUI-CogVideoX" ]; then
    git clone https://github.com/kijai/ComfyUI-CogVideoX.git
    pip install -r ComfyUI-CogVideoX/requirements.txt -q 2>/dev/null || true
fi

# ComfyUI-CameraCtrl (optional — Level 2 camera conditioning)
if [ ! -d "ComfyUI-CameraCtrl" ]; then
    git clone https://github.com/AIForgedWorks/ComfyUI-CameraCtrl.git 2>/dev/null || \
    echo "CameraCtrl not available — Level 2 camera will be skipped"
fi

echo ""
echo "ComfyUI installed. Run: bash scripts/download_models.sh"
