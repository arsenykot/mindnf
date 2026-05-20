#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -d .venv/bin ]]; then
  python3 -m venv .venv
fi

.venv/bin/python -m pip install -q -r requirements.txt
exec .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
