import paramiko

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')

    cmd = "docker logs aalawsng_backend_prod 2>&1 | grep '11/Sep/2026:14:'"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    logs = stdout.read().decode('utf-8', errors='replace')
    print("ALL LOGS IN 14:XX UTC:\n", logs)

    ssh.close()

if __name__ == '__main__':
    main()
