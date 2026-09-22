# College Bus Live Tracking & Transport Management System

A production-quality, zero-cost, multi-platform **College Bus Live Tracking and Transport Management System** built with **React, Vite, Tailwind CSS, React Native, Expo SDK, Supabase (PostgreSQL, Auth, Realtime), and OpenStreetMap (Leaflet)**.

---

## 🌟 Key Features

### 1. Driver Mobile Application (React Native / Expo)
- **Distraction-Free UI**: Designed specifically for safe usage by college drivers.
- **Start / Stop Trip**: Creates active trip entries in Supabase and initiates GPS telemetry.
- **Realtime Telemetry Engine**: Transmits latitude, longitude, speed, heading, and accuracy every 5 seconds.
- **Simulation Mode**: Built-in developer simulation toggle allowing automated bus movement along route stops for testing without driving.
- **Emergency SOS Alert**: One-touch breakdown/accident alert dispatch with exact GPS coordinates.
- **Offline Handling**: Queues GPS points during internet dropouts and syncs when connection restores.

### 2. Student Mobile Application (React Native / Expo)
- **Live Bus Map**: OpenStreetMap Leaflet WebView rendering of the student's assigned bus in real-time.
- **Boarding Stop & Route View**: Displays sequence of stops, scheduled arrival times, and destination.
- **ETA & Distance Indicator**: Shows distance to next stop and speed of assigned bus.
- **Broadcasting Feed**: Receives instant notifications for bus delays or route changes.

### 3. Admin Web Dashboard (React + Vite + Tailwind CSS)
- **Live Fleet Control Center**: Interactive OpenStreetMap tracking all active campus buses simultaneously.
- **Bus Management**: Full CRUD operations for fleet vehicles, seating capacity, driver assignments & status.
- **Driver Management**: Full CRUD for driver profiles, phone numbers, employee IDs & license tracking.
- **Student Directory & CSV Import**: Full student pass management with bulk `.csv` file import capability.
- **Route & Stop Sequencer**: Add transport routes, configure stop order, coordinates (lat/long) & pickup schedules.
- **Trip Log & GPS Path Replay**: View active/completed trips, replay historical GPS paths on OpenStreetMap, and export CSV logs.
- **Emergency Incident Command**: Sound/visual indicator for active driver SOS alerts with Acknowledge & Resolve controls.
- **Broadcasting System**: Dispatch notifications targeted to All Users, Specific Route, Specific Bus, or Drivers.
- **Analytics**: Transport utilization metrics, total distance logged, and trip duration statistics.

### 4. Admin Mobile Application (React Native / Expo)
- Mobile fleet monitoring with dashboard metrics.
- Emergency SOS response panel for on-the-go acknowledgment and resolution.
- Live active bus position monitor.

---

## 🏗️ Architecture

```
┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐   ┌────────────────┐
│ Driver App      │   │ Student App      │   │ Admin Mobile    │   │ Admin Web      │
│ (React Native)  │   │ (React Native)   │   │ (React Native)  │   │ (React + Vite) │
└────────┬────────┘   └────────┬─────────┘   └────────┬────────┘   └───────┬────────┘
         │                     │                      │                    │
         └─────────────────────┼──────────────────────┴────────────────────┘
                               │ (Supabase JS Client SDK)
                               v
               ┌─────────────────────────────────┐
               │    Supabase Central Backend     │
               ├─────────────────────────────────┤
               │ • Auth (JWT + RBAC Profiles)    │
               │ • PostgreSQL + RLS Security     │
               │ • Realtime WebSocket Engine     │
               │ • DB Triggers (Live Location)   │
               └─────────────────────────────────┘
```

---

## 📦 Project Structure

```
college-bus-tracking/
├── apps/
│   ├── admin-web/                 # Vite + React + Tailwind CSS Admin Dashboard
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── components/        # Sidebar, Navbar, LiveFleetMap (Leaflet OSM), StatCard
│   │       ├── pages/             # Dashboard, LiveTracking, Buses, Drivers, Students, Routes, Trips, Emergency, Notifications, Reports, Settings
│   │       └── App.tsx
│   └── mobile/                    # Multi-Role Expo React Native App
│       ├── app.json
│       └── src/
│           ├── app/               # Expo Router screens (index, driver, student, admin)
│           ├── components/        # OSMMapView (Leaflet WebView)
│           └── services/          # LocationTracker & Simulation Engine
├── packages/
│   └── shared/                    # Shared TypeScript interfaces, mock constants, simulation paths
├── supabase/
│   ├── migrations/                # SQL Schema, Triggers, RLS Policies, Indexes
│   └── seed/                      # Seed Data (Demo buses, drivers, routes, stops, students)
├── docs/                          # Architecture, Database, GPS, Deployment, Testing documentation
└── package.json                   # Root monorepo configuration
```

---

## 🚀 Quick Setup & Local Running Instructions

### Prerequisites
- **Node.js**: v18.0.0 or higher (v22 recommended)
- **npm**: v9.0.0 or higher

### Step 1: Install Dependencies
```bash
# Clone repository and install workspace dependencies at root
npm install
```

### Step 2: Run Admin Web Dashboard
```bash
# Start Vite development server
npm run dev:admin
```
Open browser at: `http://localhost:3000`

### Step 3: Run Mobile Application (Driver / Student / Admin)
```bash
# Start Expo development server
npm run dev:mobile
```
Press `w` in terminal for Web preview, or scan QR code with **Expo Go** app on Android/iOS!

---

## 🗄️ Database Setup (Supabase)

1. Create a free project at [Supabase.com](https://supabase.com).
2. Go to **SQL Editor** in Supabase Dashboard.
3. Run the schema script located at `supabase/migrations/20260918000000_initial_schema.sql`.
4. Run the seed script located at `supabase/seed/seed.sql`.
5. Copy your Supabase URL and Anon Key into `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🌐 Production Deployment

- **Admin Web Dashboard**: Deploy dist build (`npm run build:admin`) to **Vercel** or **Netlify** (Free tier).
- **Mobile Application**: Build Android APK using EAS Build (`eas build -p android --profile preview`) or run locally via Expo Go.

---

## 📄 License
MIT License - Open Source for College & Academic Use.
