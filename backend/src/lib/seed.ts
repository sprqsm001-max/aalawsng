import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding AALAWSNG database (Nigerian Legal Practice Framework)...');

  // 1. Create Admin / Principal Partner (Adeola Kolawole)
  const adminHash = await bcrypt.hash('Admin@2024!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aalawsng.com' },
    update: {},
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
  console.log('✅ Principal Partner (Admin) seeded:', admin.email);

  // 2. Create Staff member (Senior Associate & Paralegal)
  const staffHash = await bcrypt.hash('Staff@2024!', 12);
  const paralegal = await prisma.user.upsert({
    where: { email: 'paralegal@aalawsng.com' },
    update: {},
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

  const associate = await prisma.user.upsert({
    where: { email: 'associate@aalawsng.com' },
    update: {},
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
  console.log('✅ Staff members seeded (Associate & Paralegal)');

  // 3. Create Nigerian Law Practice Matter Types
  const matterTypes = [
    { name: 'Litigation & Dispute Resolution', description: 'High Court, Court of Appeal, and Supreme Court proceedings' },
    { name: 'Property & Real Estate Conveyancing', description: 'Title perfection, Governor Consent, deed of assignment, land documentation' },
    { name: 'Corporate & Commercial Law', description: 'CAC incorporation, mergers, regulatory compliance, joint ventures' },
    { name: 'Family & Matrimonial Causes', description: 'Divorce, child custody, matrimonial settlement' },
    { name: 'Estate Administration & Probate', description: 'Letters of administration, wills, executor trust management' },
    { name: 'Employment & Labour Relations', description: 'National Industrial Court proceedings, workplace contracts' },
  ];

  const createdMatterTypes: any = {};
  for (const mt of matterTypes) {
    const res = await prisma.matterType.upsert({
      where: { name: mt.name },
      update: {},
      create: mt,
    });
    createdMatterTypes[mt.name] = res;
  }
  console.log('✅ Practice area matter types seeded');

  // 4. Create Nigerian Legal Accounts Configuration (LPAR 1964 & RPC 2023)
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
  console.log('✅ Nigerian Legal Practice Accounts Configuration seeded (LPAR 1964 & RPC 2023)');

  // 5. Default RBAC Permissions
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
  console.log('✅ RBAC permissions matrix seeded');

  // 6. Create Demo Clients with AML/CFT verification
  const clientHash = await bcrypt.hash('Client@2024!', 12);
  const clientUser = await prisma.user.upsert({
    where: { email: 'client@demo.com' },
    update: {},
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

  const clientProfile = clientUser.clientProfile!;

  // 7. Seed Multi-Currency Client Account Ledgers (LPAR 1964)
  // NGN Client Funds Ledger
  const ngnLedger = await prisma.trustLedgerAccount.upsert({
    where: {
      clientId_currency_accountCategory: {
        clientId: clientProfile.id,
        currency: 'NGN',
        accountCategory: 'CLIENT_FUNDS',
      },
    },
    update: {},
    create: {
      clientId: clientProfile.id,
      currency: 'NGN',
      accountCategory: 'CLIENT_FUNDS',
      balance: 3500000.00,
      bankAccountNumber: '0123456789 (Access Bank Client Account)',
      bankName: 'Access Bank Plc',
    },
  });

  // USD Client Funds Ledger
  const usdLedger = await prisma.trustLedgerAccount.upsert({
    where: {
      clientId_currency_accountCategory: {
        clientId: clientProfile.id,
        currency: 'USD',
        accountCategory: 'CLIENT_FUNDS',
      },
    },
    update: {},
    create: {
      clientId: clientProfile.id,
      currency: 'USD',
      accountCategory: 'CLIENT_FUNDS',
      balance: 15000.00,
      bankAccountNumber: '5432109876 (Zenith Bank Domiciliary Client Account)',
      bankName: 'Zenith Bank Plc',
    },
  });

  // Journal entries for initial deposits
  await prisma.trustJournalEntry.create({
    data: {
      ledgerId: ngnLedger.id,
      type: 'RECEIPT_CLIENT_FUNDS',
      amount: 3500000.00,
      currency: 'NGN',
      balanceBefore: 0,
      balanceAfter: 3500000.00,
      description: 'Retainer deposit for Property Acquisition in Lekki Scheme 1',
      referenceType: 'MANUAL',
      lparRuleReference: 'LPAR 1964 Rule 3 - Receipt of Client Money',
      initiatedById: admin.id,
    },
  });

  await prisma.trustJournalEntry.create({
    data: {
      ledgerId: usdLedger.id,
      type: 'RECEIPT_CLIENT_FUNDS',
      amount: 15000.00,
      currency: 'USD',
      balanceBefore: 0,
      balanceAfter: 15000.00,
      description: 'Offshore commercial contract retainer',
      referenceType: 'MANUAL',
      lparRuleReference: 'LPAR 1964 Rule 3 - Receipt of Client Money',
      initiatedById: admin.id,
    },
  });
  console.log('✅ Multi-currency Client Account Ledgers seeded (₦3.5M NGN & $15k USD)');

  // 8. Create Sample Matters
  const matter1 = await prisma.matter.upsert({
    where: { referenceNumber: 'AAL/2024/001' },
    update: {},
    create: {
      referenceNumber: 'AAL/2024/001',
      title: 'Adeyemi Global Holdings vs. Lagos State Lands Bureau',
      description: 'Litigation concerning perfection of Governor Consent on 5,000 sqm commercial land in Lekki Phase 1.',
      clientId: clientProfile.id,
      matterTypeId: createdMatterTypes['Litigation & Dispute Resolution']?.id || '',
      leadAttorneyId: admin.staffProfile?.id,
      status: 'OPEN',
      currency: 'NGN',
      courtJurisdiction: 'High Court of Lagos State, Tafawa Balewa Square (TBS) Judicial Division',
      courtCaseNumber: 'Suit No. LD/4092/2024',
      opposingPartyName: 'Lagos State Lands Bureau & Attorney-General of Lagos State',
      opposingCounselName: 'Ministry of Justice Legal Directorate',
      budgetAmount: 10000000.00,
      estimatedHours: 120,
    },
  });

  const matter2 = await prisma.matter.upsert({
    where: { referenceNumber: 'AAL/2024/002' },
    update: {},
    create: {
      referenceNumber: 'AAL/2024/002',
      title: 'Acquisition & Conveyancing of Prime Ikoyi Commercial Property',
      description: 'Title investigation, deed of assignment drafting, stamping, and registration.',
      clientId: clientProfile.id,
      matterTypeId: createdMatterTypes['Property & Real Estate Conveyancing']?.id || '',
      leadAttorneyId: admin.staffProfile?.id,
      status: 'IN_PROGRESS',
      currency: 'NGN',
      budgetAmount: 15000000.00,
    },
  });

  // Assign staff to matter
  if (paralegal.staffProfile) {
    await prisma.matterAssignment.upsert({
      where: { matterId_staffId: { matterId: matter1.id, staffId: paralegal.staffProfile.id } },
      update: {},
      create: { matterId: matter1.id, staffId: paralegal.staffProfile.id, isPrimary: false },
    });
  }
  console.log('✅ Sample Matters seeded (AAL/2024/001 & AAL/2024/002)');

  // 9. Create Sample Invoices (1 Operating Fee Invoice, 1 Retainer Deposit Invoice)
  const invoice1 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2024-001' },
    update: {},
    create: {
      invoiceNumber: 'INV-2024-001',
      matterId: matter1.id,
      clientId: clientProfile.id,
      currency: 'NGN',
      subtotal: 1500000.00,
      taxAmount: 112500.00, // 7.5% VAT (FIRS)
      totalAmount: 1612500.00,
      amountPaid: 0,
      status: 'SENT',
      paymentDestination: 'OFFICE_ACCOUNT',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      notes: 'Professional legal fees for filing originating processes and preliminary objections.',
      createdById: admin.id,
      lineItems: {
        create: [
          { description: 'Drafting Statement of Claim and Accompanying Witness Statements', quantity: 1, unitPrice: 1000000.00, amount: 1000000.00, type: 'FLAT_FEE' },
          { description: 'Filing fees and court process service disbursements', quantity: 1, unitPrice: 500000.00, amount: 500000.00, type: 'DISBURSEMENT' },
        ],
      },
    },
  });

  const invoice2 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2024-002' },
    update: {},
    create: {
      invoiceNumber: 'INV-2024-002',
      matterId: matter2.id,
      clientId: clientProfile.id,
      currency: 'USD',
      subtotal: 5000.00,
      taxAmount: 0,
      totalAmount: 5000.00,
      amountPaid: 0,
      status: 'SENT',
      paymentDestination: 'CLIENT_ACCOUNT',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: 'Initial client trust retainer deposit for Ikoyi property acquisition.',
      createdById: admin.id,
      lineItems: {
        create: [
          { description: 'Client Account Retainer Deposit (Property Investigation Float)', quantity: 1, unitPrice: 5000.00, amount: 5000.00, type: 'DISBURSEMENT' },
        ],
      },
    },
  });
  console.log('✅ Sample Invoices seeded (INV-2024-001 NGN & INV-2024-002 USD)');

  // 10. Create Initial Three-Way Reconciliation Certificate
  await prisma.trustReconciliation.create({
    data: {
      accountCategory: 'CLIENT_FUNDS',
      currency: 'NGN',
      bankBalance: 3500000.00,
      ledgerSum: 3500000.00,
      systemTotal: 3500000.00,
      isMatched: true,
      discrepancyAmount: 0,
      reconciledById: admin.id,
      notes: 'Monthly three-way client account reconciliation certificate per LPAR 1964.',
    },
  });
  console.log('✅ Initial Three-Way Reconciliation Certificate seeded');

  console.log('\n🏛️  AALAWSNG Nigerian Law Practice Database Seed Complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Principal Partner: admin@aalawsng.com  / Admin@2024! (ADMIN)');
  console.log('Associate:         associate@aalawsng.com / Staff@2024! (STAFF)');
  console.log('Paralegal:         paralegal@aalawsng.com / Staff@2024! (STAFF)');
  console.log('Client Portal:     client@demo.com     / Client@2024! (CLIENT)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
