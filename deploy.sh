#!/bin/bash
set -e

# Setup logging
mkdir -p .logs
exec > >(tee -a .logs/deploy.log) 2>&1

# Load .env if exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

SERVER_SSH_TARGET=${SERVER_SSH_TARGET:-${SSH_TARGET:-"berg-nadamudash"}}
IMAGE_NAME="ghcr.io/danyanadamu/nadamudash:latest"
BUILD_CMD="sudo /usr/local/bin/build-nadamudash"
DEPLOY_CMD="sudo /usr/local/bin/deploy-nadamudash"

# Parse arguments
MODE="--server"
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
  echo "  --server   (Default) Push git -> Build on Berg -> Deploy on Berg"
  echo "  --local    Build locally -> Push image -> Deploy immediately -> Sync Git"
  echo "  --gha      Push git -> Wait GHA -> Deploy immediately -> Sync server repo"
  exit 1
fi

sync_git() {
  echo "==========================================="
  echo "📦 Git Sync: Commit & Push to GitHub"
  echo "==========================================="
  if [ -n "$(git status --porcelain)" ]; then
    git add .
    git commit -m "$COMMIT_MSG"
  fi
  git pull origin main --rebase || true
  git push origin main
  echo "✅ Code synced with GitHub."
}

trigger_deploy() {
  echo "==========================================="
  echo "🚀 Triggering Server Deployment ($SERVER_SSH_TARGET)"
  echo "==========================================="
  ssh $SERVER_SSH_TARGET "$DEPLOY_CMD"
}

sync_server_repo() {
  echo "==========================================="
  echo "🔄 Syncing Repository on Server (/opt/repos/nadamudash)"
  echo "==========================================="
  ssh $SERVER_SSH_TARGET "if [ -d /opt/repos/nadamudash ]; then cd /opt/repos/nadamudash && git pull origin main; fi" || true
}

# --- Execution Flow based on MODE ---

if [ "$MODE" == "--local" ]; then
  echo "⚡ Mode: Local Build (Fastest Deployment)"
  
  echo "==========================================="
  echo "🔨 Building Docker image locally..."
  echo "==========================================="
  DOCKER_BUILDKIT=1 docker build -t $IMAGE_NAME .
  
  echo "📤 Pushing image to GHCR..."
  docker push $IMAGE_NAME
  
  # 🚀 Deploy immediately after image is pushed!
  trigger_deploy
  
  # Post-deploy git sync
  sync_git
  sync_server_repo

elif [ "$MODE" == "--gha" ]; then
  echo "⚡ Mode: GitHub Actions Build"
  
  sync_git
  
  echo "⏳ GitHub Actions is building the image on GitHub..."
  echo "Press [ENTER] when GHA build finishes to trigger server deployment..."
  read
  
  trigger_deploy
  sync_server_repo

else
  echo "⚡ Mode: Server Build on Berg"
  
  sync_git
  
  echo "==========================================="
  echo "🔨 Building image on Berg ($SERVER_SSH_TARGET)..."
  echo "==========================================="
  ssh $SERVER_SSH_TARGET "$BUILD_CMD"
  
  trigger_deploy
fi

echo ""
echo "==========================================="
echo "✅ All done! Deployment complete."
echo "==========================================="


