import os
import sys
from playwright.sync_api import sync_playwright

output_pdf_path = r"C:\Users\user\Downloads\AALAWSNG_Comprehensive_User_Guide.pdf"
local_pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs", "AALAWSNG_Comprehensive_User_Guide.pdf"))

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AALAWSNG — Comprehensive 20-Module User Guide</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  @page {
    size: A4;
    margin: 20mm 15mm 20mm 15mm;
    @bottom-right {
      content: counter(page);
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #6b7280;
    }
    @bottom-left {
      content: "AALAWSNG — Adeola Kolawole & Associates | Confidential";
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #6b7280;
    }
  }

  body {
    font-family: 'Inter', sans-serif;
    color: #1f2937;
    line-height: 1.6;
    font-size: 9.5pt;
    margin: 0;
    padding: 0;
    background-color: #ffffff;
  }

  /* Page Break Utilities */
  .page-break {
    page-break-before: always;
  }
  .avoid-break {
    page-break-inside: avoid;
  }

  /* Cover Page */
  .cover-page {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    page-break-after: always;
    padding: 30px 20px 20px 20px;
    box-sizing: border-box;
  }
  .cover-header {
    border-bottom: 3px solid #00b862;
    padding-bottom: 20px;
  }
  .cover-firm-title {
    font-family: 'Playfair Display', serif;
    font-size: 26pt;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 6px 0;
    letter-spacing: -0.5px;
  }
  .cover-firm-subtitle {
    font-size: 11pt;
    color: #00b862;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin: 0;
  }
  .cover-body {
    margin: auto 0;
    padding: 40px 0;
  }
  .cover-doc-badge {
    display: inline-block;
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 9pt;
    font-weight: 600;
    margin-bottom: 18px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .cover-doc-title {
    font-family: 'Playfair Display', serif;
    font-size: 32pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
    margin: 0 0 16px 0;
  }
  .cover-doc-desc {
    font-size: 12pt;
    color: #4b5563;
    line-height: 1.6;
    max-width: 90%;
    margin-bottom: 25px;
  }
  .cover-compliance-box {
    background: #f8fafc;
    border-left: 4px solid #0f172a;
    padding: 14px 18px;
    border-radius: 0 8px 8px 0;
    font-size: 9.5pt;
    color: #334155;
  }
  .cover-footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 18px;
    display: flex;
    justify-content: space-between;
    font-size: 9pt;
    color: #64748b;
  }

  /* Headings */
  h1 {
    font-family: 'Playfair Display', serif;
    font-size: 18pt;
    font-weight: 700;
    color: #0f172a;
    margin-top: 28px;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 2px solid #e2e8f0;
  }
  .chapter-number {
    color: #00b862;
    font-weight: 800;
    font-family: 'Inter', sans-serif;
    font-size: 12pt;
    display: block;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 4px;
  }
  h2 {
    font-family: 'Inter', sans-serif;
    font-size: 12.5pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 18px;
    margin-bottom: 8px;
  }
  h3 {
    font-size: 10.5pt;
    font-weight: 600;
    color: #334155;
    margin-top: 14px;
    margin-bottom: 6px;
  }
  p {
    margin-top: 0;
    margin-bottom: 10px;
    text-align: justify;
  }

  /* Table of Contents */
  .toc-container {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 24px 28px;
    margin-bottom: 30px;
  }
  .toc-title {
    font-family: 'Playfair Display', serif;
    font-size: 18pt;
    font-weight: 700;
    color: #0f172a;
    margin-top: 0;
    margin-bottom: 16px;
    border-bottom: 2px solid #00b862;
    padding-bottom: 8px;
  }
  .toc-section-title {
    font-size: 10.5pt;
    font-weight: 700;
    color: #065f46;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 16px;
    margin-bottom: 8px;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 4px;
  }
  .toc-list {
    list-style: none;
    padding-left: 0;
    margin: 0;
  }
  .toc-item {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 5px 0;
    border-bottom: 1px dotted #e2e8f0;
  }
  .toc-link {
    color: #1e293b;
    text-decoration: none;
    font-weight: 500;
    font-size: 9.5pt;
    transition: color 0.2s;
  }
  .toc-link:hover {
    color: #00b862;
  }
  .toc-tag {
    background: #e2e8f0;
    color: #475569;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 7.5pt;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Styled Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0 20px 0;
    font-size: 9pt;
  }
  th {
    background-color: #0f172a;
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 8px 12px;
    border: 1px solid #0f172a;
  }
  td {
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
  }
  tr:nth-child(even) {
    background-color: #f8fafc;
  }

  /* Callout Boxes */
  .callout {
    padding: 12px 16px;
    border-radius: 6px;
    margin: 14px 0;
    font-size: 9pt;
  }
  .callout-compliance {
    background-color: #f0fdf4;
    border-left: 4px solid #00b862;
    color: #166534;
  }
  .callout-warning {
    background-color: #fffbeb;
    border-left: 4px solid #f59e0b;
    color: #92400e;
  }
  .callout-info {
    background-color: #eff6ff;
    border-left: 4px solid #3b82f6;
    color: #1e40af;
  }
  .callout-title {
    font-weight: 700;
    display: block;
    margin-bottom: 4px;
  }

  /* Code / Monospace */
  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5pt;
    background: #f1f5f9;
    padding: 2px 5px;
    border-radius: 4px;
    color: #0f172a;
  }
  .code-block {
    background: #0f172a;
    color: #f8fafc;
    padding: 12px 16px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5pt;
    line-height: 1.5;
    margin: 12px 0;
    overflow-x: auto;
  }

  /* Module Badges */
  .module-badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 8pt;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    margin-right: 6px;
  }
  .badge-core { background: #e0f2fe; color: #0369a1; }
  .badge-fin { background: #dcfce7; color: #15803d; }
  .badge-ops { background: #fef3c7; color: #b45309; }
  .badge-comms { background: #f3e8ff; color: #7e22ce; }
  .badge-comp { background: #fee2e2; color: #b91c1c; }

  /* Back to TOC link */
  .back-to-toc {
    float: right;
    font-size: 8pt;
    color: #00b862;
    text-decoration: none;
    font-weight: 600;
    margin-top: 4px;
  }
</style>
</head>
<body>

<!-- ============================================================ -->
<!-- COVER PAGE                                                   -->
<!-- ============================================================ -->
<div class="cover-page">
  <div class="cover-header">
    <h1 class="cover-firm-title">ADEOLA KOLAWOLE & ASSOCIATES</h1>
    <p class="cover-firm-subtitle">Legal Practitioners, Arbitrators & Notaries Public</p>
  </div>

  <div class="cover-body">
    <div class="cover-doc-badge">Official Standard Operating Manual — Version 2.0</div>
    <h1 class="cover-doc-title">AALAWSNG Practice Management & Client Portal</h1>
    <p class="cover-doc-desc">
      Comprehensive 20-Module System Manual, Standard Operating Procedures, Regulatory Compliance Architecture, and Cross-Platform Mobile Deployment Guide.
    </p>

    <div class="cover-compliance-box">
      <strong>Statutory & Regulatory Framework Compliance:</strong><br>
      • Legal Practitioners Accounts Rules (LPAR 1964 — Trust vs. Office Separation)<br>
      • Rules of Professional Conduct for Legal Practitioners (RPC 2023 — Rule 10 Conflicts & Rule 23 Client Property)<br>
      • Money Laundering (Prevention and Prohibition) Act 2022 & SCUML KYC Mandates<br>
      • Federal Inland Revenue Service (FIRS) 7.5% Value Added Tax on Legal Invoicing
    </div>
  </div>

  <div class="cover-footer">
    <div><strong>Production URL:</strong> https://portal.aalawsng.com</div>
    <div><strong>Release:</strong> August 2026 | Clean Slate Production</div>
  </div>
</div>

<!-- ============================================================ -->
<!-- TABLE OF CONTENTS                                            -->
<!-- ============================================================ -->
<div class="toc-container page-break" id="table-of-contents">
  <h2 class="toc-title">Interactive Table of Contents</h2>
  <p style="font-size: 9pt; color: #64748b; margin-bottom: 16px;">
    <em>Click any chapter title or module below to jump directly to its detailed operating procedures.</em>
  </p>

  <div class="toc-section-title">Part I: Platform Architecture & User Roles</div>
  <ul class="toc-list">
    <li class="toc-item"><a class="toc-link" href="#ch01-architecture">Chapter 1: Platform Overview, Hosting Architecture & Security Hardening</a> <span class="toc-tag">System Core</span></li>
    <li class="toc-item"><a class="toc-link" href="#ch02-roles">Chapter 2: Master Human Testing Accounts & Role Hierarchy</a> <span class="toc-tag">Authentication</span></li>
  </ul>

  <div class="toc-section-title">Part II: Core Practice Management (M01 – M05)</div>
  <ul class="toc-list">
    <li class="toc-item"><a class="toc-link" href="#m01-matters">Chapter 3: M01 — Matter & Case Lifecycle Management</a> <span class="toc-tag">M01 / Core</span></li>
    <li class="toc-item"><a class="toc-link" href="#m02-clients">Chapter 4: M02 — Client Relationship Management (CRM) & KYC Intake</a> <span class="toc-tag">M02 / Core</span></li>
    <li class="toc-item"><a class="toc-link" href="#m03-calendar">Chapter 5: M03 — Court Calendar, Hearings & Safety-Critical Deadline Escalation</a> <span class="toc-tag">M03 / Core</span></li>
    <li class="toc-item"><a class="toc-link" href="#m04-documents">Chapter 6: M04 — Document Management Vault & API Visibility Guards</a> <span class="toc-tag">M04 / Core</span></li>
    <li class="toc-item"><a class="toc-link" href="#m05-tasks">Chapter 7: M05 — Task & Workflow Management (Checklist Templates)</a> <span class="toc-tag">M05 / Core</span></li>
  </ul>

  <div class="toc-section-title">Part III: Financial & Legal Trust Accounting (M06 – M10)</div>
  <ul class="toc-list">
    <li class="toc-item"><a class="toc-link" href="#m06-time">Chapter 8: M06 — Time Tracking & Multi-Currency Billing Rates</a> <span class="toc-tag">M06 / Finance</span></li>
    <li class="toc-item"><a class="toc-link" href="#m07-invoices">Chapter 9: M07 — Invoicing & Legal Bills of Costs (FIRS 7.5% VAT)</a> <span class="toc-tag">M07 / Finance</span></li>
    <li class="toc-item"><a class="toc-link" href="#m08-trust">Chapter 10: M08 — LPAR 1964 Trust Accounting & 3-Way Reconciliation</a> <span class="toc-tag">M08 / Compliance</span></li>
    <li class="toc-item"><a class="toc-link" href="#m09-expenses">Chapter 11: M09 — Standalone Expense & Reimbursable Disbursement Tracking</a> <span class="toc-tag">M09 / Finance</span></li>
    <li class="toc-item"><a class="toc-link" href="#m10-dashboard">Chapter 12: M10 — Executive Financial Dashboard & Performance KPIs</a> <span class="toc-tag">M10 / Finance</span></li>
  </ul>

  <div class="toc-section-title">Part IV: Operations, Human Resources & Analytics (M11 – M13, M17)</div>
  <ul class="toc-list">
    <li class="toc-item"><a class="toc-link" href="#m11-staff">Chapter 13: M11 — Staff Profiles & Fee-Earner Hourly Rates</a> <span class="toc-tag">M11 / Operations</span></li>
    <li class="toc-item"><a class="toc-link" href="#m12-workload">Chapter 14: M12 — Firm-Wide Workload, Capacity & Utilization Tracking</a> <span class="toc-tag">M12 / Operations</span></li>
    <li class="toc-item"><a class="toc-link" href="#m13-hr">Chapter 15: M13 — Human Resources, Leave Approvals & PTO Tracking</a> <span class="toc-tag">M13 / Operations</span></li>
    <li class="toc-item"><a class="toc-link" href="#m17-analytics">Chapter 16: M17 — Practice Analytics & Realization Reporting</a> <span class="toc-tag">M17 / Analytics</span></li>
  </ul>

  <div class="toc-section-title">Part V: Communications & Secure Engagement (M14 – M16)</div>
  <ul class="toc-list">
    <li class="toc-item"><a class="toc-link" href="#m14-portal">Chapter 17: M14 — Client Portal & Pleadings Vault</a> <span class="toc-tag">M14 / Comms</span></li>
    <li class="toc-item"><a class="toc-link" href="#m15-internal-msg">Chapter 18: M15 — Internal Staff-to-Staff Messaging (Architectural Separation)</a> <span class="toc-tag">M15 / Security</span></li>
    <li class="toc-item"><a class="toc-link" href="#m16-client-msg">Chapter 19: M16 — Client-Lawyer Encrypted Messaging</a> <span class="toc-tag">M16 / Comms</span></li>
  </ul>

  <div class="toc-section-title">Part VI: Compliance, Risk & Governance (M18 – M20)</div>
  <ul class="toc-list">
    <li class="toc-item"><a class="toc-link" href="#m18-conflicts">Chapter 20: M18 — Automated Conflict of Interest Screening (RPC Rule 10)</a> <span class="toc-tag">M18 / Compliance</span></li>
    <li class="toc-item"><a class="toc-link" href="#m19-audit">Chapter 21: M19 — Immutable System-Wide Audit Trail</a> <span class="toc-tag">M19 / Compliance</span></li>
    <li class="toc-item"><a class="toc-link" href="#m20-rbac">Chapter 22: M20 — Configurable Role-Based Access Control (RBAC)</a> <span class="toc-tag">M20 / Compliance</span></li>
  </ul>

  <div class="toc-section-title">Part VII: Cross-Platform Mobile Deployment</div>
  <ul class="toc-list">
    <li class="toc-item"><a class="toc-link" href="#mobile-pwa">Chapter 23: Progressive Web App (PWA) on iPhone Safari & Android Chrome</a> <span class="toc-tag">Mobile</span></li>
    <li class="toc-item"><a class="toc-link" href="#mobile-native">Chapter 24: Native Android APK (Direct Download) & Capacitor 6 Setup</a> <span class="toc-tag">Mobile</span></li>
  </ul>
</div>

<!-- ============================================================ -->
<!-- PART I: PLATFORM ARCHITECTURE & ROLES                        -->
<!-- ============================================================ -->
<div class="page-break" id="ch01-architecture">
  <span class="chapter-number">Chapter 1</span>
  <h1>Platform Overview, Hosting Architecture & Security Hardening</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    The <strong>AALAWSNG</strong> management platform is an enterprise-grade legal practice management solution engineered specifically for Nigerian legal jurisprudence. The system is hosted in a secure, containerized production environment with redundant data backups and SSL/TLS cryptographic encryption.
  </p>

  <h2>1.1 Production Infrastructure Stack</h2>
  <table>
    <tr>
      <th>Layer</th>
      <th>Technology & Provider</th>
      <th>Security & Optimization Details</th>
    </tr>
    <tr>
      <td><strong>Frontend Application</strong></td>
      <td>Next.js 16.3 (Turbopack) & React 19</td>
      <td>27 pre-compiled static and dynamic pages with zero loading screen lag, responsive dark mode typography, and native viewport scaling.</td>
    </tr>
    <tr>
      <td><strong>Backend API Services</strong></td>
      <td>Node.js 20 LTS + Express.js</td>
      <td>RESTful microservice architecture with rate limiting, helmet security headers, and CORS lockdown.</td>
    </tr>
    <tr>
      <td><strong>Database Engine</strong></td>
      <td>PostgreSQL 16 Enterprise (Alpine Container)</td>
      <td>ACID-compliant relational database managed via Prisma ORM with strict referential integrity and parameterized SQL queries.</td>
    </tr>
    <tr>
      <td><strong>Payment Infrastructure</strong></td>
      <td>Paystack Native Payment Gateway</td>
      <td>PCI-DSS Level 1 compliant gateway supporting Debit Cards, Direct Bank Transfers, and USSD with fee-absorption routing.</td>
    </tr>
    <tr>
      <td><strong>Edge & Security Gateway</strong></td>
      <td>Let's Encrypt TLS + Cloudflare WAF + Nginx 1.28</td>
      <td>Automated HTTPS redirection, HTTP/2 multiplexing, DDoS mitigation, and SSL certificate auto-renewal.</td>
    </tr>
  </table>

  <h2>1.2 White-Hat Security Hardening Features</h2>
  <ul>
    <li><strong>Brute-Force Attack Mitigation:</strong> The authentication endpoint (<code>/api/v1/auth/login</code>) enforces a strict IP-based rate limiter (maximum 20 attempts per 15 minutes) with reverse-proxy trust header validation.</li>
    <li><strong>CORS Lockdown:</strong> Cross-Origin Resource Sharing is strictly whitelisted to <code>https://portal.aalawsng.com</code>.</li>
    <li><strong>File Upload Sanitization:</strong> Permitted file uploads are restricted to <code>.pdf</code>, <code>.docx</code>, <code>.xlsx</code>, <code>.png</code>, <code>.jpg</code>. Uploaded filenames are converted to cryptographically random UUIDs to prevent directory traversal and executable script injection.</li>
    <li><strong>Document Visibility Firewall:</strong> Client tokens are filtered server-side so that internal notes and draft research can never be retrieved via direct API calls or ID enumeration.</li>
  </ul>
</div>

<!-- CHAPTER 2 -->
<div class="page-break" id="ch02-roles">
  <span class="chapter-number">Chapter 2</span>
  <h1>Master Human Testing Accounts & Role Hierarchy</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    The production database has been seeded into a <strong>Clean Slate</strong> state. All mock cases and sample invoices were purged so that your team can create real client records from day one. Four master testing accounts have been pre-configured for practice verification:
  </p>

  <table>
    <tr>
      <th>Role</th>
      <th>Assigned User</th>
      <th>Testing Email</th>
      <th>System Tier</th>
      <th>Primary Responsibilities</th>
    </tr>
    <tr>
      <td><strong>Principal Partner</strong></td>
      <td>Adeola Kolawole</td>
      <td><code>admin@aalawsng.com</code></td>
      <td><code>ADMIN</code></td>
      <td>Full executive authority, financial reports, LPAR 1964 Trust 3-way reconciliation certificates, fee-earner hourly rate configuration, leave request approvals.</td>
    </tr>
    <tr>
      <td><strong>Associate Counsel</strong></td>
      <td>Folashade Balogun</td>
      <td><code>associate@aalawsng.com</code></td>
      <td><code>STAFF</code></td>
      <td>Client intake, automated conflict screening, matter creation, court hearing management, timesheet entry, legal bill of costs generation.</td>
    </tr>
    <tr>
      <td><strong>Paralegal</strong></td>
      <td>Emeka Okonkwo</td>
      <td><code>paralegal@aalawsng.com</code></td>
      <td><code>STAFF</code></td>
      <td>Document classification and filing, task checklist execution, hearing bundle preparation, billable time entry.</td>
    </tr>
    <tr>
      <td><strong>Client Portal</strong></td>
      <td>Chukwuemeka Adeyemi</td>
      <td><code>client@demo.com</code></td>
      <td><code>CLIENT</code></td>
      <td>Scoped client access, real-time case milestone viewing, pleadings download, invoice review, and instant Paystack online payment.</td>
    </tr>
  </table>

  <div class="callout callout-info">
    <span class="callout-title">🔒 Credential Security Best Practice</span>
    For testing credentials and passwords, consult your firm's confidential onboarding sheet. Plaintext passwords are not printed in public documentation.
  </div>
</div>

<!-- ============================================================ -->
<!-- PART II: CORE PRACTICE MANAGEMENT                            -->
<!-- ============================================================ -->
<div class="page-break" id="m01-matters">
  <span class="chapter-number">Chapter 3</span>
  <h1><span class="module-badge badge-core">M01</span> Matter & Case Lifecycle Management</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M01 | Route: <code>/matters</code></strong><br>
    The Matter Management module is the operational core of AALAWSNG. It allows legal teams to track every litigation case, commercial transaction, and conveyancing file from initial intake to final judgment or execution.
  </p>

  <h2>3.1 Creating a New Legal Matter</h2>
  <ol>
    <li>Navigate to <strong>Matters</strong> in the sidebar (<code>/matters</code>).</li>
    <li>Click the <strong>"New Matter"</strong> button in the top right header.</li>
    <li>Select the <strong>Practice Area</strong>:
      <ul>
        <li><em>Litigation & Dispute Resolution</em></li>
        <li><em>Property & Real Estate Conveyancing</em></li>
        <li><em>Corporate & Commercial Law</em></li>
        <li><em>Family & Matrimonial Causes</em></li>
        <li><em>Estate Administration & Probate</em></li>
        <li><em>Employment & Labour Relations</em></li>
      </ul>
    </li>
    <li>Enter the <strong>Case / Matter Title</strong> (e.g., <em>"Chevron Nigeria Ltd v. Federal Inland Revenue Service"</em>).</li>
    <li>Select the <strong>Client</strong> from the client directory.</li>
    <li>Assign the <strong>Lead Attorney</strong> and billable hourly rate.</li>
    <li>Enter Court Information: <strong>Court Jurisdiction</strong> (e.g., <em>"High Court of Lagos State (Ikeja Judicial Division)"</em>), <strong>Suit Number</strong> (e.g., <code>Suit No. ID/3028/2026</code>), and <strong>Presiding Judge</strong>.</li>
    <li>Assign <strong>Opposing Counsel</strong> and opposing parties.</li>
    <li>Click <strong>"Create Matter"</strong>.</li>
  </ol>

  <h2>3.2 Matter Status Lifecycle</h2>
  <p>
    Matters transition through 4 defined states: <code>OPEN</code> ➔ <code>PENDING_HEARING</code> ➔ <code>JUDGMENT_RESERVED</code> ➔ <code>CLOSED</code>. Changing status logs an automated entry in the system audit trail.
  </p>
</div>

<!-- CHAPTER 4: M02 -->
<div class="page-break" id="m02-clients">
  <span class="chapter-number">Chapter 4</span>
  <h1><span class="module-badge badge-core">M02</span> Client Management (CRM) & KYC Intake</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M02 | Route: <code>/clients</code></strong><br>
    Client Management enables compliant onboarding of corporate and individual clients in full alignment with the <em>Money Laundering (Prevention and Prohibition) Act 2022</em> and <em>SCUML</em> guidelines.
  </p>

  <h2>4.1 Client Onboarding Workflow</h2>
  <ol>
    <li>Open <strong>Clients</strong> (<code>/clients</code>) and click <strong>"New Client"</strong>.</li>
    <li>Enter Personal / Corporate Details: First Name, Last Name, Company / Entity Name, Primary Email, Phone Number, and Office Address.</li>
    <li>Capture Statutory Identifiers:
      <ul>
        <li><strong>Corporate Clients:</strong> CAC Registration Number (RC/BN Number) and Tax Identification Number (TIN).</li>
        <li><strong>Individual Clients:</strong> National Identification Number (NIN), Passport Number, or Voter's Card.</li>
      </ul>
    </li>
    <li>Complete KYC & Compliance Declaration: Flag <strong>PEP Status</strong> (Politically Exposed Person) and Source of Funds Declaration.</li>
    <li>Click <strong>"Save Client Profile"</strong>.</li>
  </ol>

  <div class="callout callout-compliance">
    <span class="callout-title">⚖️ Automatic Conflict Check Trigger</span>
    Saving a new client automatically triggers the <strong>M18 Conflict Screening Engine</strong> across all directors, parties, and adverse witnesses.
  </div>
</div>

<!-- CHAPTER 5: M03 -->
<div class="page-break" id="m03-calendar">
  <span class="chapter-number">Chapter 5</span>
  <h1><span class="module-badge badge-core">M03</span> Court Calendar & Safety-Critical Deadline Escalation</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M03 | Route: <code>/calendar</code></strong><br>
    The Court Calendar tracks critical trial dates, motion hearings, filing deadlines, and client conferences with visual risk escalations.
  </p>

  <h2>5.1 Scheduling Court Hearings & Deadlines</h2>
  <ol>
    <li>Navigate to <strong>Calendar</strong> (<code>/calendar</code>).</li>
    <li>Click on any date or tap <strong>"Add Event"</strong>.</li>
    <li>Specify Event Type: <em>Court Hearing, Motion Filing, Client Conference, Judgment/Ruling, Discovery Inspection</em>.</li>
    <li>Link the Event to an active Matter (e.g., <code>Suit No. LD/4092/2026</code>).</li>
    <li>Set <strong>Start Time, End Time, Courtroom/Virtual Link</strong>, and attendee attorneys.</li>
  </ol>

  <h2>5.2 Safety-Critical Hard-Deadline Escalations</h2>
  <p>
    When creating an event, check the <code>[x] Hard Statutory Deadline</code> box for statute of limitations or court filing deadlines. The system enforces visual escalation levels:
  </p>
  <table>
    <tr>
      <th>Urgency Level</th>
      <th>Time Horizon</th>
      <th>Visual Badge</th>
      <th>System Action</th>
    </tr>
    <tr>
      <td><strong>CRITICAL</strong></td>
      <td>&lt; 24 Hours</td>
      <td><span style="color:#b91c1c; font-weight:700;">🔴 Red Badge</span></td>
      <td>Priority banner alert on dashboard + high-priority notification to lead attorney.</td>
    </tr>
    <tr>
      <td><strong>HIGH</strong></td>
      <td>&lt; 72 Hours</td>
      <td><span style="color:#d97706; font-weight:700;">🟠 Orange Badge</span></td>
      <td>Highlighted in calendar view and included in daily morning briefing.</td>
    </tr>
    <tr>
      <td><strong>STANDARD</strong></td>
      <td>&gt; 3 Days</td>
      <td><span style="color:#2563eb; font-weight:700;">🟡 Blue Badge</span></td>
      <td>Standard chronological calendar display.</td>
    </tr>
  </table>
</div>

<!-- CHAPTER 6: M04 -->
<div class="page-break" id="m04-documents">
  <span class="chapter-number">Chapter 6</span>
  <h1><span class="module-badge badge-core">M04</span> Document Vault & API Visibility Enforcement</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M04 | Route: <code>/documents</code></strong><br>
    AALAWSNG manages all case filings, affidavits, CTCs, and draft agreements with cryptographic integrity checks and server-side privacy firewalls.
  </p>

  <h2>6.1 Document Classification & Uploading</h2>
  <ol>
    <li>Navigate to <strong>Documents</strong> (<code>/documents</code>) and click <strong>"Upload Document"</strong>.</li>
    <li>Select file (supported formats: PDF, DOCX, XLSX, PNG, JPG; up to 50MB).</li>
    <li>Link the document to a specific Matter.</li>
    <li><strong>Set Visibility Tier:</strong>
      <ul>
        <li><code>INTERNAL_ONLY</code>: Strictly confidential to firm fee-earners (legal research, internal strategy memos, partner deliberations).</li>
        <li><code>CLIENT_VISIBLE</code>: Accessible to the client in their private portal (stamped pleadings, perfected deeds, CTC rulings).</li>
        <li><code>CONFIDENTIAL</code>: Restricted to Principal Partners and Lead Counsel.</li>
      </ul>
    </li>
    <li>Click <strong>"Upload & Secure"</strong>. The file is assigned a random UUID on disk and hashed with SHA-256.</li>
  </ol>

  <div class="callout callout-warning">
    <span class="callout-title">🛡️ API-Layer Security Guarantee (§5.1)</span>
    Document visibility is enforced in <code>backend/src/middleware/document-guard.ts</code>. Client-tier requests querying internal documents via direct API endpoints or ID enumeration are rejected with <strong>HTTP 403 Forbidden</strong>.
  </div>
</div>

<!-- CHAPTER 7: M05 -->
<div class="page-break" id="m05-tasks">
  <span class="chapter-number">Chapter 7</span>
  <h1><span class="module-badge badge-core">M05</span> Task & Workflow Management</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M05 | Route: <code>/tasks</code></strong><br>
    The Task & Workflow engine ensures litigation teams execute standard checklists, motion preparation, and registry perfection without administrative oversight gaps.
  </p>

  <h2>7.1 Task Views & Management</h2>
  <ul>
    <li><strong>Kanban Board:</strong> Drag and drop tasks across columns: <code>TODO</code> ➔ <code>IN_PROGRESS</code> ➔ <code>REVIEW</code> ➔ <code>COMPLETED</code>.</li>
    <li><strong>List View:</strong> Filter tasks by Matter, Assignee, Priority (High, Medium, Low), or Due Date.</li>
    <li><strong>Matter-Linked Checklists:</strong> Attach itemized sub-tasks to any court filing (e.g., <em>"1. Draft Affidavits, 2. Pay Filing Fees, 3. Depose at High Court Registry, 4. Serve Opposing Counsel"</em>).</li>
  </ul>
</div>

<!-- ============================================================ -->
<!-- PART III: FINANCIAL & TRUST ACCOUNTING (M06 – M10)           -->
<!-- ============================================================ -->
<div class="page-break" id="m06-time">
  <span class="chapter-number">Chapter 8</span>
  <h1><span class="module-badge badge-fin">M06</span> Time Tracking & Multi-Currency Billing</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M06 | Route: <code>/time</code></strong><br>
    Fee-earners track billable minutes against legal matters in multiple currencies with customized hourly rates.
  </p>

  <h2>8.1 Logging Billable Time</h2>
  <ol>
    <li>Navigate to <strong>Time Tracking</strong> (<code>/time</code>).</li>
    <li>Click <strong>"Log Time Entry"</strong>.</li>
    <li>Select the Matter and Activity Type (e.g., <em>Court Appearance, Drafting Pleadings, Client Consultation, Legal Research</em>).</li>
    <li>Enter Duration in minutes or hours (e.g., <code>2.5 hrs</code>).</li>
    <li>The system automatically computes the billable fee based on the fee-earner's configured rate:
      <div class="code-block">Total Billed = Hours (2.5) × Fee-Earner Rate (₦50,000/hr) = ₦125,000</div>
    </li>
    <li>Save Entry. Unbilled time automatically queues for inclusion on the next client Bill of Costs.</li>
  </ol>
</div>

<!-- CHAPTER 9: M07 -->
<div class="page-break" id="m07-invoices">
  <span class="chapter-number">Chapter 9</span>
  <h1><span class="module-badge badge-fin">M07</span> Invoicing & Legal Bills of Costs (FIRS VAT)</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M07 | Route: <code>/invoices</code></strong><br>
    The Invoicing module converts recorded time entries and disbursements into itemized professional legal Bills of Costs compliant with Nigerian tax regulations.
  </p>

  <h2>9.1 Generating an Invoice</h2>
  <ol>
    <li>Navigate to <strong>Invoices</strong> (<code>/invoices</code>) and click <strong>"Create Invoice"</strong>.</li>
    <li>Select the Client and Matter.</li>
    <li>Choose Invoice Type:
      <ul>
        <li><code>BILL_OF_COSTS</code>: Final invoice for earned legal services rendered.</li>
        <li><code>RETAINER</code>: Advance deposit request for future legal fees / trust account.</li>
      </ul>
    </li>
    <li>The system automatically aggregates unbilled time entries and disbursements.</li>
    <li><strong>FIRS 7.5% VAT Calculation:</strong> Automatically applied to professional legal fees.</li>
    <li>Click <strong>"Generate & Send"</strong>. An email notification and Paystack payment link are dispatched to the client.</li>
  </ol>
</div>

<!-- CHAPTER 10: M08 -->
<div class="page-break" id="m08-trust">
  <span class="chapter-number">Chapter 10</span>
  <h1><span class="module-badge badge-comp">M08</span> LPAR 1964 Trust Accounting & 3-Way Reconciliation</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M08 | Route: <code>/trust</code></strong><br>
    Trust Accounting strictly enforces the statutory mandates of the <em>Legal Practitioners Accounts Rules (LPAR 1964)</em> and <em>RPC 2023 Rule 23</em>.
  </p>

  <h2>10.1 Dual-Account Segregation Architecture</h2>
  <table>
    <tr>
      <th>Account Ledger</th>
      <th>Permitted Funds</th>
      <th>Prohibited Operations</th>
    </tr>
    <tr>
      <td><strong>Client Account (Trust Ledger)</strong></td>
      <td>Client retainer deposits, conveyancing purchase funds, settlement escrow, probate floats.</td>
      <td>Never used for office overhead, staff salaries, partner drawings, or merchant processing fees.</td>
    </tr>
    <tr>
      <td><strong>Office Account (Operating Ledger)</strong></td>
      <td>Earned legal fees transferred after billing, disbursements reimbursed, VAT collections.</td>
      <td>Never mixed with unearned client funds.</td>
    </tr>
  </table>

  <h2>10.2 Paystack Fee-Absorption Guarantee (§6.3.2)</h2>
  <p>
    When a client pays a trust retainer deposit via Paystack, the transaction is initialized with <code>bearer: 'account'</code>. <strong>The firm absorbs 100% of the gateway processing fee.</strong> The client's trust sub-ledger is credited with the exact gross deposit amount, preventing illegal trust fund erosion.
  </p>

  <h2>10.3 Monthly Three-Way Reconciliation Certificate</h2>
  <p>
    LPAR 1964 mandates monthly verification. Under <code>/trust</code>, the Principal Partner clicks <strong>"Run 3-Way Reconciliation"</strong> to generate a cryptographically signed verification certificate:
  </p>
  <div class="code-block">Bank Statement Balance (₦14,500,000) = Sum of Client Sub-Ledgers (₦14,500,000) = General Ledger (₦14,500,000)
Variance: ₦0.00 | Status: COMPLIANT | Audit Token: SHA-256 verified</div>
</div>

<!-- CHAPTER 11: M09 -->
<div class="page-break" id="m09-expenses">
  <span class="chapter-number">Chapter 11</span>
  <h1><span class="module-badge badge-fin">M09</span> Standalone Expense & Disbursement Tracking</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M09 | Route: <code>/expenses</code></strong><br>
    Tracks out-of-pocket litigation expenses, court filing receipts, land registry search fees, and travel disbursements.
  </p>

  <h2>11.1 Recording Expenses</h2>
  <ol>
    <li>Navigate to <strong>Expenses</strong> (<code>/expenses</code>) and click <strong>"Log Expense"</strong>.</li>
    <li>Select Expense Category: <em>Court Filing Fees, Stamp Duty, Land Registry Search, CAC Filing, Expert Witness, Travel/Logistics</em>.</li>
    <li>Link to Matter, enter Amount, Currency, Date, and attach scanned receipt.</li>
    <li>Toggle <code>[x] Reimbursable by Client</code> to automatically pull the expense into the next client invoice.</li>
  </ol>
</div>

<!-- CHAPTER 12: M10 -->
<div class="page-break" id="m10-dashboard">
  <span class="chapter-number">Chapter 12</span>
  <h1><span class="module-badge badge-fin">M10</span> Executive Financial Dashboard</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M10 | Route: <code>/dashboard</code></strong><br>
    The Executive Dashboard aggregates firm-wide performance metrics in real time:
  </p>
  <ul>
    <li><strong>Active Matters:</strong> Total ongoing cases across all practice departments.</li>
    <li><strong>Monthly Billed Revenue:</strong> Total invoices issued and collected in NGN and foreign currencies.</li>
    <li><strong>Trust Account Liability:</strong> Total client funds held in escrow under LPAR 1964.</li>
    <li><strong>Conflict Checks Pending:</strong> Prospective client screenings awaiting partner clearance.</li>
  </ul>
</div>

<!-- ============================================================ -->
<!-- PART IV: OPERATIONS, HR & ANALYTICS (M11 – M13, M17)         -->
<!-- ============================================================ -->
<div class="page-break" id="m11-staff">
  <span class="chapter-number">Chapter 13</span>
  <h1><span class="module-badge badge-ops">M11</span> Staff Profiles & Fee-Earner Management</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M11 | Route: <code>/staff</code></strong><br>
    Manages fee-earner directory, Bar enrollment numbers, NBA branch affiliations, role titles, and customized billable hourly rates.
  </p>
</div>

<!-- CHAPTER 14: M12 -->
<div class="page-break" id="m12-workload">
  <span class="chapter-number">Chapter 14</span>
  <h1><span class="module-badge badge-ops">M12</span> Firm-Wide Workload & Capacity Tracking</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M12 | Route: <code>/staff</code> & <code>/analytics</code></strong><br>
    Provides the Principal Partner with an executive capacity overview:
  </p>
  <ul>
    <li>Active matters assigned per fee-earner.</li>
    <li>Open task volume and pending court hearing load.</li>
    <li>Monthly billable hours target vs. actual hours recorded.</li>
    <li>Fee-earner utilization percentage (target: 85%+).</li>
  </ul>
</div>

<!-- CHAPTER 15: M13 -->
<div class="page-break" id="m13-hr">
  <span class="chapter-number">Chapter 15</span>
  <h1><span class="module-badge badge-ops">M13</span> Human Resources & Leave Approvals</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M13 | Route: <code>/hr</code></strong><br>
    Handles staff annual leave requests, sick leave, maternity/paternity leave, and partner approval workflows with automatic calendar integration.
  </p>
</div>

<!-- CHAPTER 16: M17 -->
<div class="page-break" id="m17-analytics">
  <span class="chapter-number">Chapter 16</span>
  <h1><span class="module-badge badge-ops">M17</span> Practice Analytics & Realization Reporting</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M17 | Route: <code>/analytics</code></strong><br>
    Visual analytics dashboard showing revenue by practice area, billable realization rates, fee collection velocity, and client acquisition trends.
  </p>
</div>

<!-- ============================================================ -->
<!-- PART V: COMMUNICATIONS & CLIENT PORTAL (M14 – M16)           -->
<!-- ============================================================ -->
<div class="page-break" id="m14-portal">
  <span class="chapter-number">Chapter 17</span>
  <h1><span class="module-badge badge-comms">M14</span> Client Portal & Pleadings Vault</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M14 | Route: <code>/portal</code></strong><br>
    The Client Portal provides clients with an exclusive, secure window into their cases:
  </p>
  <ul>
    <li><strong>Milestone Progress:</strong> Live case progress updates, next court hearing dates.</li>
    <li><strong>Document Vault:</strong> Instant download of <code>CLIENT_VISIBLE</code> court documents, CTC rulings, and agreements.</li>
    <li><strong>Instant Settlement:</strong> Pay legal bills online via integrated Paystack gateway.</li>
  </ul>
</div>

<!-- CHAPTER 18: M15 -->
<div class="page-break" id="m15-internal-msg">
  <span class="chapter-number">Chapter 18</span>
  <h1><span class="module-badge badge-comms">M15</span> Internal Messaging (Architectural Separation)</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M15 | Route: <code>/messages</code></strong><br>
    <strong>Hard Architectural Separation (§5.2):</strong> Internal staff communication is strictly isolated from client messaging at the schema, API, and UI layers:
  </p>
  <table>
    <tr>
      <th>Attribute</th>
      <th>Internal Messaging (M15)</th>
      <th>Client Messaging (M16)</th>
    </tr>
    <tr>
      <td><strong>Database Model</strong></td>
      <td><code>InternalMessage</code></td>
      <td><code>ClientMessage</code></td>
    </tr>
    <tr>
      <td><strong>API Endpoint</strong></td>
      <td><code>/api/v1/messages/internal</code></td>
      <td><code>/api/v1/messages/client</code></td>
    </tr>
    <tr>
      <td><strong>Access Guard</strong></td>
      <td><code>requireStaffOrAdmin</code> (Clients get 403 Forbidden)</td>
      <td><code>enforceClientScope</code></td>
    </tr>
    <tr>
      <td><strong>UI Interface</strong></td>
      <td><code>/messages</code></td>
      <td><code>/client-messages</code></td>
    </tr>
  </table>
</div>

<!-- CHAPTER 19: M16 -->
<div class="page-break" id="m16-client-msg">
  <span class="chapter-number">Chapter 19</span>
  <h1><span class="module-badge badge-comms">M16</span> Client-Lawyer Encrypted Messaging</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M16 | Route: <code>/client-messages</code></strong><br>
    Authenticated communication channel between clients and their assigned legal counsel, eliminating the interception risks of unencrypted consumer email.
  </p>
</div>

<!-- ============================================================ -->
<!-- PART VI: COMPLIANCE, RISK & GOVERNANCE (M18 – M20)           -->
<!-- ============================================================ -->
<div class="page-break" id="m18-conflicts">
  <span class="chapter-number">Chapter 20</span>
  <h1><span class="module-badge badge-comp">M18</span> Automated Conflict of Interest Screening</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M18 | Route: <code>/conflicts</code></strong><br>
    Enforces <em>RPC 2023 Rule 10</em>. Automatically scans prospective clients, co-parties, adverse parties, and corporate directors against historical matters and contact history.
  </p>
</div>

<!-- CHAPTER 21: M19 -->
<div class="page-break" id="m19-audit">
  <span class="chapter-number">Chapter 21</span>
  <h1><span class="module-badge badge-comp">M19</span> Immutable System-Wide Audit Trail</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M19 | Route: <code>/audit</code></strong><br>
    Captures an immutable, tamper-evident record of all state changes across all 20 modules:
  </p>
  <ul>
    <li>Records: User ID, Action Type, Entity ID, IP Address, Timestamp, Before/After JSON state.</li>
    <li>Covers: Client KYC verifications, Trust fund receipts and disbursements, Matter creations, Document uploads, Invoice payments, and RBAC updates.</li>
  </ul>
</div>

<!-- CHAPTER 22: M20 -->
<div class="page-break" id="m20-rbac">
  <span class="chapter-number">Chapter 22</span>
  <h1><span class="module-badge badge-comp">M20</span> Configurable Role-Based Access Control</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <p>
    <strong>Module ID: M20 | Route: <code>/rbac</code></strong><br>
    Allows the Principal Partner to configure granular read/write permissions per module and fee-earner role with immediate runtime propagation.
  </p>
</div>

<!-- ============================================================ -->
<!-- PART VII: CROSS-PLATFORM MOBILE DEPLOYMENT                   -->
<!-- ============================================================ -->
<div class="page-break" id="mobile-pwa">
  <span class="chapter-number">Chapter 23</span>
  <h1>Progressive Web App (PWA) on iPhone & Android</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <h2>23.1 Instant iPhone Safari Installation</h2>
  <ol>
    <li>Open <strong>Safari</strong> on iPhone ➔ visit <code>https://portal.aalawsng.com</code>.</li>
    <li>Tap the <strong>Share</strong> button (box with up-arrow at bottom).</li>
    <li>Tap <strong>"Add to Home Screen"</strong> (<code>[+]</code>).</li>
    <li>The AALAWSNG badge logo installs on your home screen. When opened, it runs as a <strong>standalone full-screen app</strong> without the Safari browser bar.</li>
  </ol>

  <h2>23.2 Android Chrome Installation</h2>
  <ol>
    <li>Open <strong>Chrome</strong> on Android ➔ visit <code>https://portal.aalawsng.com</code>.</li>
    <li>Tap <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong>.</li>
  </ol>
</div>

<!-- CHAPTER 24: NATIVE APK -->
<div class="page-break" id="mobile-native">
  <span class="chapter-number">Chapter 24</span>
  <h1>Native Android APK Direct Download & Capacitor 6</h1>
  <a class="back-to-toc" href="#table-of-contents">↑ Back to Table of Contents</a>

  <h2>24.1 1-Click Direct Android APK Download</h2>
  <p>
    The native Android APK is compiled and hosted directly on the production server:
  </p>
  <div class="code-block">Download URL: https://portal.aalawsng.com/downloads/AALAWSNG.apk</div>
  <p>
    Download the 9.35 MB <code>.apk</code> file onto any Android phone and tap <strong>Install</strong> to get native camera document scanning, biometric login, and push notifications!
  </p>
</div>

</body>
</html>
"""

print("Writing HTML source...")
temp_html = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs", "guide_temp.html"))
with open(temp_html, "w", encoding="utf-8") as f:
    f.write(html_content)

print("Rendering high-resolution PDF with Playwright Chromium...")
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto(f"file:///{temp_html.replace(os.sep, '/')}", wait_until="networkidle")
    
    # Generate PDF in Downloads directory
    page.pdf(
        path=output_pdf_path,
        format="A4",
        print_background=True,
        display_header_footer=True,
        header_template="<div></div>",
        footer_template="<div style='font-size:8pt; width:100%; text-align:right; color:#6b7280; padding-right:15mm;'>Page <span class='pageNumber'></span> of <span class='totalPages'></span></div>",
        margin={"top": "20mm", "bottom": "20mm", "left": "15mm", "right": "15mm"}
    )
    
    # Also save a copy in docs/
    page.pdf(
        path=local_pdf_path,
        format="A4",
        print_background=True,
        display_header_footer=True,
        header_template="<div></div>",
        footer_template="<div style='font-size:8pt; width:100%; text-align:right; color:#6b7280; padding-right:15mm;'>Page <span class='pageNumber'></span> of <span class='totalPages'></span></div>",
        margin={"top": "20mm", "bottom": "20mm", "left": "15mm", "right": "15mm"}
    )
    browser.close()

if os.path.exists(temp_html):
    os.remove(temp_html)

print(f"[SUCCESS] PDF Generated Successfully in Downloads folder: {output_pdf_path}")
print(f"File size: {os.path.getsize(output_pdf_path) / 1024:.2f} KB")
