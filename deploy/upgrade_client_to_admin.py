import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')

js_code = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const user = await prisma.user.findUnique({
    where: { email: 'client@demo.com' },
    include: { staffProfile: true }
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { tier: 'ADMIN' }
    });
    console.log('Updated client@demo.com tier to ADMIN');

    if (!user.staffProfile) {
      await prisma.staffProfile.create({
        data: {
          userId: user.id,
          firstName: 'Chukwuemeka',
          lastName: 'Adeyemi',
          role: 'ATTORNEY',
          phone: '+2348031234567',
          hourlyRate: 50000.0,
          currency: 'NGN'
        }
      });
      console.log('Created staffProfile for client@demo.com');
    }
  }

  const updatedUsers = await prisma.user.findMany({
    select: { id: true, email: true, tier: true, staffProfile: { select: { role: true } } }
  });
  console.log('ALL USERS NOW:');
  console.log(JSON.stringify(updatedUsers, null, 2));

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
