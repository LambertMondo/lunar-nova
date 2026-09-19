#!/usr/bin/env bash
# Cloud Agent bootstrap for the WaCopilote monorepo (app lives in whatsapp-ai-saas/).
# Idempotent: safe to run repeatedly against cached or partially prepared state.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$REPO_ROOT/whatsapp-ai-saas"

# System libraries needed only to run Electron headlessly under xvfb for the
# optional e2e smoke (`npm run test:e2e`). The renderer, backend, unit tests,
# lint and build need none of these. Install once; apt no-ops when present.
if ! command -v xvfb-run >/dev/null 2>&1 || ! dpkg -s libatk-bridge2.0-0t64 >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y --no-install-recommends \
    xvfb libnss3 libatk-bridge2.0-0t64 libgtk-3-0t64 libgbm1 libasound2t64 \
    libxdamage1 libxrandr2 libxcomposite1 libxfixes3 libcups2 libdrm2
fi

# Renderer + Electron + tooling dependencies.
cd "$APP_DIR"
npm ci

# Backend (Express orchestrator) dependencies, incl. native sqlite3 binding.
cd "$APP_DIR/backend"
npm ci

echo "[install] WaCopilote dependencies ready."
