#!/bin/bash
# Start the Colorado River Basin Hydrology Dashboard server.
cd "$(dirname "$0")" || exit 1

PORT="${1:-8088}"

# Only a LISTENing socket means the server is already running
if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Already running on :$PORT (pid $(lsof -tiTCP:"$PORT" -sTCP:LISTEN | tr '\n' ' '))"
  echo "Dashboard: http://localhost:$PORT"
  exit 0
fi

# Prefer the project venv (.venv); fall back to system python3.
PY="$([ -x .venv/bin/python ] && echo .venv/bin/python || echo python3)"

nohup "$PY" -m http.server "$PORT" --directory web >> server.log 2>&1 &
echo $! > server.pid

# Fetch fresh telemetry snapshot once on server start (non-blocking, runs in background)
nohup "$PY" src/fetch_water_data.py >> updater.log 2>&1 &
echo $! > updater.pid


# Poll for the LISTENing socket (up to 5s)
i=0
while [ "$i" -lt 10 ] && ! lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  sleep 0.5
  i=$((i + 1))
done

if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  if curl -sf --max-time 3 "http://localhost:$PORT/" >/dev/null; then
    echo "Started: http://localhost:$PORT"
    echo "Log: server.log   pid: $(cat server.pid)   stop: ./stop.sh"
    if [ -t 1 ] && command -v open >/dev/null 2>&1; then
      open "http://localhost:$PORT"
    fi
  else
    echo "Listening but not answering HTTP — last lines of server.log:"
    tail -5 server.log
    exit 1
  fi
else
  echo "Failed to start — last lines of server.log:"
  tail -5 server.log
  exit 1
fi
