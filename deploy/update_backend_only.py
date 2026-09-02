import os
import tarfile
import tempfile
import paramiko
import time

VPS_IP = "145.239.78.148"
VPS_USER = "ubuntu"
VPS_PASS = os.getenv("VPS_PASS", "VrrGnSSqskNyp")

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
backend_dir = os.path.join(repo_root, "backend")

print(f"Connecting to VPS at {VPS_IP}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=30)
print("SSH connection established.")

def run_sudo(cmd):
    full_cmd = f"echo '{VPS_PASS}' | sudo -S {cmd}"
    stdin, stdout, stderr = ssh.exec_command(full_cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out, err

# Package backend
print("Packaging backend...")
backend_tar = tempfile.mktemp(suffix="_backend.tar.gz")
with tarfile.open(backend_tar, "w:gz") as tar:
    for root, dirs, files in os.walk(backend_dir):
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        if "dist" in dirs:
            dirs.remove("dist")
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, backend_dir)
            tar.add(full_path, arcname=rel_path)

# SFTP upload
print("Uploading backend to VPS...")
sftp = ssh.open_sftp()
sftp.put(backend_tar, "/tmp/backend_update.tar.gz")
sftp.put(os.path.join(repo_root, "deploy", "schema.postgresql.prisma"), "/tmp/schema.postgresql.prisma")
sftp.close()

# Extract on VPS
print("Extracting backend on VPS...")
run_sudo("mkdir -p /opt/aalawsng/backend")
run_sudo("tar -xzf /tmp/backend_update.tar.gz -C /opt/aalawsng/backend")
run_sudo("rm -f /tmp/backend_update.tar.gz")
run_sudo("cp /tmp/schema.postgresql.prisma /opt/aalawsng/backend/prisma/schema.prisma")
run_sudo("rm -f /tmp/schema.postgresql.prisma")

# Rebuild and restart backend
print("Rebuilding and restarting backend container on VPS...")
out, err = run_sudo("bash -c 'cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml build backend'")
print("Backend Build Output:", out[-400:], err[-200:])

out, err = run_sudo("bash -c 'cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml up -d --no-deps backend'")
print("Backend restart output:", out, err)

time.sleep(4)
out, _ = run_sudo("docker ps")
print("Live Containers:\n", out)

try:
    os.remove(backend_tar)
except:
    pass

ssh.close()
print("Backend update complete!")
