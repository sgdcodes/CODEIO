# LinkVault ⚡ — Production-Grade URL Shortener & Analytics

LinkVault is a modern, full-stack MERN application that transforms long URLs into short, branded links with real-time deep analytics, auto-expiration, passcode protection, and an interactive Pokémon walking lane.

---

## 🌟 Key Features

* **⚡ Ultra-Fast 302 Redirection:** Sub-millisecond redirects with decoupled, non-blocking click tracking.
* **🔒 Passcode Protection:** Optional password locks on sensitive links with an in-browser unlock screen.
* **⏳ Auto-Expiring Links:** Schedule links to expire in 1, 7, or 30 days (returns HTTP 410 Gone when expired).
* **📊 Deep Analytics:** 7-day click breakdowns, browser/device distribution donut charts, and top traffic referrers.
* **✏️ Real-Time Link Editing:** Update destination URLs or extend expiry dates directly from the dashboard without deleting links.
* **🛡️ Security & Rate Limiting:** Protected with `helmet`, input validation (`validator`), and rate limiting (30 requests / 15 mins).
* **🎨 Ambient Glassmorphism UI:** Built with plain CSS, interactive cursor-parting background ribbons, and animated Pokémon walkers.
* **🧪 Automated Test Suite:** Unit & integration tests powered by Jest & Supertest using an in-memory MongoDB server.

---

## 📂 Project Architecture

```
CODEIO/
├── server/                      # Express.js & MongoDB Backend
│   ├── src/
│   │   ├── config/db.js         # Mongoose DB connection (with auto memory fallback)
│   │   ├── controllers/         # urlController.js & redirectController.js
│   │   ├── models/              # Url.js & Click.js schemas
│   │   ├── routes/              # /api/urls and /:shortCode routes
│   │   ├── middleware/          # Rate limiting & global error handling
│   │   ├── app.js               # Express application config & security
│   │   └── server.js            # Server entry point (port 5001)
│   └── tests/api.test.js        # Jest / Supertest API test suite
│
├── client/                      # React (Vite) Frontend
│   ├── src/
│   │   ├── components/          # Navbar, BackgroundPaths, PokemonWalker
│   │   ├── pages/               # Home, Dashboard, Analytics, NotFound
│   │   ├── api/client.js        # Axios HTTP client
│   │   └── styles/global.css    # Design tokens & glassmorphism theme
│   └── index.html
│
└── docs/                        # Comprehensive Architecture & Interview Guides
    ├── BACKEND-ARCHITECTURE-AND-INTERVIEW-GUIDE.md
    ├── FRONTEND-ARCHITECTURE.md
    ├── SYSTEM-ARCHITECTURE.md
    └── PHASE-1 to PHASE-5 docs
```

---

## 🚀 Quick Start Guide

### Prerequisites
* Node.js (v18+)
* npm (v9+)

### 1. Start the Backend Server
```bash
cd server
npm install
npm run dev
```
* Backend runs on **`http://localhost:5001`**
* Test health check: `curl http://localhost:5001/api/health`

### 2. Start the Frontend Client
```bash
cd client
npm install
npm run dev
```
* Open your browser at **`http://localhost:5173`**

### 3. Run Automated Tests
```bash
cd server
npm test
```

---

## 📖 Detailed Documentation

* [Backend Architecture & Technical Specification](docs/BACKEND-ARCHITECTURE.md)
* [Frontend Architecture Guide](docs/FRONTEND-ARCHITECTURE.md)
* [Complete System Architecture](docs/SYSTEM-ARCHITECTURE.md)
