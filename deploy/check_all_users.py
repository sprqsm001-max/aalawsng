import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')

js_code = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      tier: true,
      isActive: true,
      staffProfile: { select: { role: true, firstName: true, lastName: true } },
      clientProfile: { select: { firstName: true, lastName: true } }
    }
  });
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}
run();
"""

stdin, stdout, stderr = ssh.exec_command("docker exec -i aalawsng_backend_prod node")
stdin.write(js_code)
stdin.close()
print("STDOUT:")
print(stdout.read().decode('utf-8'))
print("STDERR:")
print(stderr.read().decode('utf-8'))
ssh.close()
