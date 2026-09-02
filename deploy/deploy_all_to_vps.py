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
frontend_dir = os.path.join(repo_root, "frontend")

print(f"Connecting to VPS at {VPS_IP}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=30)
print("SSH connection established successfully.")

def run_sudo(cmd):
    full_cmd = f"echo '{VPS_PASS}' | sudo -S {cmd}"
    stdin, stdout, stderr = ssh.exec_command(full_cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out, err

# 1. Package backend
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
print(f"Backend archive created: {backend_tar} ({os.path.getsize(backend_tar)} bytes)")

# 2. Package frontend
print("Packaging frontend...")
frontend_tar = tempfile.mktemp(suffix="_frontend.tar.gz")
with tarfile.open(frontend_tar, "w:gz") as tar:
    for root, dirs, files in os.walk(frontend_dir):
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        if ".next" in dirs:
            dirs.remove(".next")
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, frontend_dir)
            tar.add(full_path, arcname=rel_path)
print(f"Frontend archive created: {frontend_tar} ({os.path.getsize(frontend_tar)} bytes)")

# 3. SFTP upload
print("Uploading archives to VPS...")
sftp = ssh.open_sftp()
sftp.put(backend_tar, "/tmp/backend_update.tar.gz")
sftp.put(frontend_tar, "/tmp/frontend_update.tar.gz")
sftp.put(os.path.join(repo_root, "deploy", "schema.postgresql.prisma"), "/tmp/schema.postgresql.prisma")
sftp.close()
print("Uploads complete.")

# 4. Extract on VPS
print("Extracting backend and frontend on VPS...")
run_sudo("mkdir -p /opt/aalawsng/backend")
run_sudo("tar -xzf /tmp/backend_update.tar.gz -C /opt/aalawsng/backend")
run_sudo("rm -f /tmp/backend_update.tar.gz")
run_sudo("cp /tmp/schema.postgresql.prisma /opt/aalawsng/backend/prisma/schema.prisma")
run_sudo("rm -f /tmp/schema.postgresql.prisma")

run_sudo("mkdir -p /opt/aalawsng/frontend")
run_sudo("tar -xzf /tmp/frontend_update.tar.gz -C /opt/aalawsng/frontend")
run_sudo("rm -f /tmp/frontend_update.tar.gz")

# 5. Rebuild and restart backend
print("Rebuilding and restarting backend container on VPS...")
out, err = run_sudo("bash -c 'cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml build backend'")
print("Backend Build Output:", out[-400:], err[-200:])

out, err = run_sudo("bash -c 'cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml up -d --no-deps backend'")
print("Backend restart output:", out, err)

# 6. Rebuild and restart frontend
print("Rebuilding and restarting frontend container on VPS...")
out, err = run_sudo("bash -c 'cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml build frontend'")
print("Frontend Build Output:", out[-400:], err[-200:])

out, err = run_sudo("bash -c 'cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml up -d --no-deps frontend'")
print("Frontend restart output:", out, err)

# 7. Check containers
time.sleep(5)
out, err = run_sudo("docker ps")
print("Live Containers:\n", out)

# Clean up local temp files
try:
    os.remove(backend_tar)
    os.remove(frontend_tar)
except:
    pass

ssh.close()
print("Deployment completed successfully!")
