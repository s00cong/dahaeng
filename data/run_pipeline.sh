#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PYTHON_EXE="${PYTHON_EXE:-python3}"

echo "============================================================"
echo "Linux data pipeline orchestrator"
echo "Repo root: ${REPO_ROOT}"
echo "============================================================"

"${PYTHON_EXE}" "${REPO_ROOT}/data/run_scheduled_pipeline.py" "$@"
