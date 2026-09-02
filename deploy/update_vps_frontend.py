import os
import tarfile
import tempfile
import paramiko
import time

VPS_IP = "145.239.78.148"
VPS_USER = "ubuntu"
VPS_PASS = os.getenv("VPS_PASS", "VrrGnSSqskNyp")

print("Creating tar archive of frontend source code...")
temp_tar = tempfile.mktemp(suffix="_frontend.tar.gz")
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

with tarfile.open(temp_tar, "w:gz") as tar:
    for root, dirs, files in os.walk(base_dir):
        # Skip node_modules and .next
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        if ".next" in dirs:
            dirs.remove(".next")
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_dir)
            tar.add(full_path, arcname=rel_path)

print(f"Archive created: {temp_tar} ({os.path.getsize(temp_tar)} bytes)")

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

print("Uploading updated frontend files...")
sftp = ssh.open_sftp()
sftp.put(temp_tar, "/tmp/frontend_update.tar.gz")
sftp.close()

print("Extracting frontend on VPS...")
run_sudo("mkdir -p /opt/aalawsng/frontend")
run_sudo("tar -xzf /tmp/frontend_update.tar.gz -C /opt/aalawsng/frontend")
run_sudo("rm -f /tmp/frontend_update.tar.gz")

print("Rebuilding and restarting frontend Docker container on VPS...")
out, err = run_sudo("bash -c 'cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml build frontend'")
print("Build Output:", out[-500:], err[-300:])

out, err = run_sudo("bash -c 'cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml up -d --no-deps frontend'")
print("Container restart:", out, err)

time.sleep(3)
out, err = run_sudo("docker ps")
print("Docker PS:", out)

ssh.close()
os.remove(temp_tar)
print("Frontend Update Complete!")
