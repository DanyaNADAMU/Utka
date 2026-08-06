#!/bin/bash
set -e

REPO_DIR="${REPO_DIR:-/opt/repos/nadamudash}"
STACK_DIR="${STACK_DIR:-/opt/stacks/nadamudash}"
IMAGE_NAME="${IMAGE_NAME:-ghcr.io/danyanadamu/nadamudash:latest}"
BRANCH="${BRANCH:-main}"
CONTAINER_NAME="${CONTAINER_NAME:-nadamudash}"
APP_USER="${APP_USER:-nadamudash}"
APP_GROUP="${APP_GROUP:-nadamudash}"

echo "=========================================="
echo "🚀 Deploying application on server..."
echo "=========================================="

if [ -d "$REPO_DIR" ]; then
  echo "🔄 Syncing repository in $REPO_DIR..."
  cd "$REPO_DIR"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
fi

echo "📥 Pulling latest Docker image ($IMAGE_NAME)..."
docker pull "$IMAGE_NAME"

echo "🔄 Updating container in $STACK_DIR..."
if [ -d "$STACK_DIR" ]; then
  cd "$STACK_DIR"
  docker compose up -d --remove-orphans "$CONTAINER_NAME"
else
  docker restart "$CONTAINER_NAME" || docker run -d --name "$CONTAINER_NAME" --network host --restart unless-stopped "$IMAGE_NAME"
fi

chown -R "$APP_USER:$APP_GROUP" "$REPO_DIR" 2>/dev/null || true
docker image prune -f >/dev/null 2>&1 || true

echo "✅ Deployment complete!"
