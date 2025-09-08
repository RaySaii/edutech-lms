#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Starting EduTech LMS (local, without Nx)"

ENV_FILE=".env.development"
if [ -f "$ENV_FILE" ]; then
  echo "🔧 Loading env from $ENV_FILE"
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$ENV_FILE" | xargs -0 2>/dev/null || grep -v '^#' "$ENV_FILE" | xargs)
fi

mkdir -p .dev/logs .dev/pids || true

start_service() {
  name="$1"; shift
  cmd=( "$@" )
  log=".dev/logs/${name}.log"
  echo "▶ $name → ${cmd[*]}" | tee -a "$log"
  nohup "${cmd[@]}" >> "$log" 2>&1 &
  echo $! > ".dev/pids/${name}.pid"
}

which npx >/dev/null 2>&1 || { echo "❌ npx not found"; exit 1; }

# Frontend (Next.js) on :4200
start_service frontend bash -lc "cd apps/frontend && npx next dev -p 4200"

# API Gateway (Nest)
start_service api-gateway env API_GATEWAY_PORT=${API_GATEWAY_PORT:-3100} REDIS_HOST=${REDIS_HOST:-localhost} REDIS_PORT=${REDIS_PORT:-6379} REDIS_PASSWORD=${REDIS_PASSWORD:-} npx ts-node -T -r tsconfig-paths/register -P apps/api-gateway/tsconfig.app.json apps/api-gateway/src/main.ts

# Auth Service (Nest microservice TCP)
start_service auth-service npx ts-node -T -r tsconfig-paths/register -P apps/auth-service/tsconfig.app.json apps/auth-service/src/main.ts

# Course Service (Nest microservice TCP)
start_service course-service npx ts-node -T -r tsconfig-paths/register -P apps/course-service/tsconfig.app.json apps/course-service/src/main.ts

# Content Service (Nest microservice TCP)
start_service content-service npx ts-node -T -r tsconfig-paths/register -P apps/content-service/tsconfig.app.json apps/content-service/src/main.ts

# User Service (Nest RMQ)
start_service user-service npx ts-node -T -r tsconfig-paths/register -P apps/user-service/tsconfig.app.json apps/user-service/src/main.ts

# Notification Service (HTTP)
start_service notification-service npx ts-node -T -r tsconfig-paths/register -P apps/notification-service/tsconfig.app.json apps/notification-service/src/main.ts

echo "✅ Services started. Logs in .dev/logs. To stop: pkill -F .dev/pids/*.pid || true"
