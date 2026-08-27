# AALAWSNG — Native Android & iOS Mobile Setup Complete

The native **Android** and **iOS** mobile application codebases have been generated and configured for **Adeola Kolawole & Associates** ([https://portal.aalawsng.com](https://portal.aalawsng.com)).

---

## 📂 Generated Mobile Project Directories

1. **Android Studio Native Project**:
   - Location: `frontend/android`
   - App ID: `com.aalawsng.portal`
   - Configured with official **AALAWSNG Circular Badge App Icons** across all densities (`mdpi` to `xxxhdpi`).
   - Hardened `AndroidManifest.xml` with Internet, Camera, Push Notifications, and Biometric authentication permissions.
2. **iOS Xcode Workspace**:
   - Location: `frontend/ios`
   - App ID: `com.aalawsng.portal`
   - Ready for opening in **Xcode (`App.xcworkspace`)** on macOS.
3. **Automated Cloud CI/CD Builder**:
   - Location: `.github/workflows/build_mobile_apps.yml`
   - Automatically builds Android `.apk`, Google Play `.aab`, and iOS Xcode packages in the cloud.

---

## 🚀 How to Build & Run Native Apps:

### 📱 1. For Android (Google Play Store or Direct APK Install):
To open the project in **Android Studio**:
```bash
cd frontend
npx cap open android
```
- **Direct APK (for testing on Android phones)**:
  - In Android Studio, go to **Build** ➔ **Build Bundle(s) / APK(s)** ➔ **Build APK(s)**.
  - Transfer the generated `app-debug.apk` directly to any Android device to install.
- **Google Play Store Release**:
  - Go to **Build** ➔ **Generate Signed Bundle / APK** ➔ Select **Android App Bundle (`.aab`)**.
  - Upload the `.aab` file to your **Google Play Developer Console**.

---

### 🍏 2. For iOS (Apple App Store / TestFlight):
To open the project in **Xcode** (on a Mac):
```bash
cd frontend
npx cap open ios
```
- Select your Development Team under **Signing & Capabilities**.
- Choose a connected iPhone or Simulator and press **Run (▶)**.
- For App Store submission: Select **Product** ➔ **Archive** ➔ **Distribute App** to upload to **TestFlight** and the **Apple App Store**.

---

## ⚡ 3. Instant Progressive Web App (PWA) — *Zero Store Approvals*

For instant mobile usage without waiting for store reviews:
- **iPhone (Safari)**: Open `https://portal.aalawsng.com` ➔ Tap **Share** ➔ Tap **"Add to Home Screen"**.
- **Android (Chrome)**: Open `https://portal.aalawsng.com` ➔ Tap **"Add to Home Screen"** / **"Install App"**.
