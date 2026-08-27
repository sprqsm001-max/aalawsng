import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

async function cleanSeed() {
  console.log('🧹 Purging all sample/mock data from AALAWSNG database...');

  // 1. Delete all transactional, case, and document data
  await prisma.auditLog.deleteMany({});
  await prisma.clientContactHistory.deleteMany({});
  await prisma.conflictCheck.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.calendarEvent.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.timeEntry.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.invoiceLineItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.trustJournalEntry.deleteMany({});
  await prisma.trustReconciliation.deleteMany({});
  await prisma.trustLedgerAccount.deleteMany({});
  await prisma.matterAssignment.deleteMany({});
  await prisma.matter.deleteMany({});
  await prisma.internalMessage.deleteMany({});
  await prisma.clientMessage.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.leaveRequest.deleteMany({});

  console.log('✅ Mock matters, invoices, time entries, documents, and journals purged.');

  // 2. Ensure Core User Accounts are intact
  const adminHash = await bcrypt.hash('Admin@2024!', 12);
  const staffHash = await bcrypt.hash('Staff@2024!', 12);
  const clientHash = await bcrypt.hash('Client@2024!', 12);

  // Principal Partner / Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aalawsng.com' },
    update: { passwordHash: adminHash, tier: 'ADMIN' },
    create: {
      email: 'admin@aalawsng.com',
      passwordHash: adminHash,
      tier: 'ADMIN',
      staffProfile: {
        create: {
          firstName: 'Adeola',
          lastName: 'Kolawole',
          role: 'ATTORNEY',
          phone: '+2348000000001',
          hourlyRate: 75000,
          currency: 'NGN',
        },
      },
    },
    include: { staffProfile: true },
  });

  // Senior Associate
  await prisma.user.upsert({
    where: { email: 'associate@aalawsng.com' },
    update: { passwordHash: staffHash, tier: 'STAFF' },
    create: {
      email: 'associate@aalawsng.com',
      passwordHash: staffHash,
      tier: 'STAFF',
      staffProfile: {
        create: {
          firstName: 'Folashade',
          lastName: 'Balogun',
          role: 'ASSOCIATE',
          phone: '+2348000000003',
          hourlyRate: 45000,
          currency: 'NGN',
        },
      },
    },
    include: { staffProfile: true },
  });

  // Paralegal
  await prisma.user.upsert({
    where: { email: 'paralegal@aalawsng.com' },
    update: { passwordHash: staffHash, tier: 'STAFF' },
    create: {
      email: 'paralegal@aalawsng.com',
      passwordHash: staffHash,
      tier: 'STAFF',
      staffProfile: {
        create: {
          firstName: 'Emeka',
          lastName: 'Okonkwo',
          role: 'PARALEGAL',
          phone: '+2348000000002',
          hourlyRate: 25000,
          currency: 'NGN',
        },
      },
    },
    include: { staffProfile: true },
  });

  // Client Portal Account
  await prisma.user.upsert({
    where: { email: 'client@demo.com' },
    update: { passwordHash: clientHash, tier: 'CLIENT' },
    create: {
      email: 'client@demo.com',
      passwordHash: clientHash,
      tier: 'CLIENT',
      clientProfile: {
        create: {
          firstName: 'Chukwuemeka',
          lastName: 'Adeyemi',
          companyName: 'Adeyemi Global Holdings Ltd',
          email: 'client@demo.com',
          phone: '+2348031234567',
          address: 'Plot 14, Victoria Island, Lagos, Nigeria',
          kycStatus: 'VERIFIED',
          idType: 'NIN',
          idNumber: '12345678901',
          rcNumber: 'RC-1489201',
          tin: '23456789-0001',
          pepStatus: false,
          riskRating: 'LOW',
        },
      },
    },
    include: { clientProfile: true },
  });

  console.log('✅ Core 4 System Test Accounts Verified:');
  console.log('   - Admin:      admin@aalawsng.com  / Admin@2024!');
  console.log('   - Associate:  associate@aalawsng.com / Staff@2024!');
  console.log('   - Paralegal:  paralegal@aalawsng.com / Staff@2024!');
  console.log('   - Client:     client@demo.com     / Client@2024!');

  // 3. Ensure Nigerian Law Practice Matter Types
  const matterTypes = [
    { name: 'Litigation & Dispute Resolution', description: 'High Court, Court of Appeal, and Supreme Court proceedings' },
    { name: 'Property & Real Estate Conveyancing', description: 'Title perfection, Governor Consent, deed of assignment, land documentation' },
    { name: 'Corporate & Commercial Law', description: 'CAC incorporation, mergers, regulatory compliance, joint ventures' },
    { name: 'Family & Matrimonial Causes', description: 'Divorce, child custody, matrimonial settlement' },
    { name: 'Estate Administration & Probate', description: 'Letters of administration, wills, executor trust management' },
    { name: 'Employment & Labour Relations', description: 'National Industrial Court proceedings, workplace contracts' },
  ];

  for (const mt of matterTypes) {
    await prisma.matterType.upsert({
      where: { name: mt.name },
      update: {},
      create: mt,
    });
  }
  console.log('✅ Practice area matter types intact');

  // 4. Ensure Nigerian Legal Accounts Configuration (LPAR 1964 & RPC 2023)
  await prisma.trustJurisdictionConfig.upsert({
    where: { id: 'default-nba-nigeria' },
    update: {
      governingRules: "Legal Practitioners' Accounts Rules 1964 & Rules of Professional Conduct 2023 (RPC 2023)",
      amlThresholdNgn: 5000000,
      amlThresholdUsd: 10000,
      notes: "Strict segregation of Client Funds (LPAR 1964), Firm Office Funds, and Trust Funds (RPC 2023 Rule 23). Fee netting prohibited on client accounts.",
    },
    create: {
      id: 'default-nba-nigeria',
      jurisdiction: 'NBA_LAGOS',
      governingRules: "Legal Practitioners' Accounts Rules 1964 & Rules of Professional Conduct 2023 (RPC 2023)",
      amlThresholdNgn: 5000000,
      amlThresholdUsd: 10000,
      interestHandling: 'CLIENT',
      reportingFrequency: 'MONTHLY',
      requiresThreeWayRecon: true,
      requirePartnerAuthorization: true,
      notes: "Strict segregation of Client Funds (LPAR 1964), Firm Office Funds, and Trust Funds (RPC 2023 Rule 23). Fee netting prohibited on client accounts.",
    },
  });
  console.log('✅ Nigerian Legal Practice Accounts Configuration intact');

  // 5. Default RBAC Permissions Matrix
  const modules = ['M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12','M13','M14','M15','M16','M17','M18','M19','M20'];
  const staffRoles: any[] = ['ATTORNEY', 'PARALEGAL', 'BILLING_STAFF', 'ADMIN_STAFF', 'ASSOCIATE'];

  for (const role of staffRoles) {
    for (const mod of modules) {
      const isFinancial = ['M06','M07','M08','M09','M10'].includes(mod);
      const isBillingRole = role === 'BILLING_STAFF';
      const isAdmin = role === 'ADMIN_STAFF';

      await prisma.rolePermission.upsert({
        where: { role_module: { role, module: mod } },
        update: {},
        create: {
          role,
          module: mod,
          canRead: true,
          canWrite: isAdmin || (isBillingRole && isFinancial) || (!isFinancial && !['M19','M20'].includes(mod)),
          canAdmin: role === 'ATTORNEY',
        },
      });
    }
  }
  console.log('✅ RBAC permissions matrix intact');

  console.log('\n🏛️  AALAWSNG Clean Production Slate Ready! 0 mock matters/invoices remain.\n');
}

cleanSeed()
  .catch((e) => {
    console.error('Clean seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
