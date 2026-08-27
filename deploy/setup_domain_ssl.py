import paramiko
import sys
import time

VPS_IP = "145.239.78.148"
VPS_USER = "ubuntu"
VPS_PASS = "os.getenv("VPS_PASS", "")"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print(f"Connecting to {VPS_IP}...")
ssh.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=30)
print("Connected!")

def run_sudo(cmd):
    full_cmd = f"echo '{VPS_PASS}' | sudo -S {cmd}"
    stdin, stdout, stderr = ssh.exec_command(full_cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    return out, err

# 1. Update Nginx configuration for portal.aalawsng.com
nginx_conf = """server {
    listen 80;
    listen [::]:80;
    server_name portal.aalawsng.com 145.239.78.148;

    client_max_body_size 50M;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
    }

    # Uploads Storage
    location /uploads/ {
        alias /opt/aalawsng/deploy/uploads/;
        autoindex off;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Next.js Frontend Proxy
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
"""

print("Writing Nginx configuration...")
sftp = ssh.open_sftp()
with sftp.file('/tmp/aalawsng.conf', 'w') as f:
    f.write(nginx_conf)
sftp.close()

run_sudo("mv /tmp/aalawsng.conf /etc/nginx/sites-available/aalawsng.conf")
run_sudo("ln -sf /etc/nginx/sites-available/aalawsng.conf /etc/nginx/sites-enabled/aalawsng.conf")
out, err = run_sudo("nginx -t")
print("Nginx Test:", out, err)
run_sudo("systemctl reload nginx")

# 2. Update FRONTEND_URL in backend/.env on VPS
run_sudo("sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=https://portal.aalawsng.com|g' /opt/aalawsng/backend/.env")
run_sudo("sed -i 's|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://portal.aalawsng.com/api/v1|g' /opt/aalawsng/frontend/.env.local")

# 3. Check / Install Certbot and request SSL
print("Installing certbot and issuing SSL certificate for portal.aalawsng.com...")
run_sudo("apt-get update -y && apt-get install -y certbot python3-certbot-nginx")
out, err = run_sudo("certbot --nginx -d portal.aalawsng.com --non-interactive --agree-tos -m admin@aalawsng.com --redirect")
print("Certbot output:", out, err)

# 4. Final Nginx reload
run_sudo("nginx -t")
run_sudo("systemctl reload nginx")
print("SSL and Nginx Setup Complete!")
ssh.close()
