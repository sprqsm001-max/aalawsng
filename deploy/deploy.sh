#!/bin/bash
# ==============================================================================
# AALAWSNG Deployment Script for OVH VPS (145.239.78.148)
# ==============================================================================

set -e

VPS_USER="ubuntu"
VPS_HOST="145.239.78.148"
REMOTE_APP_DIR="/opt/aalawsng"

echo "🚀 Deploying AALAWSNG Law Firm Management System to OVH VPS ($VPS_HOST)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Test SSH connectivity
echo "📡 Checking connection to $VPS_USER@$VPS_HOST..."
ssh -o BatchMode=yes -o ConnectTimeout=5 $VPS_USER@$VPS_HOST "echo 'Connected successfully to OVH VPS'" || {
  echo "⚠️  SSH password or key required. Please ensure SSH key is authorized on $VPS_HOST."
}

# 2. Build and launch containers on VPS
echo "🐳 Launching Docker Compose Production Stack..."
ssh $VPS_USER@$VPS_HOST "cd $REMOTE_APP_DIR && docker compose -f deploy/docker-compose.prod.yml up -d --build"

# 3. Apply database migrations & seed on VPS
echo "🌱 Running Prisma database push & seeder..."
ssh $VPS_USER@$VPS_HOST "docker exec aalawsng_backend_prod npx prisma db push && docker exec aalawsng_backend_prod npm run db:seed"

# 4. Configure Nginx Reverse Proxy
echo "🌐 Reloading Nginx..."
ssh $VPS_USER@$VPS_HOST "sudo cp $REMOTE_APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/aalawsng && sudo ln -sf /etc/nginx/sites-available/aalawsng /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 AALAWSNG Law Firm Management System is LIVE on http://145.239.78.148"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
