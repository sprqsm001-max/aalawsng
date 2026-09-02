import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')
_, out, err = ssh.exec_command('echo VrrGnSSqskNyp | sudo -S docker logs --tail 60 aalawsng_backend_prod')
print(out.read().decode('utf-8', errors='replace'))
ssh.close()
