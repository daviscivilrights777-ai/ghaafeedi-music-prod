"""
consistency — Character face-lock system for Ghaafeedi Music.

Levels:
  1. Prompt text injection (ConsistencyInjector)
  2. Image reference param via Poyo image_url (ConsistencyInjector)
  3. Post-generation InsightFace / SSIM QA (consistency_qa)
"""

from .character_extractor import CharacterExtractor, CharacterReference
from .face_bank import FaceBank
from .consistency_injector import ConsistencyInjector
from .consistency_qa import check_shot, should_pause_job, QAResult
from .consistency_manager import ConsistencyManager, VerifyResult

__all__ = [
    "CharacterExtractor",
    "CharacterReference",
    "FaceBank",
    "ConsistencyInjector",
    "check_shot",
    "should_pause_job",
    "QAResult",
    "ConsistencyManager",
    "VerifyResult",
]
