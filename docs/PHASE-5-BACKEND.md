# Phase 5: Complete Backend Architecture & Interview Cheat Sheet

This guide serves as a comprehensive, plain-language interview cheat sheet for the **LinkVault** backend architecture.

---

## 1. Quick Pitch (How to Introduce the Project in 30 Seconds)

> *"LinkVault is a URL shortener and click-analytics platform built with Node.js, Express, and MongoDB. It generates collision-resistant short codes using nanoid, supports custom aliases and expiration lifecycles, and provides deep click tracking across browsers, operating systems, devices, and referrers. Crucially, the redirection pipeline decouples click logging so user redirects execute in sub-milliseconds without waiting for analytics database writes."*

---

## 2. Complete Request Lifecycle Diagram (ASCII)

```
[Incoming Request]
       │
       ▼
1. helmet() ──────────────► Attaches secure HTTP response headers
       │
2. cors() ────────────────► Validates Origin header against CLIENT_URL
       │
3. express.json() ────────► Parses JSON body into req.body
       │
       ▼
[Route Resolution]
       │
       ├───► /api/health ────────► Returns { status: "ok" } (200)
       │
       ├───► /api/urls (POST) ───► Rate Limiter (30 req / 15 min)
       │                           ├── Validates URL (http/https required)
       │                           ├── Validates / generates unique 7-char code
       │                           ├── Saves to MongoDB Urls collection
       │                           └── Returns 201 Created
       │
       ├───► /api/urls (GET) ────► Fetches all links (newest first)
       │                           Calculates dynamic "status" (active/expired)
       │
       ├───► /api/urls/:id (DEL) ► Deletes Url and deletes associated Clicks
       │
       ├───► /api/urls/:id/stats ► Runs MongoDB aggregation pipelines:
       │                           - 7-day click history (zero-filled)
       │                           - Top 5 browsers, devices, and referrers
       │
       └───► /:shortCode (GET) ──► Looks up link in MongoDB
                                   ├── Missing?  ──► 404 Not Found
                                   ├── Expired?  ──► 410 Gone
                                   └── Active:
                                         ├── Fires async click logger (UAParser + Click doc)
                                         └── Immediately returns HTTP 302 Found
```

---

## 3. Data Models Summary

### `Url` Model (`server/src/models/Url.js`)
- `originalUrl` *(String, required)*: The target destination.
- `shortCode` *(String, required, unique, indexed)*: The identifier (e.g. `promo26` or `xK9_q1Z`).
- `clicks` *(Number, default 0)*: Total click counter for \(O(1)\) summary lookups.
- `expiresAt` *(Date, default null)*: Optional timestamp marking link expiration.
- `createdAt` / `updatedAt`: Auto-managed timestamps.

### `Click` Model (`server/src/models/Click.js`)
- `urlId` *(ObjectId, ref: 'Url', indexed)*: Foreign key referencing the parent URL.
- `timestamp` *(Date, default now)*: When the click event occurred.
- `browser` *(String)*: Detected browser (e.g., "Chrome", "Safari", "Firefox").
- `os` *(String)*: Detected operating system (e.g., "macOS", "Windows", "iOS").
- `device` *(String)*: Form factor ("Desktop", "Mobile", "Tablet").
- `referrer` *(String, default "Direct")*: Originating website domain.

---

## 4. API Endpoints Reference

| Method | Path | Request Body | Success Code | Error Codes | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | None | `200 OK` | - | Health probe |
| `POST` | `/api/urls` | `{ originalUrl, customAlias?, expiresInDays? }` | `201 Created` | `400`, `409`, `429` | Rate-limited to 30 req/15 min |
| `GET` | `/api/urls` | None | `200 OK` | `500` | Newest first, with active/expired badge |
| `DELETE`| `/api/urls/:id` | None | `200 OK` | `400`, `404` | Deletes link and cascades clicks |
| `GET` | `/api/urls/:id/analytics` | None | `200 OK` | `400`, `404` | 7-day time series & Top 5 aggregations |
| `GET` | `/:shortCode` | None | `302 Found` | `404`, `410` | Non-blocking analytics logging |

---

## 5. Key Interview Questions & Answers

### Q1: Why use HTTP 302 instead of HTTP 301 for short link redirection?
> **Answer:** *"HTTP 301 is a permanent redirect that browsers cache aggressively on client devices. If we returned 301, subsequent visits from that browser would never reach our server, destroying our analytics and preventing us from enforcing link expiration. HTTP 302 is a temporary redirect, instructing the browser to always check with our server each time the link is clicked."*

### Q2: How did you ensure analytics collection doesn't slow down the redirection?
> **Answer:** *"In `redirectController.js`, once the URL is verified as active, we invoke `recordClickAsync(url._id, req)` as an un-awaited Promise and immediately return `res.redirect(302, url.originalUrl)`. Any database writes or user-agent parsing happen in the event loop background, keeping redirection latency strictly sub-millisecond."*

### Q3: How do you handle collisions with nanoid?
> **Answer:** *"Although nanoid(7) has over 4.3 trillion permutations, we implement an optimistic retry loop. When a code is generated, we query MongoDB against the indexed `shortCode` field. If a conflict occurs, it retries up to 5 times before throwing a safe error, preventing duplicate keys or data corruption."*

### Q4: Why did you choose application-level expiry instead of MongoDB TTL?
> **Answer:** *"A MongoDB TTL index physically deletes documents from disk when `expiresAt` passes. That would cause expired links to return 404 (indistinguishable from bad links) and would wipe out all historical analytics. With application-level expiry, we retain the historical data and explicitly return HTTP 410 Gone, communicating the exact status to both users and web crawlers."*

### Q5: What security practices were implemented?
> **Answer:** *"We hardened the application with Helmet for HTTP headers, restricted CORS to the verified client domain, implemented rate limiting to prevent bot abuse, validated and sanitized all input protocols, and ensured error stack traces are suppressed in production."*
