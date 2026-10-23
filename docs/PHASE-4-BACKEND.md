# Phase 4: How the Frontend Talks to the Backend

## Overview
Phase 4 connects the React frontend (`/client`) with the Express backend (`/server`). Built with **Vite**, **React Router**, and **Axios**, the frontend communicates with the REST API using JSON payloads over HTTP, managing asynchronous network requests, dynamic toasts, error handling, and visual charts.

---

## 1. Network Architecture & CORS Setup

```
Browser Client (http://localhost:5173)
        │
        ├── API Calls (Axios) ──► http://localhost:5001/api/*
        │
        └── Direct Short Link ──► http://localhost:5001/:shortCode ──► HTTP 302 ──► Destination
```

### CORS Configuration:
In modern web applications, the frontend runs on port `5173` while the backend runs on port `5001`. Because these represent different origins (different ports), the browser blocks cross-origin XMLHttpRequests/fetch unless permitted by the backend.

In `server/src/app.js`:
```javascript
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from clientUrl, mobile apps, or curl
      if (!origin || origin === clientUrl || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
  })
);
```
- **Preflight Handling**: Express handles `OPTIONS` preflight requests automatically, returning `Access-Control-Allow-Origin: http://localhost:5173` and `Access-Control-Allow-Methods: GET, POST, DELETE`.

---

## 2. API Calls Made by Each Page

### 1. Home Page (`/`)
- **Action:** User submits a long URL with optional custom alias and expiration period.
- **API Call:** `POST /api/urls`
- **Request Payload:**
  ```json
  {
    "originalUrl": "https://example.com/very/long/path",
    "customAlias": "summer-promo",
    "expiresInDays": 7
  }
  ```
- **Backend Flow:** Controller validates URL and alias, calculates expiration, persists document in MongoDB, and responds with status `201 Created`.
- **Frontend Reaction:** Form clears, success toast fires ("Short link generated successfully!"), and interactive result card displays the short link with "Copy" and "Open" actions.

### 2. Dashboard Page (`/dashboard`)
- **Action A: Initial Load**
  - **API Call:** `GET /api/urls`
  - **Backend Flow:** Queries all links sorted by `createdAt: -1`, adds computed dynamic status (`active` or `expired`), and returns array.
  - **Frontend Reaction:** Displays responsive grid of cards with click counts, creation dates, and status badges.
- **Action B: Delete Link**
  - **API Call:** `DELETE /api/urls/:id`
  - **Backend Flow:** Deletes `Url` document from MongoDB and asynchronously cleans up orphaned `Click` records.
  - **Frontend Reaction:** Confirmation prompt, delete request, success toast, and optimistic state update removing the card from the UI.

### 3. Analytics Page (`/analytics/:id`)
- **Action:** User clicks "Analytics" from a dashboard card.
- **API Call:** `GET /api/urls/:id/analytics`
- **Backend Flow:** Runs parallel aggregation pipelines (`$match`, `$group`, `$sort`) calculating 7-day click history and top 5 browsers, devices, and referrers.
- **Frontend Reaction:** Renders Recharts gradient AreaChart, key performance indicators, and breakdown tables.

---

## 3. End-to-End Short URL Redirection Flow

Here is what happens when someone clicks or opens a generated short link:

```
Step 1: Visitor types or clicks: http://localhost:5001/summer-promo
        │
Step 2: Browser sends HTTP GET request to backend server
        │
Step 3: Backend Express router matches GET /:shortCode
        │
        ├── Lookup: Url.findOne({ shortCode: "summer-promo" })
        │     ├── If not found: Returns 404 JSON
        │     └── If expired:   Returns 410 Gone JSON
        │
Step 4: Non-Blocking Click Logging triggered in background
        ├── ua-parser-js parses browser ("Chrome"), OS ("macOS"), device ("Desktop")
        ├── Referrer header extracted
        └── MongoDB increments counter and inserts Click event
        │
Step 5: Backend responds immediately with HTTP 302 Found
        Header: Location: https://example.com/very/long/path
        │
Step 6: Visitor's browser receives 302 and navigates directly to target website
```

---

## 4. How to Run Client and Server Together

### Terminal 1: Start Backend Server
```bash
cd server
npm run dev
# Running on http://localhost:5001
```

### Terminal 2: Start Frontend Client
```bash
cd client
npm run dev
# Running on http://localhost:5173
```

Open `http://localhost:5173` in your browser to experience LinkVault!
