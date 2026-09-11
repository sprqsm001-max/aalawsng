import paramiko

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')

    cmd = 'docker exec aalawsng_postgres_prod psql -U aalawsng_user -d aalawsng_db -c "SELECT id, email, tier, status FROM \\"User\\";"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("USERS:\n", stdout.read().decode('utf-8', errors='replace'))

    # Also let's check all access logs around 14:20 - 14:35 UTC today
    cmd_logs = 'docker logs --tail 300 aalawsng_backend_prod'
    stdin, stdout, stderr = ssh.exec_command(cmd_logs)
    logs = stdout.read().decode('utf-8', errors='replace')
    
    # filter for 403 or 401 or error
    print("--- 403 / 401 LOGS ---")
    for line in logs.splitlines():
        if ' 403 ' in line or ' 401 ' in line or ' 500 ' in line or 'error' in line.lower() or 'clients' in line:
            print(line)

    ssh.close()

if __name__ == '__main__':
    main()
