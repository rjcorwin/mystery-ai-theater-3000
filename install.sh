#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
ENV_FILE="$BACKEND_DIR/.env"
ENV_EXAMPLE="$BACKEND_DIR/ENV.example"

echo "\nMystery AI Theater 3000 — Install\n----------------------------------"

# Check Go
if ! command -v go >/dev/null 2>&1; then
  echo "Error: Go is not installed. Please install Go 1.22+ from https://go.dev/dl/"
  exit 1
fi

# Ensure backend exists
if [ ! -d "$BACKEND_DIR" ]; then
  echo "Error: backend directory not found at $BACKEND_DIR"
  exit 1
fi

# Load defaults from ENV.example if present
DEFAULT_PORT="8080"
DEFAULT_MODEL="gpt-4o"
if [ -f "$ENV_EXAMPLE" ]; then
  DEFAULT_PORT=$(grep -E '^PORT=' "$ENV_EXAMPLE" | cut -d'=' -f2- || echo "8080")
  DEFAULT_MODEL=$(grep -E '^OPENAI_MODEL=' "$ENV_EXAMPLE" | cut -d'=' -f2- || echo "gpt-4o")
  DEFAULT_PORT=${DEFAULT_PORT:-8080}
  DEFAULT_MODEL=${DEFAULT_MODEL:-gpt-4o}
fi

# If .env exists, prefill with current values
if [ -f "$ENV_FILE" ]; then
  EXISTING_PORT=$(grep -E '^PORT=' "$ENV_FILE" | cut -d'=' -f2- || true)
  EXISTING_MODEL=$(grep -E '^OPENAI_MODEL=' "$ENV_FILE" | cut -d'=' -f2- || true)
  EXISTING_KEY=$(grep -E '^OPENAI_API_KEY=' "$ENV_FILE" | cut -d'=' -f2- || true)
  DEFAULT_PORT=${EXISTING_PORT:-$DEFAULT_PORT}
  DEFAULT_MODEL=${EXISTING_MODEL:-$DEFAULT_MODEL}
fi

echo
read -r -p "Port to run the server on [$DEFAULT_PORT]: " PORT_IN || true
PORT_IN=${PORT_IN:-$DEFAULT_PORT}

echo
read -r -p "OpenAI model to use [$DEFAULT_MODEL]: " MODEL_IN || true
MODEL_IN=${MODEL_IN:-$DEFAULT_MODEL}

echo
if [ -n "${EXISTING_KEY:-}" ]; then
  KEY_MASKED="${EXISTING_KEY:0:4}********"
  read -r -p "OpenAI API key (leave blank to keep existing: $KEY_MASKED): " KEY_IN || true
  if [ -z "${KEY_IN:-}" ]; then
    KEY_IN="$EXISTING_KEY"
  fi
else
  read -r -s -p "OpenAI API key (leave blank to use stubbed responses): " KEY_IN || true
  echo
fi

# Write .env
echo "\nWriting $ENV_FILE"
cat > "$ENV_FILE" <<EOF
OPENAI_API_KEY=$KEY_IN
PORT=$PORT_IN
OPENAI_MODEL=$MODEL_IN
EOF

# Go deps
echo "\nFetching Go dependencies..."
(
  cd "$BACKEND_DIR"
  go mod tidy
)

echo "\n✅ Install complete. Next steps:"
echo "- Run ./start.sh to start the server"
echo "- Open http://localhost:$PORT_IN in your browser"


