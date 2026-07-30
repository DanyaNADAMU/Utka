#!/bin/bash
set -e

# Setup logging
mkdir -p .logs
exec > >(tee -a .logs/deploy_fast.log) 2>&1

# Load .env if exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# SSH alias from ~/.ssh/config
SSH_TARGET=${SSH_TARGET:-"moscow-nadamudash"}
IMAGE_NAME="ghcr.io/danyanadamu/nadamudash:latest"
REMOTE_SRC_DIR="/tmp/nadamudash_src"

echo "==========================================="
echo "📦 1. Sync code to server ($SSH_TARGET)"
echo "==========================================="
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' --exclude '.logs' . $SSH_TARGET:$REMOTE_SRC_DIR

echo ""
echo "==========================================="
echo "🚀 2. Build Docker image on server"
echo "==========================================="
ssh $SSH_TARGET "cd $REMOTE_SRC_DIR && docker build -t $IMAGE_NAME ."

echo ""
echo "==========================================="
echo "🔄 3. Deploy to server"
echo "==========================================="
ssh $SSH_TARGET "cd /opt/stacks/nadamudash && sudo docker compose up -d nadamudash"

echo ""
echo "==========================================="
echo "✅ Fast Deployment complete"
echo "==========================================="
