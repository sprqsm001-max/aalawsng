import paramiko

hostname = "145.239.78.148"
username = "ubuntu"
password = "os.getenv("VPS_PASS", "")"

print(f"Connecting to {username}@{hostname}...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(hostname, username=username, password=password, timeout=10)
    print("✅ SSH Connection Successful!")
    stdin, stdout, stderr = client.exec_command("uname -a; whoami; df -h /")
    print("Server output:")
    print(stdout.read().decode())
finally:
    client.close()
