# AALAWSNG — Law Firm Management Platform & Client Portal

Official repository for **Adeola Kolawole & Associates** Integrated Practice Management System.

🌐 **Live Production URL**: [**https://portal.aalawsng.com**](https://portal.aalawsng.com)  
📲 **Android Mobile APK**: [**https://portal.aalawsng.com/downloads/AALAWSNG.apk**](https://portal.aalawsng.com/downloads/AALAWSNG.apk)

---

## 🏛️ System Overview

AALAWSNG is a custom, enterprise-grade law practice management system engineered specifically for Nigerian legal jurisprudence and modern digital client engagement:

- **LPAR 1964 Compliance**: Mandatory separation of Client Account (Trust Ledger) and Office Account (Operating Ledger) with automated 3-way reconciliation certificates.
- **RPC 2023 Rule 10 & 23**: Automated conflict-of-interest screening on client intake.
- **Financial & VAT (FIRS)**: Itemized Bills of Costs with Nigerian 7.5% VAT calculation and instant Paystack online payment gateway.
- **Security**: Strict Role-Based Access Control (RBAC), bcrypt hashing, JWT access/refresh tokens, brute-force rate limiting, and Let's Encrypt TLS SSL.
- **Cross-Platform Mobile**: Progressive Web App (PWA) + Native Capacitor 6 for Android and iOS.

---

## 🔐 Core Test Accounts

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Principal Partner (Admin)** | Adeola Kolawole | `admin@aalawsng.com` | `Admin@2024!` |
| **Associate Counsel** | Folashade Balogun | `associate@aalawsng.com` | `Staff@2024!` |
| **Paralegal** | Emeka Okonkwo | `paralegal@aalawsng.com` | `Staff@2024!` |
| **Client Portal** | Chukwuemeka Adeyemi | `client@demo.com` | `Client@2024!` |

---

## 📂 Project Structure

```
├── backend/                  # Node.js 20 + Express + Prisma ORM (PostgreSQL)
│   ├── src/
│   │   ├── routes/           # REST API endpoints (Auth, Clients, Matters, Trust, Invoices, etc.)
│   │   ├── middleware/       # RBAC guards, audit logging, rate limiting
│   │   └── lib/              # Clean seed, Prisma client, Paystack service
│   └── prisma/               # Database schema
├── frontend/                 # Next.js 16 + React 19 + TypeScript + Vanilla CSS
│   ├── app/                  # 27 responsive pages (Dashboard, Matters, Trust, Time, etc.)
│   ├── android/              # Native Android Studio project (Capacitor 6)
│   ├── ios/                  # Native iOS Xcode workspace (Capacitor 6)
│   └── public/               # Web App Manifest, icons, branding assets
├── deploy/                   # Docker Compose, Nginx SSL configs, VPS automation scripts
├── docs/                     # Comprehensive User Guide & Mobile Conversion Guide
└── .github/workflows/        # Automated Cloud CI/CD for Android APK & iOS builds
```

---

## 🚀 Local Development Setup

### Backend:
```bash
cd backend
npm install
npx prisma db push
npm run dev
```

### Frontend:
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`.

---

## 📱 Mobile App (Android & iOS)

- **Android APK**: Download directly from `https://portal.aalawsng.com/downloads/AALAWSNG.apk`.
- **Android Studio**: Open `frontend/android` with `npx cap open android`.
- **iOS Xcode**: Open `frontend/ios` with `npx cap open ios`.
- **PWA**: Open `https://portal.aalawsng.com` in Safari (iOS) or Chrome (Android) and tap **"Add to Home Screen"**.
