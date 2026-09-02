import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('145.239.78.148', username='ubuntu', password='VrrGnSSqskNyp')

cmd = """
docker exec -i aalawsng_backend_prod node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  console.log("Seeding core client and matters...");
  
  // 1. Ensure Dr. Adeyemi client exists
  let client = await prisma.clientRecord.findFirst({
    where: {
      OR: [
        { lastName: { contains: "Adeyemi", mode: "insensitive" } },
        { companyName: { contains: "Adeyemi", mode: "insensitive" } },
      ]
    }
  });

  if (!client) {
    client = await prisma.clientRecord.create({
      data: {
        firstName: "Dr. Chukwuemeka",
        lastName: "Adeyemi-Levite",
        companyName: "Pneuma Havens / Adeyemi Global",
        email: "adeyemi@pneumahavens.com",
        phone: "+234 803 123 4567",
      }
    });
    console.log("Created client:", client.id);
  } else {
    // Update company name to include Pneuma Havens if not present
    client = await prisma.clientRecord.update({
      where: { id: client.id },
      data: {
        firstName: "Dr. Chukwuemeka",
        lastName: "Adeyemi-Levite",
        companyName: "Pneuma Havens / Adeyemi Global Holdings Ltd"
      }
    });
    console.log("Updated client:", client.id);
  }

  // 2. Get matter types
  const types = await prisma.matterType.findMany();
  const ipType = types.find(t => t.name.includes("Corporate") || t.name.includes("Commercial")) || types[0];
  const litType = types.find(t => t.name.includes("Litigation")) || types[0];

  // 3. Get lead attorney
  const leadStaff = await prisma.staffProfile.findFirst();

  // 4. Create MOSIBYL matter
  const m1 = await prisma.matter.upsert({
    where: { referenceNumber: "AAL-2026-MOSIBYL" },
    update: {},
    create: {
      referenceNumber: "AAL-2026-MOSIBYL",
      title: "Search Report MOSIBYL (CLASS 41)",
      description: "Trademark search report and intellectual property registration under Class 41",
      clientId: client.id,
      matterTypeId: ipType.id,
      leadAttorneyId: leadStaff?.id,
      status: "IN_PROGRESS",
    }
  });
  console.log("Matter 1:", m1.referenceNumber, m1.title);

  // 5. Create Shareholder Agreement matter
  const m2 = await prisma.matter.upsert({
    where: { referenceNumber: "AAL-2026-PNEUMA" },
    update: {},
    create: {
      referenceNumber: "AAL-2026-PNEUMA",
      title: "Review of Shareholder Agreement (Pneuma Havens)",
      description: "Legal drafting and comprehensive review of Shareholder Agreement and corporate governance terms",
      clientId: client.id,
      matterTypeId: ipType.id,
      leadAttorneyId: leadStaff?.id,
      status: "OPEN",
    }
  });
  console.log("Matter 2:", m2.referenceNumber, m2.title);

  // 6. Create CDPO matter
  const m3 = await prisma.matter.upsert({
    where: { referenceNumber: "AAL-2026-CDPO" },
    update: {},
    create: {
      referenceNumber: "AAL-2026-CDPO",
      title: "Engaging CDPOs & NDPR Compliance Audit",
      description: "Data Protection Officer engagement, compliance audit and regulatory filing under NDPR / NDPA 2023",
      clientId: client.id,
      matterTypeId: ipType.id,
      leadAttorneyId: leadStaff?.id,
      status: "OPEN",
    }
  });
  console.log("Matter 3:", m3.referenceNumber, m3.title);

  await prisma.$disconnect();
  console.log("Seeding complete successfully!");
}

run().catch(e => { console.error(e); process.exit(1); });
'
"""

stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode())
print(stderr.read().decode())
ssh.close()
