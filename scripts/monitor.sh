#!/bin/bash
set -uo pipefail

URL="${MONITOR_URL:-https://touchgoldpicks.com/api/health}"
STATE_DIR="${MONITOR_STATE_DIR:-/var/lib/touchgoldpicks-monitor}"
STATE_FILE="$STATE_DIR/state"
SINCE_FILE="$STATE_DIR/down_since"
SEND_ALERT="${SEND_ALERT_SCRIPT:-/opt/touchgoldpicks/scripts/send-alert.mjs}"
TIMEOUT="${MONITOR_TIMEOUT:-10}"

mkdir -p "$STATE_DIR"
PREV_STATE=$(cat "$STATE_FILE" 2>/dev/null || echo "up")
NOW=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

BODY_FILE=$(mktemp)
RESPONSE=$(curl -sS -m "$TIMEOUT" -o "$BODY_FILE" -w '%{http_code}|%{time_total}' "$URL" 2>/dev/null || echo '0|0')
HTTP=$(echo "$RESPONSE" | cut -d'|' -f1)
TIME=$(echo "$RESPONSE" | cut -d'|' -f2)
RESPONSE_BODY=$(head -c 500 "$BODY_FILE" 2>/dev/null)
rm -f "$BODY_FILE"

if [ "$HTTP" = "200" ] && echo "$RESPONSE_BODY" | grep -q '"status":"ok"'; then
  CURRENT="up"
else
  CURRENT="down"
fi

send_alert() {
  local subject="$1"
  local message="$2"
  if [ ! -f "$SEND_ALERT" ]; then
    echo "[monitor] $NOW alert script missing: $SEND_ALERT"
    return 1
  fi
  echo "$message" | node "$SEND_ALERT" "$subject" || echo "[monitor] $NOW alert dispatch failed"
}

if [ "$CURRENT" = "down" ] && [ "$PREV_STATE" = "up" ]; then
  date -u +'%Y-%m-%dT%H:%M:%SZ' > "$SINCE_FILE"
  SUBJECT="[Touch Gold Picks] Site DOWN"
  MSG="Health check failed at $NOW

URL: $URL
HTTP: $HTTP
Response time: ${TIME}s
Body (first 500 bytes):
$RESPONSE_BODY

--- Service status ---
$(systemctl is-active touchgoldpicks.service mongod nginx 2>&1)

--- Recent journal: touchgoldpicks.service ---
$(journalctl -u touchgoldpicks.service --no-pager -n 20 --since '5 minutes ago' 2>/dev/null | tail -15)

--- Memory ---
$(free -h)

--- Disk ---
$(df -h / | tail -1)

Monitor will alert again on recovery."
  send_alert "$SUBJECT" "$MSG"
elif [ "$CURRENT" = "up" ] && [ "$PREV_STATE" = "down" ]; then
  DOWN_SINCE=$(cat "$SINCE_FILE" 2>/dev/null || echo "unknown")
  rm -f "$SINCE_FILE"
  SUBJECT="[Touch Gold Picks] Site RECOVERED"
  MSG="Health check now passing at $NOW

URL: $URL
HTTP: $HTTP
Response time: ${TIME}s
Down since: $DOWN_SINCE

--- Service status ---
$(systemctl is-active touchgoldpicks.service mongod nginx 2>&1)

--- Memory ---
$(free -h)"
  send_alert "$SUBJECT" "$MSG"
fi

echo "$CURRENT" > "$STATE_FILE"
echo "$NOW state=$CURRENT (was $PREV_STATE) http=$HTTP time=${TIME}s url=$URL"
