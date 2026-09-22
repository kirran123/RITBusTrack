# Official Production Deployment Guide
**Ramco Institute of Technology — College Bus Tracking System**

This guide provides simple, step-by-step instructions to deploy your Admin Web Portal and Mobile App online for free with a live HTTPS URL.

---

## 🚀 Option 1: Deploy Admin Web to Vercel (Recommended - 2 Minutes)

Vercel provides free instant HTTPS hosting with automatic continuous deployment from GitHub.

### Method A: Via GitHub & Vercel Dashboard (Easiest)
1. Push your repository to **GitHub**:
   ```bash
   git add .
   git commit -m "Official 30 buses release"
   git push origin main
   ```
2. Go to **[vercel.com](https://vercel.com)** and sign in with GitHub.
3. Click **"Add New Project"** and select your `bustrack` repository.
4. Set the project configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click "Edit" and choose `apps/admin-web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Click **"Deploy"**.
6. In ~45 seconds, Vercel gives you your live URL (e.g. `https://rit-bustrack.vercel.app`).

### Method B: Via Vercel CLI (Direct from Terminal)
```bash
# 1. Build the admin bundle
npm run build:admin

# 2. Deploy using npx
npx vercel apps/admin-web/dist --prod
```

---

## ⚡ Option 2: Deploy Admin Web to Netlify (Drag & Drop - 1 Minute)

1. Build the project locally:
   ```bash
   npm run build:admin
   ```
2. Open your file explorer and go to:
   `c:\Users\kishore ST\Desktop\bustrack\apps\admin-web\dist`
3. Go to **[app.netlify.com/drop](https://app.netlify.com/drop)**.
4. **Drag and drop** the `dist` folder into the Netlify drop zone.
5. Your web portal is instantly live on a custom `.netlify.app` URL with SSL!

---

## 🗄️ Option 3: Synchronize Supabase Database

To load all 30 real routes, drivers, and buses into your cloud database:

1. Log in to **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Select your project and click **SQL Editor** on the left navigation bar.
3. Click **"New query"**.
4. Open the file [`supabase/seed/seed.sql`](file:///c:/Users/kishore%20ST/Desktop/bustrack/supabase/seed/seed.sql) in this repository, copy all contents, and paste into the SQL editor.
5. Click **"Run"**.
6. All 30 official buses, drivers, registration numbers, routes, and coordinates will be active!

---

## 📱 Option 4: Mobile App Testing & APK Build

### Test on Physical Android / iOS Phone (Expo Go)
```bash
npm run dev:mobile
```
Scan the QR code with **Expo Go** on Android or the Camera app on iPhone.

### Generate Android APK for Drivers and Students
```bash
npx eas build -p android --profile preview
```
Download the generated `.apk` file directly to install on driver and student phones.
