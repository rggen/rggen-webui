#!/usr/bin/env bash
# Build the app and start the preview server.
#
#   bash bin/preview.sh [--port PORT] [--host] [--install]
#
#   --port PORT  port to listen on (default: 4173)
#   --host       expose the server to other hosts on the LAN
#   --install    reinstall node_modules before building

set -euo pipefail

cd "$(dirname "$0")/.."

port=4173
host_opt=()
force_install=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)    port="$2"; shift 2 ;;
    --host)    host_opt=(--host); shift ;;
    --install) force_install=1; shift ;;
    -h|--help) sed -n '2,8p' "$0" | sed 's/^# \?//'; exit 0 ;;
    *)         echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

# --legacy-peer-deps is required because typescript-eslint does not support TypeScript 7 yet
# https://github.com/typescript-eslint/typescript-eslint/issues/10940
if [[ $force_install -eq 1 || ! -d node_modules ]]; then
  echo "==> Installing dependencies"
  npm ci --legacy-peer-deps
fi

if [[ ! -f public/rggen.wasm ]]; then
  echo "public/rggen.wasm is missing. Build it first:" >&2
  echo "  cd rggen-wasm && bash bin/build.sh && cp rggen.wasm ../public/" >&2
  exit 1
fi

echo "==> Building"
npm run build

echo "==> Starting preview server (Ctrl-C to stop)"
exec npm run preview -- --port "$port" "${host_opt[@]}"
