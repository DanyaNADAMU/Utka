#!/bin/bash
set -e

REPO_DIR="${REPO_DIR:-/opt/repos/nadamudash}"
BUILD_DIR="${BUILD_DIR:-/opt/builds/nadamudash}"
STACK_DIR="${STACK_DIR:-/opt/stacks/nadamudash}"
IMAGE_NAME="${IMAGE_NAME:-ghcr.io/danyanadamu/nadamudash:latest}"
REPO_URL="${REPO_URL:-https://github.com/DanyaNADAMU/NadamuDash.git}"
BRANCH="${BRANCH:-main}"
CONTAINER_NAME="${CONTAINER_NAME:-nadamudash}"
APP_USER="${APP_USER:-nadamudash}"
APP_GROUP="${APP_GROUP:-nadamudash}"

echo "=========================================="
echo "🕒 Build started at $(date)"
echo "=========================================="

echo "🔄 Fetching latest code in $REPO_DIR..."
if [ ! -d "$REPO_DIR" ]; then
  mkdir -p "$(dirname "$REPO_DIR")"
  git clone "$REPO_URL" "$REPO_DIR"
fi
cd "$REPO_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "📁 Syncing code to $BUILD_DIR..."
mkdir -p "$BUILD_DIR"
rsync -a --delete --exclude='.git' --exclude='node_modules' --exclude='.next' "$REPO_DIR/" "$BUILD_DIR/"

cd "$BUILD_DIR"
echo "🚀 Building Docker image..."
DOCKER_BUILDKIT=1 docker build -t "$IMAGE_NAME" .

echo "⚡ Deploying container in $STACK_DIR..."
if [ -d "$STACK_DIR" ]; then
  cd "$STACK_DIR"
  docker compose up -d --remove-orphans "$CONTAINER_NAME"
else
  docker restart "$CONTAINER_NAME" || docker run -d --name "$CONTAINER_NAME" --network host --restart unless-stopped "$IMAGE_NAME"
fi
echo "✅ Container updated & restarted!"

chown -R "$APP_USER:$APP_GROUP" "$REPO_DIR" "$BUILD_DIR" 2>/dev/null || true

echo "📤 Pushing image to registry..."
docker push "$IMAGE_NAME"

echo "🎉 Build & Deploy complete!"
