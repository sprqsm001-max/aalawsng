import paramiko
import sys

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')

    cmd = '''
    docker exec aalawsng_postgres_prod psql -U aalawsng_user -d aalawsng_db -c "SELECT id, email, role, tier, status FROM \\"User\\" WHERE email = 'paralegal@aalawsng.com';"
    docker exec aalawsng_postgres_prod psql -U aalawsng_user -d aalawsng_db -c "SELECT * FROM \\"StaffProfile\\" WHERE \\"userId\\" = (SELECT id FROM \\"User\\" WHERE email = 'paralegal@aalawsng.com');"
    '''
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print("STDOUT:\n", out)
    if err:
        print("STDERR:\n", err)

    # Check recent backend logs
    log_cmd = 'docker logs --tail 100 aalawsng_backend_prod'
    stdin, stdout, stderr = ssh.exec_command(log_cmd)
    backend_logs = stdout.read().decode('utf-8', errors='replace')
    print("RECENT BACKEND LOGS (last 2000 chars):\n", backend_logs[-2000:])
    
    ssh.close()

if __name__ == '__main__':
    main()
