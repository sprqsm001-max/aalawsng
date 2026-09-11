import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')

js_code = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const allTokens = await prisma.refreshToken.findMany({
    include: { user: true }
  });
  console.log('Total refresh tokens in DB:', allTokens.length);
  for (const t of allTokens) {
    console.log(t.createdAt.toISOString(), t.userId, t.user?.email, t.user?.tier, t.token.slice(-15));
  }
  await prisma.$disconnect();
}
run();
"""

stdin, stdout, stderr = ssh.exec_command('docker exec -i aalawsng_backend_prod node')
stdin.write(js_code)
stdin.close()
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))
ssh.close()
