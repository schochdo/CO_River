#!/bin/bash
# Stop the Colorado River Basin Dashboard server.
cd "$(dirname "$0")" || exit 1
PORT="${1:-8088}"

if [ -f server.pid ] && kill -0 "$(cat server.pid)" 2>/dev/null; then
  PID=$(cat server.pid)
  kill "$PID" && rm -f server.pid
  echo "Stopped dashboard server (pid $PID)"
elif lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  PIDS=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN | tr '\n' ' ')
  kill $PIDS
  rm -f server.pid
  echo "Stopped dashboard server ($PIDS)"
else
  rm -f server.pid
  echo "Dashboard server is not running on port $PORT"
fi

if [ -f updater.pid ] && kill -0 "$(cat updater.pid)" 2>/dev/null; then
  UPID=$(cat updater.pid)
  kill "$UPID" && rm -f updater.pid
  echo "Stopped telemetry updater (pid $UPID)"
else
  rm -f updater.pid
fi
