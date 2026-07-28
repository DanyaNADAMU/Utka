#!/bin/bash
set -e

# Setup logging
mkdir -p .logs
exec > >(tee -a .logs/deploy.log) 2>&1


# Load .env if exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# SSH alias from ~/.ssh/config
SSH_TARGET=${SSH_TARGET:-"moscow-nadamudash"}
IMAGE_NAME="ghcr.io/danyanadamu/nadamudash:latest"

echo "==========================================="
echo "📦 1. Push code to GitHub"
echo "==========================================="
if [ -n "$(git status --porcelain)" ]; then
  if [ -z "$1" ]; then
    echo "❌ Error: Uncommitted changes detected. Please provide a commit message."
    echo "Usage: ./deploy.sh \"your commit message\""
    exit 1
  fi
  git add .
  git commit -m "$1"
  
  echo "🔄 Pulling latest changes from GitHub..."
  git pull origin main --rebase || true
  
  git push origin main
  echo "✅ Code pushed to GitHub."
else
  echo "✅ No changes to commit."
fi

echo ""
echo "==========================================="
echo "🚀 2. Build local Docker image"
echo "==========================================="
DOCKER_BUILDKIT=1 docker build -t $IMAGE_NAME .

echo ""
echo "==========================================="
echo "📤 3. Push to GHCR"
echo "==========================================="
if ! docker system info | grep -q "ghcr.io"; then
  echo "⚠️ Not logged into ghcr.io."
  echo "Run: docker login ghcr.io -u YOUR_GITHUB_USERNAME"
fi
docker push $IMAGE_NAME

echo ""
echo "==========================================="
echo "🔄 4. Deploy to server ($SSH_TARGET)"
echo "==========================================="
ssh $SSH_TARGET "mkdir -p /opt/stacks/nadamudash/tmp_compose"
scp -r compose.yml xray $SSH_TARGET:/opt/stacks/nadamudash/tmp_compose/

ssh $SSH_TARGET "cd /opt/stacks/nadamudash && \
  if [ -d tmp_compose/xray ]; then \
    docker run --rm -v \$(pwd):/workspace alpine sh -c 'mkdir -p /workspace/xray && cp -n /workspace/tmp_compose/xray/* /workspace/xray/ 2>/dev/null || true'; \
  fi && \
  mv tmp_compose/compose.yml compose.yml && \
  rm -rf tmp_compose && \
  touch .env && \
  docker compose pull && \
  docker compose up -d"

echo ""
echo "==========================================="
echo "✅ Deployment complete"
echo "==========================================="
