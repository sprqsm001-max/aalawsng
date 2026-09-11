import paramiko

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')

    cmd = """docker exec aalawsng_postgres_prod psql -U aalawsng_user -d aalawsng_db -c 'SELECT "createdAt", "userId", action, "entityType" FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 30;'"""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("LATEST AUDIT LOGS:\n", stdout.read().decode('utf-8', errors='replace'))

    ssh.close()

if __name__ == '__main__':
    main()
