# ============================================================
# FILE: music_engines/__init__.py
# PURPOSE: Ghaafeedi Music — Self-hosted music generation engines
# ============================================================

from .music_router import MusicRouter, MusicModel, RoutingDecision

__all__ = ["MusicRouter", "MusicModel", "RoutingDecision"]
