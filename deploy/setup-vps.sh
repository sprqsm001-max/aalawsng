#!/bin/bash
# ==============================================================================
# AALAWSNG Law Firm Management System
# VPS Provisioning Script for OVH Ubuntu VPS (145.239.78.148)
# ==============================================================================

set -e

echo "🏛️  Setting up OVH Ubuntu VPS for AALAWSNG..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. System Updates
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw htop net-tools unzip software-properties-common ca-certificates gnupg lsb-release

# 2. Configure UFW Firewall
echo "🔒 Configuring UFW Security Firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
echo "y" | sudo ufw enable

# 3. Install Docker & Docker Compose
echo "🐳 Installing Docker Engine..."
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER

# 4. Install Nginx & Certbot
echo "🌐 Installing Nginx Reverse Proxy & Certbot..."
sudo apt install -y nginx certbot python3-certbot-nginx

# 5. Install Node.js 20 LTS (for local tools/scripts)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 6. Create App Directory
sudo mkdir -p /opt/aalawsng
sudo chown -R $USER:$USER /opt/aalawsng

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VPS Provisioning Completed Successfully!"
echo "Next step: Copy application repository and run docker compose."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
