#!/bin/bash
set -e

MODE=$1
if [[ "$MODE" != "ghaction" && "$MODE" != "local" && "$MODE" != "server" ]]; then
  echo "Usage: $0 [ghaction|local|server]"
  exit 1
fi

cd /opt/stacks/nadamudash
echo "🔄 Pulling latest code..."
git -C repo fetch origin main
git -C repo reset --hard origin/main

cp repo/compose.yml ./compose.yml

if [[ "$MODE" == "server" ]]; then
  echo "🚀 Building image on server..."
  docker compose --env-file .env build
  echo "🔄 Deploying..."
  docker compose --env-file .env up -d
  echo "📤 Pushing to GHCR..."
  docker compose --env-file .env push || echo "⚠️ Push to GHCR failed, but deployed successfully."
else
  echo "📥 Pulling image from GHCR..."
  docker compose --env-file .env pull
  echo "🔄 Deploying..."
  docker compose --env-file .env up -d
fi

docker image prune -f
echo "✅ Server deployment complete."
