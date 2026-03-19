#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_EXE="${PYTHON_EXE:-python3}"

echo "============================================================"
echo "Linux data pipeline orchestrator"
echo "Flight root: ${SCRIPT_DIR}"
echo "============================================================"

"${PYTHON_EXE}" "${SCRIPT_DIR}/run_scheduled_pipeline.py" "$@"
