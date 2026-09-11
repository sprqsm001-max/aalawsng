import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')

js_code = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const lastLogs = await prisma.auditLog.findMany({
    take: 15,
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });
  console.log('LAST 15 AUDIT LOGS:');
  for (const l of lastLogs) {
    console.log(l.createdAt.toISOString(), l.action, l.module, l.user?.email, l.user?.tier);
  }

  const clientUser = await prisma.user.findUnique({
    where: { email: 'client@demo.com' },
    include: { staffProfile: true, clientProfile: true }
  });
  console.log('\\nclient@demo.com details:', JSON.stringify(clientUser, null, 2));

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
