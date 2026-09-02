import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')

cmd = """
docker exec -i aalawsng_backend_prod node -e '
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function run() {
  const users = await p.user.findMany({ select: { id: true, email: true, tier: true } });
  console.log("USERS:", JSON.stringify(users, null, 2));
  await p.$disconnect();
}
run();
'
"""
stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode())
print(stderr.read().decode())
ssh.close()
