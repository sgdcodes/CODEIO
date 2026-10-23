# 🔗 LinkVault - Smart URL Shortener & Analytics

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-lightgrey.svg)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple.svg)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen.svg)](https://mongoosejs.com/)
[![License](https://img.shields.io/badge/License-ISC-orange.svg)]()

> A lightning-fast, production-ready URL shortener with real-time visitor analytics, custom aliases, dynamic link expiration, and a vibrant glassmorphic UI.

---

## 🚀 Live Demo & Screenshots

- **Frontend Demo:** *[https://linkvault-client.vercel.app](https://linkvault-client.vercel.app)* *(Deploy link placeholder)*
- **Backend API:** *[https://linkvault-api.onrender.com](https://linkvault-api.onrender.com)* *(Deploy link placeholder)*

### Preview
```
+--------------------------------------------------------------------------+
|  LinkVault                 [Home]  [Dashboard]                           |
|                                                                          |
|       Shorten Links with Instant Superpowers                             |
|       Transform long, cumbersome URLs into clean short links             |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  | Destination URL: [ https://github.com/trending                   ] |  |
|  | Custom Alias:    [ gh-trends ]   Expiration: [ 7 Days         v ] |  |
|  |                                                                    |  |
|  |                      [ Shorten URL ⚡ ]                            |  |
|  +--------------------------------------------------------------------+  |
|                                                                          |
|  +-- Result Card -----------------------------------------------------+  |
|  | http://localhost:5001/gh-trends            [ 📋 Copy ] [ 🚀 Open ] |  |
|  +--------------------------------------------------------------------+  |
+--------------------------------------------------------------------------+
```

---

## ✨ Features

- **⚡ Sub-Millisecond Redirects**: HTTP 302 redirection completely decouples click analytics processing from the response path.
- **🏷️ Custom Aliases**: Customize short URLs (e.g., `/summer-sale`) with duplicate prevention and reserved route protection.
- **⏳ Dynamic Expiration**: Configurable lifetime (1 day, 7 days, 30 days, or permanent). Returns HTTP `410 Gone` when expired while preserving historical analytics.
- **📊 Granular Analytics**:
  - 7-day chronological click history (zero-filled for continuous trends).
  - Breakdown rankings for top 5 browsers, operating systems, devices, and referrers.
- **🛡️ Enterprise Hardening**:
  - `helmet` security headers.
  - Strict CORS policy.
  - `express-rate-limit` (30 link creations per 15 min per IP).
  - Protocol verification (`http://` / `https://` required).
  - Stack trace concealment in production.
- **🎨 Glassmorphic Interface**: Built with plain CSS variables, animated gradients, Poppins and Space Grotesk typography, and full mobile responsiveness.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js (ES Modules), Mongoose, nanoid (v3), ua-parser-js, express-rate-limit, helmet, cors, dotenv.
- **Frontend:** React.js 18, Vite, React Router DOM (v6), Recharts, Axios, react-hot-toast, Pure CSS3.
- **Database:** MongoDB (MongoDB Atlas or embedded in-memory fallback for immediate zero-config testing).

---

## 📂 Project Structure

```
CODEIO/
├── client/                     # Frontend Application (React + Vite)
│   ├── public/
│   │   └── favicon.svg         # SVG Brand Favicon
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js       # Axios client & API methods
│   │   ├── components/
│   │   │   ├── Navbar.jsx      # Sticky Glass Navbar
│   │   │   └── Navbar.css
│   │   ├── pages/
│   │   │   ├── Home.jsx        # Link shortener form & result card
│   │   │   ├── Home.css
│   │   │   ├── Dashboard.jsx   # Link grid, status badges & management
│   │   │   ├── Dashboard.css
│   │   │   ├── Analytics.jsx   # Recharts AreaChart & breakdown metrics
│   │   │   ├── Analytics.css
│   │   │   └── NotFound.jsx    # 404 page
│   │   ├── styles/
│   │   │   └── global.css      # CSS variables, glassmorphism, animations
│   │   ├── App.jsx             # React Router and Toaster provider
│   │   └── main.jsx            # React root mount
│   ├── index.html              # HTML shell & Google Fonts
│   ├── vite.config.js          # Vite config
│   ├── vercel.json             # Vercel SPA rewrite rule
│   └── package.json
│
├── server/                     # Backend Application (Node.js + Express)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js           # Mongoose connection & in-memory fallback
│   │   ├── controllers/
│   │   │   ├── urlController.js      # Shorten, list, delete, & analytics
│   │   │   └── redirectController.js # Fast HTTP 302 redirect & async logger
│   │   ├── middleware/
│   │   │   ├── errorHandler.js       # Centralized JSON error interceptor
│   │   │   └── rateLimiter.js        # IP rate limiter middleware
│   │   ├── models/
│   │   │   ├── Url.js                # URL schema with unique shortCode index
│   │   │   └── Click.js              # Click tracking event schema
│   │   ├── routes/
│   │   │   ├── urlRoutes.js          # /api/urls routes
│   │   │   └── redirectRoutes.js     # /:shortCode redirect route
│   │   ├── app.js                    # Express app & middleware setup
│   │   └── server.js                 # Server listener & port binding
│   ├── .env.example
│   └── package.json
│
├── docs/                       # Interview & Technical Documentation
│   ├── PHASE-1-BACKEND.md      # Setup, DB connection, & middleware flow
│   ├── PHASE-2-BACKEND.md      # Shortening, collision handling, & 302 redirect
│   ├── PHASE-3-BACKEND.md      # Click tracking, analytics pipelines, & expiry
│   ├── PHASE-4-BACKEND.md      # Frontend-backend communication & CORS
│   ├── PHASE-5-BACKEND.md      # Complete architecture cheat sheet & Q&A
│   └── SYSTEM-ARCHITECTURE.md  # Detailed system architecture & data flow
│
├── .gitignore                  # Git exclusions (node_modules, .env, dist)
└── README.md                   # Project overview & documentation
```

---

## ⚙️ Local Development Setup

### 1. Clone Repository
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd CODEIO
```

### 2. Setup Backend (`/server`)
```bash
cd server
npm install

# Copy environment template
cp .env.example .env
```

Your `server/.env` configuration:
```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/linkvault
BASE_URL=http://localhost:5001
CLIENT_URL=http://localhost:5173
```
> **Note on Port 5001:** Port 5001 is used by default because port 5000 is occupied by Apple's AirPlay Receiver on macOS.
> **Note on MongoDB:** If a local MongoDB daemon is not detected, LinkVault automatically initializes an embedded in-memory MongoDB instance for seamless local testing.

Start the backend:
```bash
npm run dev
# Backend running at http://localhost:5001
```

### 3. Setup Frontend (`/client`)
Open a new terminal window:
```bash
cd client
npm install

# Copy environment template
cp .env.example .env
```

Your `client/.env` configuration:
```env
VITE_API_URL=http://localhost:5001
```

Start the frontend:
```bash
npm run dev
# Frontend running at http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser.

---

## 📡 API Reference

| Method | Endpoint | Request Body | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | None | Server health check probe |
| `POST` | `/api/urls` | `{ originalUrl, customAlias?, expiresInDays? }` | Create a shortened link (Rate-limited) |
| `GET` | `/api/urls` | None | List all links with active/expired status |
| `DELETE` | `/api/urls/:id` | None | Delete a link and its click history |
| `GET` | `/api/urls/:id/analytics` | None | Retrieve 7-day stats and top categories |
| `GET` | `/:shortCode` | None | HTTP 302 redirect to destination |

---

## 🚢 Deployment Guide

### A. Database (MongoDB Atlas)
1. Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Go to **Network Access** and add IP `0.0.0.0/0` (allow access from anywhere).
3. Go to **Database Access** and create a user and password.
4. Click **Connect** -> **Drivers** (Node.js) and copy the connection string:
   `mongodb+srv://<username>:<password>@cluster0.mongodb.net/linkvault?retryWrites=true&w=majority`

### B. Backend Deployment (Render)
1. Push your repository to GitHub.
2. Sign up on [Render](https://render.com/) and create a **Web Service**.
3. Select your repository and set:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. In **Environment Variables**, add:
   - `PORT`: `10000`
   - `MONGO_URI`: Your MongoDB Atlas connection string.
   - `BASE_URL`: Your Render service URL (e.g., `https://linkvault-api.onrender.com`).
     *(Important: `BASE_URL` must point to the backend because redirection is handled by the backend server).*
   - `CLIENT_URL`: Your deployed frontend URL on Vercel.
   - `NODE_ENV`: `production`

### C. Frontend Deployment (Vercel)
1. Sign up on [Vercel](https://vercel.com/) and create a **New Project**.
2. Select your repository and configure:
   - **Root Directory:** `client`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. In **Environment Variables**, set:
   - `VITE_API_URL`: Your deployed backend URL (e.g., `https://linkvault-api.onrender.com`).
4. Click **Deploy**. React Router refresh routes are automatically routed via the included `vercel.json`.

---

## 📄 License
This project is open-source and available under the [ISC License](LICENSE).
