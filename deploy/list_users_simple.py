import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')

cmd = 'docker exec aalawsng_backend_prod node -e "const { PrismaClient } = require(\'@prisma/client\'); const prisma = new PrismaClient(); prisma.user.findMany().then(u => { console.log(JSON.stringify(u.map(x => ({ id: x.id, email: x.email, tier: x.tier })))); process.exit(0); });"'
stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))
ssh.close()
