#!/usr/bin/env bash
set -euo pipefail

YT_DLP_VERSION="${YT_DLP_VERSION:-2026.06.09}"
TARGET_DIR="${YT_DLP_TARGET_DIR:-bin}"
TARGET="${TARGET_DIR}/yt-dlp"
TMP_TARGET="${TARGET}.tmp"
DOWNLOAD_URL="https://github.com/yt-dlp/yt-dlp/releases/download/${YT_DLP_VERSION}/yt-dlp_linux"

mkdir -p "${TARGET_DIR}"
rm -f "${TMP_TARGET}"

curl --fail --show-error --silent --location --retry 3 --retry-delay 2 \
  --output "${TMP_TARGET}" \
  "${DOWNLOAD_URL}"

chmod +x "${TMP_TARGET}"

downloaded_version="$("${TMP_TARGET}" --version)"
if [[ "${downloaded_version}" != "${YT_DLP_VERSION}" ]]; then
  rm -f "${TMP_TARGET}"
  echo "yt-dlp version mismatch: expected ${YT_DLP_VERSION}, got ${downloaded_version}" >&2
  exit 1
fi

mv "${TMP_TARGET}" "${TARGET}"
echo "Installed yt-dlp ${YT_DLP_VERSION} at ${TARGET}"
