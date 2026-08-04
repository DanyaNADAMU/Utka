#!/bin/bash
set -e

# Setup logging
mkdir -p .logs
exec > >(tee -a .logs/deploy.log) 2>&1

# Load .env if exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

BUILD_SSH_TARGET=${BUILD_SSH_TARGET:-"berg-nadamudash"}
DEPLOY_SSH_TARGET=${DEPLOY_SSH_TARGET:-"glacier-nadamudash"}
IMAGE_NAME="ghcr.io/danyanadamu/nadamudash:latest"
BUILD_CMD="sudo /usr/local/bin/build-nadamudash"
DEPLOY_CMD="sudo /usr/local/bin/deploy-nadamudash"

# Parse arguments
MODE="--server" # Default mode
COMMIT_MSG=""

for arg in "$@"; do
  if [[ "$arg" == "--gha" || "$arg" == "--local" || "$arg" == "--server" ]]; then
    MODE="$arg"
  else
    COMMIT_MSG="$arg"
  fi
done

if [ -z "$COMMIT_MSG" ]; then
  echo "❌ Error: A commit message is required."
  echo "Usage: ./deploy.sh [--gha|--local|--server] \"your commit message\""
  echo ""
  echo "  --server   (Default) Build image on Build Server ($BUILD_SSH_TARGET), push to GHCR, and deploy on Server ($DEPLOY_SSH_TARGET)."
  echo "  --local    Build image locally, push to GHCR, and deploy on Server ($DEPLOY_SSH_TARGET)."
  echo "  --gha      Wait for GitHub Actions to build & push image, then deploy on Server ($DEPLOY_SSH_TARGET)."
  exit 1
fi

echo "==========================================="
echo "📦 1. Commit & Push code to GitHub"
echo "==========================================="
if [ -n "$(git status --porcelain)" ]; then
  git add .
  git commit -m "$COMMIT_MSG"
else
  echo "⚠️ No changes to commit, but proceeding with deployment..."
fi

echo "🔄 Pulling latest changes from GitHub..."
git pull origin main --rebase || true
git push origin main
echo "✅ Code synced with GitHub."

echo ""
echo "==========================================="
echo "⚙️ 2. Build & Push Image"
echo "==========================================="

if [ "$MODE" == "--local" ]; then
  echo "🚀 Building local Docker image..."
  DOCKER_BUILDKIT=1 docker build -t $IMAGE_NAME .
  echo "📤 Pushing to GHCR..."
  docker push $IMAGE_NAME
elif [ "$MODE" == "--gha" ]; then
  echo "⏳ GitHub Actions is currently building and pushing the image."
  echo "👉 Please wait for the GitHub Action to complete on github.com."
  echo "Press [ENTER] when you are ready to trigger deployment..."
  read
else
  echo "🚀 Building image on Build Server Berg ($BUILD_SSH_TARGET)..."
  ssh $BUILD_SSH_TARGET "$BUILD_CMD"
fi

echo ""
echo "==========================================="
echo "🔄 3. Trigger Deployment ($DEPLOY_SSH_TARGET)"
echo "==========================================="
ssh $DEPLOY_SSH_TARGET "$DEPLOY_CMD"

echo ""
echo "==========================================="
echo "✅ Deployment complete!"
echo "==========================================="
