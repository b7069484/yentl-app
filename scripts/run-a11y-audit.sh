#!/usr/bin/env bash
# scripts/run-a11y-audit.sh
# Starts the dev server, runs axe-core + Lighthouse on / and /session, then kills the server.
# Exits 0 only if both routes pass with zero axe violations and Lighthouse a11y ≥95.
# Usage: bash scripts/run-a11y-audit.sh

set -euo pipefail

PORT=3000
BASE_URL="http://localhost:${PORT}"

echo "==> Starting dev server..."
npm run dev -- --port "${PORT}" &
DEV_PID=$!

cleanup() {
  echo "==> Stopping dev server (PID ${DEV_PID})..."
  kill "${DEV_PID}" 2>/dev/null || true
  wait "${DEV_PID}" 2>/dev/null || true
}
trap cleanup EXIT

echo "==> Waiting for server to be ready..."
for i in {1..30}; do
  if curl -sf "${BASE_URL}" > /dev/null 2>&1; then
    echo "==> Server ready."
    break
  fi
  sleep 2
done

echo ""
echo "=== axe-core audit: / ==="
npx @axe-core/cli "${BASE_URL}"

echo ""
echo "=== axe-core audit: /session ==="
npx @axe-core/cli "${BASE_URL}/session"

echo ""
echo "=== Lighthouse a11y: / ==="
npx lighthouse "${BASE_URL}" \
  --only-categories=accessibility \
  --quiet \
  --chrome-flags="--headless --no-sandbox" \
  --output=json \
  --output-path=/tmp/lh-home.json
SCORE_HOME=$(node -e "console.log(require('/tmp/lh-home.json').categories.accessibility.score * 100)")
echo "Lighthouse / score: ${SCORE_HOME}"
node -e "if (${SCORE_HOME} < 95) { console.error('Lighthouse / score ${SCORE_HOME} < 95'); process.exit(1); }"

echo ""
echo "=== Lighthouse a11y: /session ==="
npx lighthouse "${BASE_URL}/session" \
  --only-categories=accessibility \
  --quiet \
  --chrome-flags="--headless --no-sandbox" \
  --output=json \
  --output-path=/tmp/lh-session.json
SCORE_SESSION=$(node -e "console.log(require('/tmp/lh-session.json').categories.accessibility.score * 100)")
echo "Lighthouse /session score: ${SCORE_SESSION}"
node -e "if (${SCORE_SESSION} < 95) { console.error('Lighthouse /session score ${SCORE_SESSION} < 95'); process.exit(1); }"

echo ""
echo "==> All a11y audits passed."
