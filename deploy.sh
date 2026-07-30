#!/bin/bash
set -e

# Setup logging
mkdir -p .logs
exec > >(tee -a .logs/deploy.log) 2>&1

# Load .env if exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

SSH_TARGET=${SSH_TARGET:-"moscow-nadamudash"}
IMAGE_NAME="ghcr.io/danyanadamu/nadamudash:latest"
SERVER_DEPLOY_CMD="sudo /usr/local/bin/deploy-nadamudash"

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
  echo "  --server   (Default) Push to GitHub, then server pulls code, builds image, and deploys."
  echo "  --local    Push to GitHub, build and push to GHCR locally, then server pulls and deploys."
  echo "  --gha      Push to GitHub, wait for GitHub Actions to build, then server pulls and deploys."
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
  echo "Press [ENTER] when you are ready to trigger the server deployment..."
  read
else
  echo "⏩ Skipping local build. The server will build the image itself."
fi

echo ""
echo "==========================================="
echo "🔄 3. Trigger Server Deployment ($SSH_TARGET)"
echo "==========================================="
if [ "$MODE" == "--server" ]; then
  ssh $SSH_TARGET "$SERVER_DEPLOY_CMD server"
elif [ "$MODE" == "--local" ]; then
  ssh $SSH_TARGET "$SERVER_DEPLOY_CMD local"
elif [ "$MODE" == "--gha" ]; then
  ssh $SSH_TARGET "$SERVER_DEPLOY_CMD ghaction"
fi

echo ""
echo "==========================================="
echo "✅ Deployment complete!"
echo "==========================================="
