# AALAWSNG — Comprehensive Team & Client User Guide

Welcome to the **AALAWSNG Integrated Law Firm Management Platform** for **Adeola Kolawole & Associates**. This guide explains step-by-step how each member of the legal practice and your clients interact with the platform at [**https://portal.aalawsng.com**](https://portal.aalawsng.com).

---

## 1. Master Testing Accounts & Credentials

The system has been initialized into a clean production slate. Use the following credentials for human testing and practice onboarding:

| Role | Name | Email Address | Password | Primary Functions |
| :--- | :--- | :--- | :--- | :--- |
| **Principal Partner (Admin)** | Adeola Kolawole | `admin@aalawsng.com` | `Admin@2024!` | Complete firm administration, Financial analytics, LPAR 1964 Trust Accounting, HR leave approvals, Staff rate setting |
| **Associate Counsel** | Folashade Balogun | `associate@aalawsng.com` | `Staff@2024!` | Client intake, Conflict checks, Matter lifecycle management, Court calendar, Billable time logging, Invoice generation |
| **Paralegal** | Emeka Okonkwo | `paralegal@aalawsng.com` | `Staff@2024!` | Document indexing & uploads, Task tracking, Court hearing preparation, Time logging |
| **Client Portal** | Chukwuemeka Adeyemi | `client@demo.com` | `Client@2024!` | Viewing assigned case status, Downloading pleadings & documents, Reviewing invoices, Instant Paystack online payment |

---

## 2. Principal Partner (Admin) Workflow

### A. Financial Analytics & Dashboard (`/dashboard` & `/analytics`)
1. Log in with `admin@aalawsng.com`.
2. View real-time KPIs: **Active Matters**, **Monthly Billed Revenue**, **Trust Account Balances (NGN & USD)**, **Staff Utilization**, and **Pending Conflict Inquiries**.

### B. Nigerian Legal Accounts & Trust Accounting (`/trust`) — *LPAR 1964 & RPC 2023 Rule 23*
1. **Separation of Accounts**: The system automatically enforces strict separation between:
   - **Client Account (Trust Ledger)**: Strictly holds client money (retainers, settlement funds, conveyancing floats).
   - **Office Account (Operating Ledger)**: Holds earned professional legal fees and VAT.
2. **Recording Trust Receipts & Disbursements**:
   - Navigate to **Client & Trust Accounts** (`/trust`).
   - Select **"New Deposit / Receipt"** to credit client trust funds.
   - Select **"Disbursement"** or **"Transfer to Office Account"** when fees are formally earned.
3. **Monthly Three-Way Reconciliation**:
   - Under LPAR 1964, monthly three-way reconciliation (Bank Balance vs. Client Sub-Ledger Sum vs. General System Total) is mandatory.
   - Click **"Run 3-Way Reconciliation"** to generate an automated audit certificate with cryptographic tamper verification.

### C. Human Resources & Leave Management (`/hr` & `/staff`)
1. View all firm fee-earners, hourly rates, and target billable hours.
2. Review and approve/reject leave requests from associates and paralegals.

---

## 3. Associate Counsel & Paralegal Workflow

### A. Client Intake & Automated Conflict Check (`/clients` & `/conflicts`)
1. **Intake**: Open **Clients** (`/clients`) and click **"New Client"**. Enter full legal name, RC/CAC number (for corporate clients), NIN/ID details, and email.
2. **Automated Conflict Screening**: The system automatically scans past litigation parties, adverse witnesses, and affiliated corporate directors (RPC Rule 10). If a conflict flag occurs, it must be cleared before opening a matter.

### B. Opening & Managing Legal Matters (`/matters`)
1. Go to **Matters** (`/matters`) ➔ Click **"New Matter"**.
2. Select Practice Area:
   - *Litigation & Dispute Resolution*
   - *Property & Real Estate Conveyancing*
   - *Corporate & Commercial Law*
   - *Family & Matrimonial Causes*
   - *Estate Administration & Probate*
   - *Employment & Labour Relations*
3. Assign the Lead Attorney, Client, Court Jurisdiction, Suit Number (e.g. `Suit No. LD/4092/2024`), and opposing counsel.

### C. Court Calendar & Case Deadlines (`/calendar`)
1. Schedule court hearing dates, motion filing deadlines, and client conferences.
2. Filter calendar by attorney or matter to prevent scheduling clashes.

### D. Time Logging & Invoicing (`/time` & `/invoices`)
1. **Log Time**: Fee-earners click **"Log Time"** to record billable minutes against a specific matter.
2. **Generate Invoice**: Navigate to **Invoices** ➔ Click **"Create Invoice"**.
3. Select the Matter and Client. The system automatically pulls unbilled time entries and disbursements, applies Nigerian 7.5% VAT (FIRS), and generates a professional legal Bill of Costs with an online payment link.

---

## 4. Client Portal Workflow

### A. Accessing Case Updates (`/portal`)
1. The client logs in with `client@demo.com` at [https://portal.aalawsng.com](https://portal.aalawsng.com).
2. The client is immediately greeted by their private dashboard showing:
   - **Active Cases & Milestones**: Upcoming court hearings and filing statuses.
   - **Shared Documents Vault**: Access to draft agreements, originating summons, affidavits, and stamped CTCs.
   - **Billing & Account Summary**: Outstanding balances, retainer deposits, and paid receipts.

### B. Instant Paystack Online Payment
1. Under **Invoices**, the client views their itemized bill.
2. Clicks **"Pay Now with Paystack"**.
3. The client selects their preferred channel:
   - **Debit / Credit Card** (Mastercard, Visa, Verve)
   - **Direct Bank Transfer** (Instant virtual bank account)
   - **USSD / QR Code**
4. Upon successful payment, the invoice is automatically marked **PAID**, funds are routed according to account type (LPAR 1964), and a signed e-receipt is generated.

### C. Confidential Client-Lawyer Messaging (`/client-messages`)
- The client can send encrypted inquiries directly to their assigned legal team without risking unencrypted email leaks.
