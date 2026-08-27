# AALAWSNG — Comprehensive 20-Module Practice Management Guide

**Adeola Kolawole & Associates — Integrated Legal Practice & Client Portal Platform**  
**Live Production URL:** [**https://portal.aalawsng.com**](https://portal.aalawsng.com)

---

## 🏛️ System Overview & Regulatory Framework

AALAWSNG is designed in strict compliance with the **Nigerian Legal Practitioners Accounts Rules (LPAR 1964)**, **Rules of Professional Conduct (RPC 2023 Rules 10 & 23)**, **SCUML / Money Laundering (Prevention and Prohibition) Act 2022**, and **FIRS 7.5% Value Added Tax** requirements.

---

## 📑 20-Module Practice Reference Guide

### 1. M01: Matter / Case Management (`/matters`)
- Create and manage cases across 6 practice areas: *Litigation, Property Conveyancing, Corporate/Commercial, Family/Matrimonial, Estate/Probate, Employment/Labour*.
- Assign Lead Counsel, Court Jurisdiction (e.g. High Court of Lagos State, Court of Appeal, Supreme Court), Suit Numbers, and Opposing Counsel.
- Custom field extensible data structure for practice-area specific metadata without schema migrations.

### 2. M02: Client Management (CRM) & KYC Intake (`/clients`)
- Comprehensive intake capturing full names, RC/CAC numbers, NIN, Tax Identification Numbers (TIN), and Politically Exposed Person (PEP) declarations.
- Direct feed into the automated conflict check screening engine.

### 3. M03: Calendar, Court Hearings & Hard-Deadline Escalation (`/calendar`)
- Court fixture tracking, motion filing deadlines, statute of limitation milestones, and client consultations.
- **Safety-Critical Escalation Alerts**: Visual urgency badges (🔴 Critical <24h, 🟠 High <72h, 🟡 Standard) with automated notification dispatch to lead counsel.

### 4. M04: Document Management & Visibility Guards (`/documents`)
- Multi-tier document repository with automatic SHA-256 integrity hashing and UUID file obfuscation.
- **Security-Enforced Visibility Flag**: Documents are categorized as `INTERNAL_ONLY`, `CLIENT_VISIBLE`, or `CONFIDENTIAL`. Client portal users are strictly restricted server-side (HTTP 403) from retrieving internal research or privileged attorney notes.

### 5. M05: Task & Workflow Management (`/tasks`)
- Matter-linked task management with Kanban and List views.
- Pre-configured practice-area checklist templates (e.g., *Pre-Action Protocol, Perfection of Title at Land Registry, CAC Company Incorporation*).
- Priority scoring, sub-tasks, and due-date tracking.

### 6. M06: Time Tracking & Billable Hours (`/time`)
- Real-time time recording against specific matters and fee-earners.
- Multi-currency support (NGN, USD, GBP, EUR) with fee-earner specific hourly rates (e.g., Principal Partner: ₦150,000/hr, Associate: ₦50,000/hr).

### 7. M07: Invoicing & Legal Bills of Costs (`/invoices`)
- Automatically pulls unbilled time entries and disbursements.
- Calculates Nigerian 7.5% FIRS VAT with automatic withholding tax adjustments.
- Generates itemized legal Bills of Costs with embedded **Paystack instant payment links**.

### 8. M08: Trust Accounting & 3-Way Reconciliation (`/trust`) — *LPAR 1964 & RPC 23*
- **Strict Separation of Funds**:
  - **Client Account (Trust Ledger)**: Retainers, settlement funds, conveyancing floats.
  - **Office Account (Operating Ledger)**: Earned professional fees and VAT.
- **Fee Absorption Rule**: Paystack integration absorbs 100% of processing charges (`bearer: 'account'`) so client trust balances are never eroded.
- **Monthly 3-Way Reconciliation**: Generates an automated cryptographic audit certificate verifying: *Bank Balance = Sum of Client Sub-Ledgers = General System Total*.

### 9. M09: Expense & Disbursement Tracking (`/expenses`)
- Standalone matter-linked expense ledger for filing fees, stamp duties, CAC filing costs, search fees, and travel expenses.
- Supports receipt attachments and 1-click conversion to invoice disbursements.

### 10. M10: Executive Financial Dashboard (`/dashboard`)
- Real-time practice KPIs: Total active litigation matters, monthly billed revenue, client trust balances, pending conflict flags, and fee-earner utilization.

### 11. M11: Staff Profiles & Fee-Earner Management (`/staff`)
- Profile records capturing Bar Enrollment Numbers, NBA Branch affiliations, role designations, and custom hourly billing rates.

### 12. M12: Firm-Wide Workload & Capacity Tracking (`/staff` & `/analytics`)
- Executive cross-matter capacity matrix displaying active case distribution, open task volume, billable targets vs. actuals, and attorney utilization percentages.

### 13. M13: Basic HR & Leave Management (`/hr`)
- Fee-earner and support staff leave requests, annual PTO tracking, and Principal Partner approval workflows.

### 14. M14: Client Portal & Pleadings Vault (`/portal`)
- Secure, tokenized client login providing real-time case progress tracking, access to `CLIENT_VISIBLE` court filings, invoice review, and direct Paystack settlement.

### 15. M15: Internal Staff-to-Staff Messaging (`/messages`)
- **Architecturally Isolated**: Completely separate schema model (`InternalMessage`), endpoint (`/api/v1/messages/internal`), and UI (`/messages`).
- Restricted strictly to staff and partners for confidential litigation strategy discussions.

### 16. M16: Client-Lawyer Encrypted Messaging (`/client-messages`)
- Direct, authenticated communication channel between clients and their assigned legal team, eliminating the security risks of unencrypted consumer email.

### 17. M17: Reporting & Analytics (`/analytics`)
- Firm-wide analytics dashboard visualizing billable realization rates, fee collection speed, matter revenue by practice area, and trust account compliance status.

### 18. M18: Conflict of Interest Screening (`/conflicts`) — *RPC 2023 Rule 10*
- Automated screening engine checking prospective clients, adverse parties, co-defendants, and company directors against all historical matters and contact records.

### 19. M19: Immutable System-Wide Audit Trail (`/audit`)
- Cryptographically verifiable activity log tracking all state changes (client creation, trust receipts, disbursements, document downloads, and permission updates) with user ID, IP address, and before/after payloads.

### 20. M20: Configurable Role-Based Access Control (`/rbac`)
- Granular permission matrix allowing the Principal Partner to configure read/write permissions per module and role with immediate runtime propagation.

---

## 📱 Mobile Applications (Android & iOS)

- **Android Native APK**: [**Download Direct APK (9.35 MB)**](https://portal.aalawsng.com/downloads/AALAWSNG.apk)
- **iOS & Android PWA**: Open [**https://portal.aalawsng.com**](https://portal.aalawsng.com) in mobile Safari or Chrome ➔ Tap **"Add to Home Screen"**.
