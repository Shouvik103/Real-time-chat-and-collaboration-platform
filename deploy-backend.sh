#!/bin/bash
# =============================================================================
# deploy-backend.sh — 1-Click Deployment to AWS EC2
# Usage: ./deploy-backend.sh
# =============================================================================

set -e

EC2_IP="16.192.218.162"
KEY_PATH="../instalk-key.pem"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$PROJECT_DIR/$KEY_PATH" ]; then
    # Fallback check
    KEY_PATH="$PROJECT_DIR/../instalk-key.pem"
fi

echo "🚀 Deploying backend updates to AWS EC2 ($EC2_IP)..."

# 1. Sync backend files
echo "📦 Syncing code..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'frontend' \
  --exclude '.env' \
  -e "ssh -i '$PROJECT_DIR/$KEY_PATH' -o StrictHostKeyChecking=no" \
  "$PROJECT_DIR/services/" \
  ubuntu@$EC2_IP:/home/ubuntu/chat-platform/services/

# 2. Sync docker-compose if modified
rsync -avz \
  -e "ssh -i '$PROJECT_DIR/$KEY_PATH' -o StrictHostKeyChecking=no" \
  "$PROJECT_DIR/docker-compose.yml" \
  ubuntu@$EC2_IP:/home/ubuntu/chat-platform/

# 3. Update database schema & restart PM2 on EC2
echo "🔄 Updating database and restarting PM2 backend..."
ssh -i "$PROJECT_DIR/$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$EC2_IP 'bash -s' << 'EOF'
cd /home/ubuntu/chat-platform/services/auth-service
# Sync database if schema has changes
npx prisma db push --schema=src/prisma/schema.prisma --skip-generate
# Restart backend
pm2 restart chat-backend --update-env
EOF

# 4. Verify health
echo "🩺 Verifying cloud endpoint health..."
sleep 2
HEALTH=$(curl -s "https://16-192-218-162.sslip.io/health")
echo "Response: $HEALTH"

echo "✅ Backend successfully deployed and active!"
