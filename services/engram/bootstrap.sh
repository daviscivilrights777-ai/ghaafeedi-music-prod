#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Engram Bootstrap — Ghaafeedi Music
#
# Run this ONCE after deploying engram to Railway.
# Creates tenant + master API key + Sophia agent.
#
# Usage:
#   ENGRAM_URL=https://YOUR-ENGRAM.up.railway.app \
#   SETUP_TOKEN=your_setup_token \
#   bash bootstrap.sh
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

ENGRAM_URL="${ENGRAM_URL:?Set ENGRAM_URL=https://your-engram.up.railway.app}"
SETUP_TOKEN="${SETUP_TOKEN:?Set SETUP_TOKEN=your_engram_setup_token}"

echo ""
echo "══════════════════════════════════════════════════"
echo "  Engram Bootstrap — Ghaafeedi Music"
echo "══════════════════════════════════════════════════"
echo ""

# ── 1. Health check ───────────────────────────────────────────────────────────
echo "→ Checking health..."
HEALTH=$(curl -sf "${ENGRAM_URL}/health" || echo '{"error":"unreachable"}')
echo "  $HEALTH"
echo ""

# ── 2. Create tenant + master key ────────────────────────────────────────────
echo "→ Creating tenant..."
SETUP_RESP=$(curl -sf -X POST "${ENGRAM_URL}/v1/setup" \
  -H "X-Setup-Token: ${SETUP_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"org_name":"Ghaafeedi Music"}')

echo "  $SETUP_RESP"

API_KEY=$(echo "$SETUP_RESP" | grep -o '"api_key":"[^"]*"' | cut -d'"' -f4 || true)

if [ -z "$API_KEY" ]; then
  echo ""
  echo "⚠  Could not extract api_key from response."
  echo "   If tenant already exists, check the Engram console for your master key."
  echo "   Continuing anyway — if you have an existing key, set EXISTING_API_KEY and re-run."
  API_KEY="${EXISTING_API_KEY:-}"
fi

if [ -z "$API_KEY" ]; then
  echo "✗ No API key available. Aborting."
  exit 1
fi

echo ""
echo "✓ API Key: ${API_KEY}"
echo ""

# ── 3. Register Sophia agent ──────────────────────────────────────────────────
echo "→ Registering Sophia AI agent..."
AGENT_RESP=$(curl -sf -X POST "${ENGRAM_URL}/v1/agents" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"external_id":"sophia-global","name":"Sophia AI Companion"}')

echo "  $AGENT_RESP"

AGENT_ID=$(echo "$AGENT_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
echo ""
echo "✓ Agent ID: ${AGENT_ID}"

# ── 4. Register revision agent ────────────────────────────────────────────────
echo ""
echo "→ Registering Revision Intake agent..."
REV_RESP=$(curl -sf -X POST "${ENGRAM_URL}/v1/agents" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"external_id":"revision-global","name":"Revision Intake Agent"}')
echo "  $REV_RESP"

# ── 5. Verify audit chain ─────────────────────────────────────────────────────
echo ""
echo "→ Verifying audit chain..."
AUDIT=$(curl -sf "${ENGRAM_URL}/v1/audit/verify" \
  -H "Authorization: Bearer ${API_KEY}" || echo '{"error":"failed"}')
echo "  $AUDIT"

# ── 6. Print Render env vars ──────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════"
echo "  Add these to Render → ghaafeedi-music → Env:"
echo "══════════════════════════════════════════════════"
echo ""
echo "  ENGRAM_BASE_URL=${ENGRAM_URL}"
echo "  ENGRAM_API_KEY=${API_KEY}"
if [ -n "$AGENT_ID" ]; then
  echo "  ENGRAM_AGENT_ID=${AGENT_ID}"
fi
echo ""
echo "  Then hit: GET /api/memory/health (admin panel)"
echo "══════════════════════════════════════════════════"
echo ""
