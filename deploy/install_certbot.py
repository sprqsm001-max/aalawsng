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

# Remove default site if exists to eliminate conflict
print("Cleaning default sites...")
run_sudo("rm -f /etc/nginx/sites-enabled/default")

# Install snap and certbot
print("Installing snap and certbot...")
out, err = run_sudo("snap install core && snap refresh core")
print("Snap Core:", out, err)

out, err = run_sudo("snap install --classic certbot")
print("Snap Certbot:", out, err)

run_sudo("ln -sf /snap/bin/certbot /usr/bin/certbot")

# Run certbot to obtain and configure SSL certificate
print("Requesting SSL Certificate via Certbot...")
out, err = run_sudo("certbot --nginx -d portal.aalawsng.com --non-interactive --agree-tos -m admin@aalawsng.com --redirect")
print("Certbot Result:", out, err)

out, err = run_sudo("nginx -t")
print("Nginx Test:", out, err)
run_sudo("systemctl reload nginx")

print("All done!")
ssh.close()
