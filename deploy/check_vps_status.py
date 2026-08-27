import paramiko
import sys

HOSTNAME = "145.239.78.148"
USERNAME = "ubuntu"
KEY_PATH = r"C:\Users\user\.ssh\aalawsng"
PASSWORD = "os.getenv("VPS_PASS", "")"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOSTNAME, username=USERNAME, key_filename=KEY_PATH)

def exec_cmd(cmd):
    full_cmd = f"echo '{PASSWORD}' | sudo -S bash -c \"{cmd}\""
    stdin, stdout, stderr = client.exec_command(full_cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out, err

print("=== DOCKER PS ===")
out, _ = exec_cmd("docker ps -a")
print(out)

print("=== BACKEND LOGS (STDOUT & STDERR) ===")
out, err = exec_cmd("docker logs aalawsng_backend_prod")
print((out + "\n" + err).encode('ascii', errors='replace').decode('ascii'))

print("=== RUNNING DB PUSH FROM LOCAL / SERVER ===")
out, err = exec_cmd("cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml run --rm backend npx prisma db push --accept-data-loss")
print((out + "\n" + err).encode('ascii', errors='replace').decode('ascii'))

print("=== RUNNING SEED ===")
out, err = exec_cmd("cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml run --rm backend npx ts-node src/lib/seed.ts")
print((out + "\n" + err).encode('ascii', errors='replace').decode('ascii'))

print("=== RESTARTING BACKEND CONTAINER ===")
out, err = exec_cmd("cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml restart backend")
print((out + "\n" + err).encode('ascii', errors='replace').decode('ascii'))

print("=== DOCKER PS AFTER RESTART ===")
out, _ = exec_cmd("docker ps")
print(out.encode('ascii', errors='replace').decode('ascii'))
