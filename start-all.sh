#!/usr/bin/env bash
# Linux/macOS equivalent of start-all.bat
# Start backend (FastAPI) and frontend (React) in the background.

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn 2>/dev/null | awk '{print $4}' | grep -q ":$port\$"
  elif command -v lsof >/dev/null 2>&1; then
    lsof -i ":$port" -sTCP:LISTEN >/dev/null 2>&1
  else
    return 1
  fi
}

if port_in_use 8000; then
  echo "ERROR: port 8000 is already in use (backend). Stop the existing process first." >&2
  exit 1
fi

if port_in_use 3000; then
  echo "ERROR: port 3000 is already in use (frontend). Stop the existing process first." >&2
  exit 1
fi

cd "$ROOT/musclemapai-backend"

if [ -x ".venv/bin/python" ]; then
  PY=".venv/bin/python"
else
  PY="python3"
fi

echo "Starting backend (FastAPI) with $PY"
nohup "$PY" main.py > "$ROOT/backend.log" 2>&1 &
BACKEND_PID=$!

echo "Starting frontend (React)"
cd "$ROOT/musclemapai-frontend"
nohup npm start > "$ROOT/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo "All services launched."
echo "  Backend  : http://localhost:8000  (pid $BACKEND_PID)"
echo "  Frontend : http://localhost:3000  (pid $FRONTEND_PID)"
echo
echo "Logs: $ROOT/backend.log  and  $ROOT/frontend.log"
echo "Stop services quickly: kill $BACKEND_PID $FRONTEND_PID"