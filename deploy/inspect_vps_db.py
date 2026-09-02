import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')

cmd = """
docker exec -i aalawsng_backend_prod node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function run() {
  const types = await prisma.matterType.findMany();
  console.log("MATTER_TYPES:", JSON.stringify(types, null, 2));
  await prisma.$disconnect();
}
run();
'
"""

stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode())
print(stderr.read().decode())
ssh.close()
