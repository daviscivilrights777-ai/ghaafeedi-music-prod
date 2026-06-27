# ============================================================
# FILE: consistency/face_bank.py
# PURPOSE: Per-order character reference storage
#
# Storage backend: PostgreSQL (character_references table) +
#                  Cloudflare R2 (face images + embeddings)
# In-memory cache for within-session speed.
#
# Replaces the original /tmp/ + pickle approach which was
# wiped on every container restart.
# ============================================================

import json
import logging
import os
from dataclasses import asdict
from typing import Dict, List, Optional

from consistency.character_extractor import CharacterReference

logger = logging.getLogger("ghaafeedi.consistency.facebank")

# ─── PostgreSQL connection ────────────────────────────────────────────────────
_PG_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:nnrszttShuOrBtrNQPTzHeVmUrGXiCdS"
    "@thomas.proxy.rlwy.net:19541/railway",
)


def _pg():
    """Return a psycopg2 connection. Imported lazily to avoid startup crash."""
    import psycopg2
    return psycopg2.connect(_PG_URL)


class FaceBank:
    """
    Per-order character reference storage.

    Stores CharacterReference objects in PostgreSQL and makes them
    retrievable by character name or ID.

    All face images are stored in R2 (via character_extractor).
    This class handles metadata persistence only.
    """

    def __init__(self, order_id: str):
        self.order_id     = order_id
        self._cache: Dict[str, CharacterReference] = {}  # character_id → ref
        self._name_index: Dict[str, str] = {}            # lower(name) → character_id
        self._primary_id: Optional[str] = None
        self._ensure_table()
        self._load_from_db()

    # ──────────────────────────────────────────────────────────────────────────
    # PUBLIC API
    # ──────────────────────────────────────────────────────────────────────────

    def store(self, reference: CharacterReference) -> None:
        """Store a CharacterReference (insert or update)."""
        self._cache[reference.character_id]                    = reference
        self._name_index[reference.character_name.lower()]     = reference.character_id
        if self._primary_id is None:
            self._primary_id = reference.character_id
        self._upsert_db(reference)
        logger.info(f"[FaceBank] Stored character: {reference.character_name}")

    def get_by_name(self, name: str) -> Optional[CharacterReference]:
        """Retrieve a reference by character name (case-insensitive)."""
        cid = self._name_index.get(name.lower())
        if cid:
            return self._cache.get(cid)
        # Fuzzy fallback: partial match
        for key, cid in self._name_index.items():
            if name.lower() in key or key in name.lower():
                return self._cache.get(cid)
        return None

    def get_primary(self) -> Optional[CharacterReference]:
        """Return the first/primary character reference for this order."""
        if self._primary_id:
            return self._cache.get(self._primary_id)
        if self._cache:
            return next(iter(self._cache.values()))
        return None

    def get_all(self) -> List[CharacterReference]:
        return list(self._cache.values())

    def get_consistency_report(self) -> dict:
        return {
            "order_id": self.order_id,
            "character_count": len(self._cache),
            "characters": [
                {
                    "character_id": ref.character_id,
                    "character_name": ref.character_name,
                    "source": ref.source,
                    "quality_score": ref.quality_score,
                    "has_face_image": bool(ref.poyo_image_url),
                    "has_embedding": bool(ref.face_embedding_path),
                }
                for ref in self._cache.values()
            ],
        }

    # ──────────────────────────────────────────────────────────────────────────
    # PRIVATE: DB helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _ensure_table(self) -> None:
        """Create character_references table if it doesn't exist."""
        try:
            with _pg() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS character_references (
                            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            order_id            TEXT NOT NULL,
                            character_id        TEXT NOT NULL UNIQUE,
                            character_name      TEXT NOT NULL,
                            visual_description  TEXT NOT NULL,
                            prompt_prefix       TEXT NOT NULL,
                            negative_prefix     TEXT NOT NULL,
                            front_face_r2_key   TEXT NOT NULL DEFAULT '',
                            embedding_path      TEXT NOT NULL DEFAULT '',
                            poyo_image_url      TEXT NOT NULL DEFAULT '',
                            source              TEXT NOT NULL DEFAULT 'customer_photo',
                            quality_score       FLOAT DEFAULT 1.0,
                            created_at          TIMESTAMPTZ DEFAULT NOW()
                        );
                        CREATE INDEX IF NOT EXISTS idx_char_refs_order
                          ON character_references(order_id);
                    """)
                conn.commit()
        except Exception as e:
            logger.warning(f"[FaceBank] Table ensure failed (may already exist): {e}")

    def _load_from_db(self) -> None:
        """Load all character references for this order from PostgreSQL."""
        try:
            with _pg() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """SELECT character_id, character_name, visual_description,
                                  prompt_prefix, negative_prefix, front_face_r2_key,
                                  embedding_path, poyo_image_url, source, quality_score
                           FROM character_references
                           WHERE order_id = %s
                           ORDER BY created_at ASC""",
                        (self.order_id,),
                    )
                    rows = cur.fetchall()

            for row in rows:
                (cid, cname, vdesc, ppfx, npfx,
                 r2key, emb, purl, src, qs) = row
                ref = CharacterReference(
                    character_id=cid,
                    character_name=cname,
                    visual_description=vdesc,
                    prompt_prefix=ppfx,
                    negative_prefix=npfx,
                    front_face_path="",  # local path not persisted
                    r2_key=r2key,
                    poyo_image_url=purl,
                    face_embedding_path=emb,
                    source=src,
                    quality_score=float(qs),
                )
                self._cache[cid] = ref
                self._name_index[cname.lower()] = cid
                if self._primary_id is None:
                    self._primary_id = cid

            logger.info(f"[FaceBank] Loaded {len(rows)} character(s) from DB for {self.order_id}")
        except Exception as e:
            logger.warning(f"[FaceBank] DB load failed (continuing with empty cache): {e}")

    def _upsert_db(self, ref: CharacterReference) -> None:
        """Insert or update a character reference in PostgreSQL."""
        try:
            with _pg() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO character_references
                               (order_id, character_id, character_name, visual_description,
                                prompt_prefix, negative_prefix, front_face_r2_key,
                                embedding_path, poyo_image_url, source, quality_score)
                           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                           ON CONFLICT (character_id) DO UPDATE SET
                               visual_description = EXCLUDED.visual_description,
                               prompt_prefix      = EXCLUDED.prompt_prefix,
                               negative_prefix    = EXCLUDED.negative_prefix,
                               front_face_r2_key  = EXCLUDED.front_face_r2_key,
                               embedding_path     = EXCLUDED.embedding_path,
                               poyo_image_url     = EXCLUDED.poyo_image_url,
                               quality_score      = EXCLUDED.quality_score
                        """,
                        (
                            self.order_id,
                            ref.character_id,
                            ref.character_name,
                            ref.visual_description,
                            ref.prompt_prefix,
                            ref.negative_prefix,
                            ref.r2_key,
                            ref.face_embedding_path,
                            ref.poyo_image_url,
                            ref.source,
                            ref.quality_score,
                        ),
                    )
                conn.commit()
        except Exception as e:
            logger.error(f"[FaceBank] DB upsert failed for {ref.character_id}: {e}")
