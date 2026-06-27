# ============================================================
# FILE: consistency/r2_storage.py
# PURPOSE: R2 upload/download helpers for character face images
#          and face embeddings used by the consistency pipeline.
# ============================================================

import io
import logging
import os
from pathlib import Path
from typing import Optional

import boto3
from botocore.client import Config

logger = logging.getLogger("ghaafeedi.consistency.r2")

_R2_ENDPOINT  = os.environ.get(
    "STORAGE_ENDPOINT",
    "https://56e7ace05da7338f6d61b014123e6a24.r2.cloudflarestorage.com",
)
_R2_BUCKET    = os.environ.get("STORAGE_BUCKET", "ghaafeedi-media")
_R2_ACCESS    = os.environ.get("STORAGE_ACCESS_KEY", "")
_R2_SECRET    = os.environ.get("STORAGE_SECRET_KEY", "")
_R2_PUBLIC    = os.environ.get(
    "R2_PUBLIC_URL",
    "https://pub-bc7b203485814e1186102277ad450211.r2.dev",
)


def _client():
    return boto3.client(
        "s3",
        endpoint_url=_R2_ENDPOINT,
        aws_access_key_id=_R2_ACCESS,
        aws_secret_access_key=_R2_SECRET,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload_face_image(local_path: str, r2_key: str) -> str:
    """
    Upload a face image JPEG to R2.
    Returns the public URL.
    """
    try:
        client = _client()
        with open(local_path, "rb") as f:
            client.put_object(
                Bucket=_R2_BUCKET,
                Key=r2_key,
                Body=f,
                ContentType="image/jpeg",
            )
        url = f"{_R2_PUBLIC}/{r2_key}"
        logger.info(f"[R2] Face image uploaded: {r2_key}")
        return url
    except Exception as e:
        logger.error(f"[R2] Face image upload failed: {e}")
        raise


def upload_embedding(local_path: str, r2_key: str) -> str:
    """
    Upload a numpy .npy face embedding to R2.
    Returns the R2 key (not a public URL — embeddings are private).
    """
    try:
        client = _client()
        with open(local_path, "rb") as f:
            client.put_object(
                Bucket=_R2_BUCKET,
                Key=r2_key,
                Body=f,
                ContentType="application/octet-stream",
            )
        logger.info(f"[R2] Embedding uploaded: {r2_key}")
        return r2_key
    except Exception as e:
        logger.error(f"[R2] Embedding upload failed: {e}")
        raise


def download_face_image(r2_key: str, local_path: str) -> str:
    """
    Download a face image from R2 to local disk.
    Returns local_path.
    """
    try:
        client = _client()
        Path(local_path).parent.mkdir(parents=True, exist_ok=True)
        client.download_file(_R2_BUCKET, r2_key, local_path)
        logger.info(f"[R2] Face image downloaded: {r2_key} → {local_path}")
        return local_path
    except Exception as e:
        logger.error(f"[R2] Face image download failed: {e}")
        raise


def download_embedding(r2_key: str, local_path: str) -> str:
    """
    Download a face embedding from R2 to local disk.
    Returns local_path.
    """
    try:
        client = _client()
        Path(local_path).parent.mkdir(parents=True, exist_ok=True)
        client.download_file(_R2_BUCKET, r2_key, local_path)
        logger.info(f"[R2] Embedding downloaded: {r2_key} → {local_path}")
        return local_path
    except Exception as e:
        logger.error(f"[R2] Embedding download failed: {e}")
        raise


def face_image_exists(r2_key: str) -> bool:
    """Check if a face image already exists in R2."""
    try:
        client = _client()
        client.head_object(Bucket=_R2_BUCKET, Key=r2_key)
        return True
    except Exception:
        return False
