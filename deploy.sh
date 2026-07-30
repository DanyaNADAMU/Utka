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
echo "📦 1. Push code to GitHub & Sync to Server"
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
echo "🚀 2. Syncing source code to server ($SSH_TARGET)"
echo "==========================================="
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' --exclude '.logs' . $SSH_TARGET:/opt/stacks/nadamudash/src/

echo ""
echo "==========================================="
echo "🔄 3. Build & Deploy on server ($SSH_TARGET)"
echo "==========================================="
ssh $SSH_TARGET "sudo /opt/stacks/nadamudash/deploy.sh"

echo ""
echo "==========================================="
echo "✅ Deployment complete"
echo "==========================================="
