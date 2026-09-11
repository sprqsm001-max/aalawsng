import paramiko

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')

    cmd = "echo 'VrrGnSSqskNyp' | sudo -S bash -c 'cd /opt/aalawsng && docker compose -f deploy/docker-compose.prod.yml build --no-cache frontend && docker compose -f deploy/docker-compose.prod.yml up -d --no-deps frontend'"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:\n", stdout.read().decode('utf-8', errors='replace'))
    print("STDERR:\n", stderr.read().decode('utf-8', errors='replace'))

    stdin, stdout, stderr = ssh.exec_command("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'")
    print(stdout.read().decode('utf-8', errors='replace'))
    ssh.close()

if __name__ == '__main__':
    main()
