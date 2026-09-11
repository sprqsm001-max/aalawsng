import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')

js_code = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const refreshTokens = await prisma.refreshToken.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });
  console.log('Recent Refresh Tokens:');
  for (const rt of refreshTokens) {
    console.log(rt.createdAt.toISOString(), rt.userId, rt.user?.email, rt.user?.tier);
  }

  const users = await prisma.user.findMany({
    include: { staffProfile: true, clientProfile: true }
  });
  console.log('\\nAll Users in DB:');
  for (const u of users) {
    console.log(u.id, u.email, u.tier, 'staffProfile:', u.staffProfile?.role, 'clientProfile:', !!u.clientProfile);
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
