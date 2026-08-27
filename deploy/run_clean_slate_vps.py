import os
import tarfile
import tempfile
import paramiko
import time

VPS_IP = "145.239.78.148"
VPS_USER = "ubuntu"
VPS_PASS = "os.getenv("VPS_PASS", "")"

print("1. Creating tar archives of backend and frontend...")
backend_tar = tempfile.mktemp(suffix="_backend.tar.gz")
frontend_tar = tempfile.mktemp(suffix="_frontend.tar.gz")

base_backend = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
base_frontend = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

with tarfile.open(backend_tar, "w:gz") as tar:
    for root, dirs, files in os.walk(base_backend):
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        if "dist" in dirs:
            dirs.remove("dist")
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_backend)
            tar.add(full_path, arcname=rel_path)

with tarfile.open(frontend_tar, "w:gz") as tar:
    for root, dirs, files in os.walk(base_frontend):
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        if ".next" in dirs:
            dirs.remove(".next")
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_frontend)
            tar.add(full_path, arcname=rel_path)

print("Connecting to VPS...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=30)
print("Connected!")

def run_sudo(cmd):
    full_cmd = f"echo '{VPS_PASS}' | sudo -S {cmd}"
    stdin, stdout, stderr = ssh.exec_command(full_cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    return out, err

print("2. Uploading code to VPS...")
sftp = ssh.open_sftp()
sftp.put(backend_tar, "/tmp/backend_update.tar.gz")
sftp.put(frontend_tar, "/tmp/frontend_update.tar.gz")
sftp.close()

run_sudo("mkdir -p /opt/aalawsng/backend /opt/aalawsng/frontend")
run_sudo("tar -xzf /tmp/backend_update.tar.gz -C /opt/aalawsng/backend")
run_sudo("tar -xzf /tmp/frontend_update.tar.gz -C /opt/aalawsng/frontend")
run_sudo("rm -f /tmp/backend_update.tar.gz /tmp/frontend_update.tar.gz")

# Crucial: Ensure PostgreSQL schema is used for production
run_sudo("cp /opt/aalawsng/deploy/schema.postgresql.prisma /opt/aalawsng/backend/prisma/schema.prisma")

print("3. Building updated Docker images on VPS...")
out, err = run_sudo("bash -c 'cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml build'")
print("Build finished.")

print("4. Restarting containers...")
out, err = run_sudo("bash -c 'cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml up -d'")

print("5. Syncing database schema & running Clean Slate Seed...")
time.sleep(5)
out, err = run_sudo("bash -c 'cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml exec -T backend npx prisma db push --skip-generate'")
print("DB Push result:", out.encode('ascii', 'ignore').decode('ascii'))

out, err = run_sudo("bash -c 'cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml exec -T backend node dist/lib/clean_seed.js'")
print("Clean Seed Output:", out.encode('ascii', 'ignore').decode('ascii'))

time.sleep(2)
out, err = run_sudo("docker ps")
print("Containers:\n", out.encode('ascii', 'ignore').decode('ascii'))

ssh.close()
os.remove(backend_tar)
os.remove(frontend_tar)
print("Clean production deployment complete!")
