#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
uv add --dev pyinstaller
uv run pyinstaller --onedir --name againpage-api  --collect-all againpage \
  --hidden-import uvicorn --hidden-import pgvector src/againpage/api/app.py
uv run pyinstaller --onedir --name againpage-worker --collect-all againpage \
  --hidden-import hdbscan --hidden-import umap src/againpage/worker/loop.py
echo "built: dist/againpage-api  dist/againpage-worker"
