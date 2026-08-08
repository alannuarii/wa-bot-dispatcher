#!/bin/sh
set -e

echo "Starting Backend (Port 3000)..."
cd /app/backend && PORT=3000 node dist/main.js &
BACKEND_PID=$!

echo "Starting Frontend (Port 3001)..."
cd /app/frontend && node server.js &
FRONTEND_PID=$!

# Trap termination signals to gracefully shut down both services
trap "kill -TERM $BACKEND_PID $FRONTEND_PID 2>/dev/null; wait" TERM INT

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID
