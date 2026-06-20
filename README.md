# RoutineFlow 🌀

RoutineFlow is a sleek, state-of-the-art **Behavioral Measurement & Routine Tracking System** designed to cultivate positive habits, visualize compliance consistency, and prevent behavioral drift. Built with **Next.js**, **TypeScript**, **Better Auth**, and **MongoDB**, it provides an elegant dashboard featuring rich visual aids, including interactive calendars, completion heatmaps, and compliance drift metrics.

---

## 🚀 Key Features

* **Interactive Dashboard**: Track your occurrences for the day, mark tasks as completed or skipped, and view delays in real time.
* **Multi-Engine Storage Layer**: Leverages native MongoDB collection queries with an automatic, queue-locked local JSON file backup mode (`db.json`) for environments without database access.
* **Dual-Mode Secure Authentication**:
  * **Social Login**: Google OAuth connection for rapid registration and profile synchronization.
  * **Passwordless Credentials**: Custom OTP-based email verification plugin with temporary OTP store cache.
* **Analytical Insights**:
  * **Discipline Score**: Computes a performance score based on completion rate, consistency, delay penalty, and current streaks.
  * **Drift Metric**: Rolling comparison tracking behavior shifts between consecutive 30-day windows.
  * **Weekly Stability**: Calculates the deviation and consistency of scheduled streaks.
  * **Annual Heatmap**: A GitHub-style yearly contribution chart mapped directly to completion percentages.
* **Timezone Localization**: Full support for timezone-specific occurrence generation and scheduling (e.g. `Asia/Dhaka`).

---

## 🛠️ Technology Stack

* **Framework**: Next.js 16 (App Router, Turbopack enabled)
* **Language**: TypeScript (Strict checks)
* **Database**: MongoDB (Native Driver)
* **Authentication**: Better Auth (with Social Providers and custom credentials plugins)
* **Styling**: Tailwind CSS & Custom CSS variables design tokens (from RoutineFlow design specifications)
* **Excel Export**: SheetJS (`xlsx`) for analytical data extraction

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory and configure the following parameters:

```env
# Database Connection
MONGODB_URI="mongodb://localhost:27017/routineflow"

# Better Auth Configuration
BETTER_AUTH_SECRET="your-high-entropy-32-char-secret-here"
BETTER_AUTH_URL="http://localhost:3000"

# Social Authentication Providers (Google)
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
```

---

## 🏃 Getting Started

### 1. Install Dependencies

Ensure you use `pnpm` to download packages:

```bash
pnpm install
```

### 2. Run the Development Server

Start the interactive development engine:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to launch the web client interface.

### 3. Production Build

Validate the application type safety and compile optimized server bundles:

```bash
pnpm build
```
