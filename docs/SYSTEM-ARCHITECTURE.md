# LinkVault - System Architecture & Engineering Design

This document details the architectural blueprint, data flow pipelines, database design, and security model of **LinkVault**, a high-performance URL shortener with real-time analytics.

---

## 1. High-Level System Architecture

```
                                  ┌─────────────────────────────┐
                                  │      Client Applications    │
                                  │   (Desktop / Mobile Web)    │
                                  └──────────────┬──────────────┘
                                                 │
                                                 │ HTTPS
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │     Vercel Edge Network     │
                                  │   (React SPA / Vite App)    │
                                  └──────────────┬──────────────┘
                                                 │
                                                 │ REST API (JSON)
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Express.js Backend (Node.js)                                    │
│                                                                                                 │
│  ┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌─────────────────┐  │
│  │  Helmet Security│ ──► │   CORS Firewall  │ ──► │  Rate Limiting   │ ──► │  JSON Parser    │  │
│  └─────────────────┘     └──────────────────┘     └──────────────────┘     └─────────────────┘  │
│                                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                       API Routing Layer                                   │  │
│  │   • GET /api/health                                                                       │  │
│  │   • POST /api/urls         ──► urlController.createUrl                                     │  │
│  │   • GET /api/urls          ──► urlController.getUrls                                       │  │
│  │   • DELETE /api/urls/:id   ──► urlController.deleteUrl                                     │  │
│  │   • GET /api/urls/:id/stats──► urlController.getAnalytics                                 │  │
│  │   • GET /:shortCode        ──► redirectController.handleRedirect                           │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────┘  │
│             │                                                          │                        │
│             ▼                                                          ▼                        │
│   ┌──────────────────┐                                       ┌──────────────────┐               │
│   │  Synchronous DB  │                                       │ Asynchronous Job │               │
│   │    Operations    │                                       │ (Click Tracking) │               │
│   └─────────┬────────┘                                       └─────────┬────────┘               │
└─────────────┼──────────────────────────────────────────────────────────┼────────────────────────┘
              │                                                          │
              ▼                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     MongoDB Database Layer                                      │
│                                                                                                 │
│    ┌─────────────────────────────────────────┐       ┌──────────────────────────────────────┐   │
│    │               urls Collection           │       │           clicks Collection          │   │
│    │  • _id: ObjectId                        │◄──────┤  • urlId: ObjectId (Ref 'Url')       │   │
│    │  • originalUrl: String                  │ 1   N │  • timestamp: Date                   │   │
│    │  • shortCode: String (Unique Indexed)   │       │  • browser: String                   │   │
│    │  • clicks: Number                       │       │  • os: String                        │   │
│    │  • expiresAt: Date                      │       │  • device: String                    │   │
│    │  • createdAt / updatedAt: Timestamps    │       │  • referrer: String                  │   │
│    └─────────────────────────────────────────┘       └──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Request Lifecycles & Data Flow

### A. URL Shortening Pipeline (`POST /api/urls`)

```
User Input ──► [Sanitize & Trim] ──► [validator.isURL(http/https)]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
             Custom Alias Provided?                         Auto-Generate Code
                      │                                               │
             Validate format & length                       Call nanoid(7)
             Check against reserved list                    Query DB for collisions
             Query DB for existing conflict                 Retry loop (up to 5 times)
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              ▼
                                 Parse Optional Expiration Date
                                              │
                                              ▼
                                Persist Url Document in MongoDB
                                              │
                                              ▼
                                Return 201 Created with shortUrl
```

### B. High-Speed Redirection & Decoupled Analytics Pipeline (`GET /:shortCode`)

A primary goal of LinkVault is sub-millisecond redirection. Traditional architectures synchronously record analytics before redirecting, incurring noticeable database latency. LinkVault decouples tracking completely:

```
Visitor clicks Short URL
         │
         ▼
[1] Lookup shortCode in MongoDB (Indexed Query: O(log N))
         │
         ├── Document missing? ──► Return 404 JSON ("Short link not found")
         │
         ├── Expired?          ──► Return 410 JSON ("This short link has expired")
         │
         ▼
[2] Spawn Background Tracking (Non-Blocking Promise)
         │
         ├── Parse User-Agent with ua-parser-js (Browser, OS, Device)
         ├── Extract Referrer header
         ├── Increment Url.clicks counter atomically ($inc)
         └── Insert Click document into clicks collection
         │
         ▼
[3] Immediate HTTP 302 Found Response
         Location: <originalUrl>
         (Browser redirects instantly without waiting for step 2)
```

---

## 3. Database Schema & Indexing Strategy

### `urls` Collection
```json
{
  "_id": "ObjectId('6adb184de264264f19d7dfe6')",
  "originalUrl": "https://developer.mozilla.org/en-US/",
  "shortCode": "mdn-docs",
  "clicks": 142,
  "expiresAt": "2026-11-20T00:00:00.000Z",
  "createdAt": "2026-10-23T08:18:21.357Z",
  "updatedAt": "2026-10-23T08:18:21.357Z"
}
```
* **Indexes:**
  - `_id`: Primary index.
  - `shortCode`: Unique index (`{ shortCode: 1 }, { unique: true }`). Enables instantaneous lookup for incoming redirects and prevents duplicate short codes.

### `clicks` Collection
```json
{
  "_id": "ObjectId('6adb184de264264f19d7dffa')",
  "urlId": "ObjectId('6adb184de264264f19d7dfe6')",
  "timestamp": "2026-10-23T08:18:22.100Z",
  "browser": "Chrome",
  "os": "macOS",
  "device": "Desktop",
  "referrer": "linkedin.com"
}
```
* **Indexes:**
  - `urlId`: Foreign-key style index (`{ urlId: 1 }`). Guarantees high-speed execution of aggregation pipelines when generating link analytics.

---

## 4. Analytics Aggregation Engine

LinkVault leverages MongoDB’s Aggregation Pipeline to process analytics on-demand without maintaining pre-computed cache tables.

1. **7-Day Time Series Pipeline:**
   - Filters records by `{ urlId, timestamp: { $gte: sevenDaysAgo } }`.
   - Groups records by calendar day string: `YYYY-MM-DD`.
   - Aggregates daily click volume and fills empty days with zero counts to provide uninterrupted charts.
2. **Dimension Rankings (Browsers, Devices, Referrers):**
   - Matches records by `urlId`.
   - Groups by dimension field (`$browser`, `$device`, `$referrer`).
   - Sorts descending by volume (`{ count: -1 }`).
   - Limits to the top 5 entries for clean visual presentation.

---

## 5. Security & Hardening Measures

| Layer | Mechanism | Protection |
| :--- | :--- | :--- |
| **HTTP Headers** | `helmet` | Enforces Content Security Policy, X-Frame-Options (anti-clickjacking), HSTS, and X-Content-Type-Options (MIME sniffing defense). |
| **Cross-Origin Access** | `cors` | Restricts API access exclusively to trusted origins (`CLIENT_URL`), preventing unauthorized cross-origin browser requests. |
| **Rate Limiting** | `express-rate-limit` | Caps link creation to 30 requests per 15 minutes per IP address, stopping bot spam and automated denial-of-service attempts. |
| **Input Sanitization** | `validator` & Regex | Strict protocol verification (`http://` or `https://` required) and alphanumeric validation on custom aliases (`[a-zA-Z0-9-_]`). |
| **Information Hiding** | `errorHandler` | Suppresses runtime error stack traces in production to prevent leaking internal directory structures or database details. |

---

## 6. Deployment Topology

```
                  ┌────────────────────────────────────────┐
                  │                 Users                  │
                  └───────────────────┬────────────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        ┌──────────────────────┐             ┌──────────────────────┐
        │   Vercel Hosting     │             │    Render Hosting    │
        │   (Frontend App)     │             │    (Backend API)     │
        │  • React (Vite SPA)  │             │  • Express Web App   │
        │  • vercel.json rewrite│            │  • Node.js Runtime   │
        └──────────┬───────────┘             └──────────┬───────────┘
                   │                                    │
                   └─────────────────┬──────────────────┘
                                     │
                                     ▼
                        ┌─────────────────────────┐
                        │   MongoDB Atlas Cluster │
                        │   (Cloud Database)      │
                        │  • Encrypted in transit │
                        │  • Global Availability  │
                        └─────────────────────────┘
```
