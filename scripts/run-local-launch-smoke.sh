#!/usr/bin/env bash
# Starts the production server from the existing build, runs local launch smoke,
# then stops the server. Intended for CI after npm run build:automation.

set -euo pipefail

PORT="${YENTL_LOCAL_SMOKE_PORT:-3000}"
HOST="${YENTL_LOCAL_SMOKE_HOST:-127.0.0.1}"
BASE_URL="${YENTL_SMOKE_BASE_URL:-http://${HOST}:${PORT}}"

echo "==> Starting production server for launch smoke on ${BASE_URL}..."
npm run start -- --hostname "${HOST}" --port "${PORT}" &
SERVER_PID=$!

cleanup() {
  echo "==> Stopping launch-smoke server (PID ${SERVER_PID})..."
  kill "${SERVER_PID}" 2>/dev/null || true
  wait "${SERVER_PID}" 2>/dev/null || true
}
trap cleanup EXIT

echo "==> Waiting for server to be ready..."
for _ in {1..45}; do
  if curl -sf "${BASE_URL}/session" > /dev/null 2>&1; then
    echo "==> Server ready."
    YENTL_SMOKE_BASE_URL="${BASE_URL}" YENTL_SMOKE_SKIP_INTERNAL=1 npm run smoke:launch
    exit 0
  fi
  sleep 2
done

echo "Server did not become ready at ${BASE_URL}." >&2
exit 1
