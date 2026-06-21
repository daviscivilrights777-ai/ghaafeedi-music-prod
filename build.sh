#!/bin/bash
set -e
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
# --frozen-lockfile ensures Render uses exact versions from bun.lock
# Without this, bun resolves fresh and may pick different @tanstack versions
bun install --frozen-lockfile
bun run --cwd packages/web build
