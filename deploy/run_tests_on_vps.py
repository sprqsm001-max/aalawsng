import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')

# SFTP upload test suite to VPS
sftp = ssh.open_sftp()
sftp.put('deploy/comprehensive_test_suite.py', '/tmp/comprehensive_test_suite.py')
sftp.close()

# Run the test suite on the VPS
stdin, stdout, stderr = ssh.exec_command('python3 /tmp/comprehensive_test_suite.py')
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')

print("=== VPS TEST RUN STDOUT ===")
print(out)
if err.strip():
    print("=== VPS TEST RUN STDERR ===")
    print(err)

ssh.close()
