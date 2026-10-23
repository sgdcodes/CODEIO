# LinkVault — Frontend Architecture & Guide

LinkVault's client is built with **React (Vite)**, plain CSS (no UI frameworks or Tailwind), and a modern glassmorphism aesthetic inspired by dark shader ambient gradients.

---

## 1. Frontend Structure Diagram

```
[ client/src/ ]
   │
   ├── main.jsx          ── Entry point, mounts <App /> to DOM
   ├── App.jsx           ── Layout root, BackgroundPaths canvas, Toaster, Navbar, Router
   │
   ├── [ components/ ]
   │     ├── Navbar.jsx         ── Top sticky navigation with logo and active links
   │     ├── PokemonWalker.jsx  ── Edge-to-edge animated Pokémon walking lane with cries & berry feeding
   │     └── BackgroundPaths.jsx── KokonutUI interactive flowing path canvas with cursor parting
   │
   ├── [ pages/ ]
   │     ├── Home.jsx           ── Shorten form, feature cards, live stats strip, result card
   │     ├── Dashboard.jsx      ── Search toolbar, sort dropdown, link cards, edit modal, deletion
   │     ├── Analytics.jsx      ── Recharts bar chart (7 days) and donut charts (browsers & devices)
   │     └── NotFound.jsx       ── 404 fallback page
   │
   ├── [ api/ ]
   │     └── client.js          ── Axios HTTP client with baseURL, helpers for all backend endpoints
   │
   └── [ styles/ ]
         └── global.css         ── Design tokens, CSS variables, keyframe animations, glass cards
```

---

## 2. Key Pages & Features

### 1. Home Page (`Home.jsx` & `Home.css`)
* **Hero Section:** Clear title and feature chips highlighting "100% Free", "Click Analytics", and "Custom Aliases".
* **Live Stats Strip:** Real-time platform count of total shortened links and total recorded clicks.
* **Shorten Form:** Input for target URL with optional custom alias, expiry dropdown, and optional password lock.
* **Pointwise Feature Cards:** 3 cards explaining Shortening & Branding, Auto-Expiry, and Real-Time Tracking.
* **Animated Result Card:** Slides in with one-click clipboard copy (`Copied ✓`) and test launch buttons.

### 2. Dashboard (`Dashboard.jsx` & `Dashboard.css`)
* **Live Filter & Sort:** Instant client-side search by short code or original URL, plus sorting by newest or most clicks.
* **Card Details:** Full clickable short URL, destination URL, click counter, and expiration badges (`ACTIVE`, `EXPIRING SOON`, `EXPIRED`, `🔒 PASS`).
* **Interactive Modal:** Edit destination URLs or extend expiration dates on the fly via `PATCH /api/urls/:id`.
* **Shimmer Skeletons:** Animated placeholder cards while loading.

### 3. Analytics Page (`Analytics.jsx` & `Analytics.css`)
* **7-Day Trend Chart:** Gradient Recharts `BarChart` with rounded tops showing daily click progression.
* **Donut Charts:** Recharts `PieChart` breaking down top browsers and visitor devices.
* **Top Referrers List:** Ranks inbound traffic sources (Direct, Google, Twitter, LinkedIn, etc.).

### 4. Ambient Background & PokéWalk
* **BackgroundPaths:** 42 layered ribbons that flow in the background and part organically as you move your mouse.
* **PokéWalk Lane:** 12 animated Pokémon walking across the screen with directional flipping, click-to-cry sound bubbles, and berry tossing.

---

## 3. Technology Stack Rules Followed
* **Zero UI Libraries:** 100% Plain CSS using CSS custom properties (`--primary`, `--card-bg`, etc.).
* **Pure React 18 with Vite:** Fast HMR and lightweight bundle size.
* **Recharts:** Clean data visualization for analytics.
* **Axios:** Streamlined API communication with timeout handling and error catching.
