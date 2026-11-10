#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${DEVDESK_DATA_DIR:-$HOME/.devdesk}"
LOG_FILE="$DATA_DIR/devdesk.log"
PID_FILE="$DATA_DIR/devdesk.pid"
PROFILE_DIR="$DATA_DIR/chrome-profile"
API_URL="http://127.0.0.1:3002/api/health"
WEB_URL="http://127.0.0.1:5174"
ICON="$ROOT/apps/web/public/icon.svg"

mkdir -p "$DATA_DIR"

notify() {
  local message="$1"
  if command -v notify-send >/dev/null 2>&1; then
    notify-send --icon="$ICON" "DevDesk" "$message" || true
  fi
}

load_node() {
  export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:$PATH"
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$HOME/.nvm/nvm.sh"
  fi
  if command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env)" || true
  fi
  if [ -s "$HOME/.asdf/asdf.sh" ]; then
    # shellcheck disable=SC1091
    . "$HOME/.asdf/asdf.sh"
  fi
}

api_up() {
  curl -sf --max-time 1 "$API_URL" >/dev/null 2>&1
}

web_up() {
  curl -sf --max-time 1 "$WEB_URL" >/dev/null 2>&1
}

stack_up() {
  api_up && web_up
}

chrome_profile_running() {
  pgrep -f -- "--user-data-dir=$PROFILE_DIR" >/dev/null 2>&1
}

focus_existing_window() {
  if command -v wmctrl >/dev/null 2>&1; then
    if wmctrl -xa DevDesk >/dev/null 2>&1; then
      return 0
    fi
    if wmctrl -a DevDesk >/dev/null 2>&1; then
      return 0
    fi
    local window_id
    window_id="$(wmctrl -l | awk 'BEGIN{IGNORECASE=1} /DevDesk|127\.0\.0\.1:5174|localhost:5174/ {print $1; exit}')"
    if [ -n "$window_id" ]; then
      wmctrl -ia "$window_id" >/dev/null 2>&1 && return 0
    fi
  fi
  if command -v xdotool >/dev/null 2>&1; then
    local window_id
    window_id="$(xdotool search --onlyvisible --class DevDesk 2>/dev/null | tail -n 1 || true)"
    if [ -z "$window_id" ]; then
      window_id="$(xdotool search --onlyvisible --name DevDesk 2>/dev/null | tail -n 1 || true)"
    fi
    if [ -n "$window_id" ]; then
      xdotool windowactivate "$window_id" >/dev/null 2>&1 && return 0
    fi
  fi
  return 1
}

wait_ready() {
  local i
  for i in $(seq 1 80); do
    if api_up && web_up; then
      return 0
    fi
    sleep 0.4
  done
  return 1
}

start_stack() {
  load_node
  if ! command -v npm >/dev/null 2>&1; then
    notify "Node/npm não encontrado. Abra um terminal e rode npm install."
    echo "Node/npm não encontrado no PATH." >&2
    exit 1
  fi
  if [ ! -d "$ROOT/node_modules" ]; then
    notify "Dependências ausentes. Rode npm install na pasta do DevDesk."
    echo "Execute npm install em $ROOT" >&2
    exit 1
  fi

  if stack_up; then
    return 0
  fi

  local npm_script="dev"
  if api_up; then
    npm_script="dev:web"
  elif web_up; then
    npm_script="dev:api"
  fi

  if command -v setsid >/dev/null 2>&1; then
    setsid npm run "$npm_script" --prefix "$ROOT" >>"$LOG_FILE" 2>&1 &
  else
    nohup npm run "$npm_script" --prefix "$ROOT" >>"$LOG_FILE" 2>&1 &
  fi
  echo $! >"$PID_FILE"

  if ! wait_ready; then
    notify "O DevDesk não subiu a tempo. Veja $LOG_FILE"
    echo "Timeout ao iniciar. Log: $LOG_FILE" >&2
    exit 1
  fi
}

find_chromium() {
  local candidate
  for candidate in google-chrome-stable google-chrome chromium chromium-browser brave-browser microsoft-edge microsoft-edge-stable; do
    if command -v "$candidate" >/dev/null 2>&1; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

open_app_window() {
  if focus_existing_window; then
    return 0
  fi

  mkdir -p "$PROFILE_DIR"
  local browser=""
  browser="$(find_chromium || true)"

  if [ -n "$browser" ] && chrome_profile_running; then
    "$browser" --user-data-dir="$PROFILE_DIR" "$WEB_URL" >/dev/null 2>&1 &
    sleep 0.3
    focus_existing_window || true
    return 0
  fi

  if [ -n "$browser" ]; then
    exec "$browser" \
      --user-data-dir="$PROFILE_DIR" \
      --class=DevDesk \
      --name=DevDesk \
      --no-first-run \
      --no-default-browser-check \
      --app="$WEB_URL"
  fi

  if command -v firefox >/dev/null 2>&1; then
    exec firefox --new-window "$WEB_URL"
  fi

  if command -v xdg-open >/dev/null 2>&1; then
    exec xdg-open "$WEB_URL"
  fi

  notify "Nenhum navegador encontrado para abrir o DevDesk."
  echo "Abra manualmente: $WEB_URL" >&2
  exit 1
}

write_desktop_file() {
  local target="$1"
  cat >"$target" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=DevDesk
Comment=Painel local para iniciar, parar e abrir aplicações de desenvolvimento
Exec=$ROOT/scripts/devdesk.sh
Icon=$ICON
Terminal=false
Categories=Development;Utility;
StartupNotify=true
StartupWMClass=DevDesk
EOF
  chmod +x "$target"
}

install_shortcut() {
  local desktop_dir applications_dir desktop_file app_file
  desktop_dir="${XDG_DESKTOP_DIR:-$HOME/Desktop}"
  if [ ! -d "$desktop_dir" ]; then
    desktop_dir="$HOME/Área de Trabalho"
  fi
  if [ ! -d "$desktop_dir" ]; then
    desktop_dir="$HOME/Desktop"
    mkdir -p "$desktop_dir"
  fi
  applications_dir="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
  mkdir -p "$applications_dir"

  desktop_file="$desktop_dir/DevDesk.desktop"
  app_file="$applications_dir/devdesk.desktop"
  write_desktop_file "$desktop_file"
  write_desktop_file "$app_file"

  if command -v gio >/dev/null 2>&1; then
    gio set "$desktop_file" metadata::trusted true 2>/dev/null || true
  fi
  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$applications_dir" 2>/dev/null || true
  fi

  echo "Atalho criado em:"
  echo "  $desktop_file"
  echo "  $app_file"
  notify "Atalho criado na área de trabalho."
}

acquire_lock() {
  if ! command -v flock >/dev/null 2>&1; then
    return 0
  fi
  exec 9>"$DATA_DIR/devdesk.lock"
  if ! flock -n 9; then
    wait_ready || true
    open_app_window
    exit 0
  fi
}

case "${1:-}" in
  --install)
    chmod +x "$ROOT/scripts/devdesk.sh"
    install_shortcut
    ;;
  *)
    acquire_lock
    if stack_up; then
      open_app_window
      exit 0
    fi
    start_stack
    open_app_window
    ;;
esac
