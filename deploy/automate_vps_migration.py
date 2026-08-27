import os
import sys
import tarfile
import time
import paramiko

# Set standard output to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

HOSTNAME = "145.239.78.148"
USERNAME = "ubuntu"
PASSWORD = "os.getenv("VPS_PASS", "")"
KEY_PATH = os.path.expanduser("~/.ssh/aalawsng")
REMOTE_DIR = "/opt/aalawsng"

def run_remote_cmd(client, cmd, sudo=False, password=PASSWORD):
    if sudo:
        cmd = f"echo '{password}' | sudo -S bash -c \"{cmd}\""
    print(f"--> [EXEC] {cmd[:120]}...")
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=True)
    
    output = ""
    while True:
        line = stdout.readline()
        if not line:
            break
        print("    " + line.strip())
        output += line
        
    exit_status = stdout.channel.recv_exit_status()
    if exit_status != 0:
        err = stderr.read().decode('utf-8', errors='replace')
        if err.strip():
            print(f"[WARN/ERROR exit {exit_status}]: {err}")
    return exit_status, output

def create_archive(tar_path):
    print("[1/5] Packaging application codebase...")
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    exclude_dirs = {
        'node_modules', '.next', '.git', 'dist', '.system_generated', '.tempmediaStorage', 'scratch'
    }
    
    def filter_func(tarinfo):
        for part in tarinfo.name.split('/'):
            if part in exclude_dirs or part.endswith('.log') or part.endswith('.db') or part.endswith('.db-journal') or part.endswith('.tar.gz'):
                return None
        return tarinfo

    with tarfile.open(tar_path, "w:gz") as tar:
        tar.add(base_dir, arcname="aalawsng", filter=filter_func)
    print(f"Archive created: {tar_path} ({os.path.getsize(tar_path) / (1024*1024):.2f} MB)")

def main():
    print("=" * 60)
    print("🚀 Starting Automated VPS Migration to OVH (145.239.78.148)")
    print("=" * 60)
    
    tar_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "aalawsng_deploy.tar.gz"))
    create_archive(tar_path)
    
    print("\n[2/5] Connecting to OVH Ubuntu VPS via SSH Key...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOSTNAME, username=USERNAME, key_filename=KEY_PATH, timeout=15)
    except Exception:
        client.connect(HOSTNAME, username=USERNAME, password=PASSWORD, timeout=15)
    print("Connected successfully!")
    
    # 1. Upload Archive via SFTP
    print("\n[3/5] Uploading codebase and configs to VPS via SFTP...")
    sftp = client.open_sftp()
    remote_tar = "/home/ubuntu/aalawsng.tar.gz"
    sftp.put(tar_path, remote_tar)
    
    nginx_local = os.path.abspath(os.path.join(os.path.dirname(__file__), "nginx.conf"))
    sftp.put(nginx_local, "/home/ubuntu/nginx.conf")
    sftp.close()
    print("Upload completed.")
    
    # 2. Extract Archive into /opt/aalawsng
    print("\n[4/5] Setting up /opt/aalawsng directory...")
    run_remote_cmd(client, f"mkdir -p {REMOTE_DIR} && chown -R ubuntu:ubuntu {REMOTE_DIR}", sudo=True)
    run_remote_cmd(client, f"tar -xzf {remote_tar} -C /tmp/ && cp -r /tmp/aalawsng/* {REMOTE_DIR}/ && rm -rf /tmp/aalawsng {remote_tar}")
    
    # 3. Run Provisioning & Docker Setup
    print("\n[5/5] Checking Docker, building containers, and configuring Nginx...")
    
    # Install Docker & buildx if needed
    run_remote_cmd(client, "apt-get update && apt-get install -y docker-buildx-plugin docker-compose-v2 nginx", sudo=True)
    run_remote_cmd(client, "usermod -aG docker ubuntu && systemctl enable --now docker", sudo=True)
    
    # Copy PostgreSQL schema to backend/prisma/schema.prisma
    run_remote_cmd(client, f"cp {REMOTE_DIR}/deploy/schema.postgresql.prisma {REMOTE_DIR}/backend/prisma/schema.prisma")
    
    # Stop existing containers if any and rebuild
    print("\n🐳 Building and launching Docker Compose stack (PostgreSQL 16, Backend, Frontend)...")
    run_remote_cmd(client, f"cd {REMOTE_DIR} && docker compose -f deploy/docker-compose.prod.yml down --remove-orphans 2>/dev/null || true", sudo=True)
    run_remote_cmd(client, f"cd {REMOTE_DIR} && docker compose -f deploy/docker-compose.prod.yml build --no-cache", sudo=True)
    run_remote_cmd(client, f"cd {REMOTE_DIR} && docker compose -f deploy/docker-compose.prod.yml up -d", sudo=True)
    
    # Wait for PostgreSQL container to become healthy
    print("\n⏳ Waiting 15 seconds for PostgreSQL initialization...")
    time.sleep(15)
    
    # Run Prisma db push and seed
    print("\n🌱 Applying Prisma PostgreSQL schema and seeding database...")
    run_remote_cmd(client, f"cd {REMOTE_DIR} && docker compose -f deploy/docker-compose.prod.yml exec -T backend npx prisma db push --accept-data-loss || docker compose -f deploy/docker-compose.prod.yml run --rm backend npx prisma db push --accept-data-loss", sudo=True)
    run_remote_cmd(client, f"cd {REMOTE_DIR} && docker compose -f deploy/docker-compose.prod.yml exec -T backend node dist/lib/seed.js || docker compose -f deploy/docker-compose.prod.yml run --rm backend node dist/lib/seed.js", sudo=True)
    run_remote_cmd(client, f"cd {REMOTE_DIR} && docker compose -f deploy/docker-compose.prod.yml restart backend", sudo=True)
    
    # Setup Nginx configuration
    print("\n🌐 Configuring Nginx Reverse Proxy on Port 80...")
    run_remote_cmd(client, "cp /home/ubuntu/nginx.conf /etc/nginx/sites-available/aalawsng && rm -f /home/ubuntu/nginx.conf", sudo=True)
    run_remote_cmd(client, "ln -sf /etc/nginx/sites-available/aalawsng /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default", sudo=True)
    run_remote_cmd(client, "nginx -t && systemctl reload nginx", sudo=True)
    
    # Check containers status
    print("\n--- Docker Containers Status ---")
    run_remote_cmd(client, "docker ps", sudo=True)
    
    # Test HTTP endpoint
    print("\n--- Testing Live HTTP Endpoint ---")
    run_remote_cmd(client, "curl -I http://localhost/")
    run_remote_cmd(client, "curl -s http://localhost/health")
    
    client.close()
    
    # Remove local tar
    if os.path.exists(tar_path):
        os.remove(tar_path)
        
    print("\n" + "=" * 60)
    print("🎉 DEPLOYMENT TO OVH VPS COMPLETED SUCCESSFULLY!")
    print("🌐 AALAWSNG Law Firm System is LIVE on: http://145.239.78.148")
    print("=" * 60)

if __name__ == "__main__":
    main()
