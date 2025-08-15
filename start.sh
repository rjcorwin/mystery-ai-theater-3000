#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
ENV_FILE="$BACKEND_DIR/.env"

if [ ! -d "$BACKEND_DIR" ]; then
  echo "Error: backend directory not found at $BACKEND_DIR"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "No backend/.env found. Running interactive installer...\n"
  "$SCRIPT_DIR/install.sh"
fi

print_banner() {
  local purple="\033[95m"
  local cyan="\033[36m"
  local yellow="\033[93m"
  local reset="\033[0m"
  printf "\n"
  printf "$purple"
  cat <<'BANNER'
 ███╗   ███╗██╗   ██╗███████╗████████╗███████╗██████╗ ██╗   ██╗
 ████╗ ████║╚██╗ ██╔╝██╔════╝╚══██╔══╝██╔════╝██╔══██╗╚██╗ ██╔╝
 ██╔████╔██║ ╚████╔╝ ███████╗   ██║   █████╗  ██████╔╝ ╚████╔╝ 
 ██║╚██╔╝██║  ╚██╔╝  ╚════██║   ██║   ██╔══╝  ██╔══██╗  ╚██╔╝  
 ██║ ╚═╝ ██║   ██║   ███████║   ██║   ███████╗██║  ██║   ██║   
 ╚═╝     ╚═╝   ╚═╝   ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝   ╚═╝   
BANNER
  printf "$reset"
  printf "${cyan}          AI Theater 3000 ${yellow}— Starting Server${reset}\n"
  printf "${cyan}    🎭 Two robots, infinite snark, zero mercy 🤖${reset}\n\n"
}

print_banner

if command -v entr >/dev/null 2>&1; then
  echo "Starting server with live-reload (entr)..."
  # Rebuild on changes to Go files
  find "$BACKEND_DIR" -type f -name '*.go' | entr -r sh -c "cd '$BACKEND_DIR' && go run ./cmd/server" | cat
else
  echo "Starting server..."
  (cd "$BACKEND_DIR" && go run ./cmd/server)
fi


