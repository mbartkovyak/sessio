#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$ROOT_DIR/.tools/whisper-venv"
SHIM_DIR="$ROOT_DIR/.tools/whisper-bin"
PYTHON_BIN="$VENV_DIR/bin/python"
WHISPER_BIN="$VENV_DIR/bin/whisper"

if [[ ! -x "$PYTHON_BIN" || ! -x "$WHISPER_BIN" ]]; then
  echo "Whisper is not installed in $VENV_DIR" >&2
  exit 1
fi

FFMPEG_BIN="$("$PYTHON_BIN" -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())')"
mkdir -p "$SHIM_DIR"
ln -sf "$FFMPEG_BIN" "$SHIM_DIR/ffmpeg"
export PATH="$SHIM_DIR:$PATH"

exec "$WHISPER_BIN" --task transcribe --language pl "$@"
