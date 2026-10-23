# LinkVault — Complete Backend Guide & Interview Cheatsheet

Welcome! This document explains **exactly how the LinkVault backend works** in simple, plain English. It includes **ASCII diagrams**, **point-by-point execution flows**, and **ready-to-use interview answers** so you can confidently answer any question from recruiters or judges.

---

## 1. High-Level Backend Flow Diagram

```
[ User Browser / Client ]
           │
           │ HTTP Request
           ▼
┌────────────────────────────────────────────────────────┐
│               EXPRESS.JS BACKEND (PORT 5001)           │
│                                                        │
│  1. Security & CORS (Helmet, CORS parser)              │
│  2. JSON Body Parser (express.json)                    │
│  3. Rate Limiter (Max 30 requests / 15 mins on create) │
│                                                        │
│  [ Router Layer: urlRoutes / redirectRoutes ]          │
│                      │                                 │
│                      ▼                                 │
│  [ Controller Layer: urlController / redirectController]│
│           │                               │            │
│           ▼ (Shorten / Analytics)         ▼ (Redirect) │
│    [ Mongoose Models ]             [ 302 Redirect ] ───┼──► [ Destination URL ]
│       - Url.js                            │            │
│       - Click.js                          ▼            │
│           │                     (Asynchronous Track)   │
│           ▼                     Parse UA + Save Click  │
│   [ MongoDB Database ]                    │            │
│           ▲                               ▼            │
│           └───────────────────────────────┘            │
└────────────────────────────────────────────────────────┘
```

---

## 2. Core Request Flows (Step-by-Step)

### Flow A: Shortening a Link (`POST /api/urls`)

```
User submits URL ──► Validate Protocol ──► Generate NanoID ──► Check Collision ──► Save to DB ──► Return 201 JSON
                        (http/https)          (7 chars)        (Retry up to 5x)
```

1. **Validation:** Checks if `originalUrl` starts with `http://` or `https://` using `validator.isURL()`.
2. **Custom Alias Check:** If user specified a custom alias (e.g. `summer-sale`), ensure it's not a reserved keyword (`api`, `health`, etc.) and doesn't already exist in the database.
3. **Collision-Proof ID Generation:** If no alias was specified, `nanoid(7)` generates a 7-character string. The server queries MongoDB to verify uniqueness. If a duplicate exists, it automatically regenerates a new one (up to 5 retries).
4. **Expiry Calculation:** If `expiresInDays` is selected, calculates `new Date(Date.now() + days * 86400000)`.
5. **Database Write:** Creates a document in MongoDB via Mongoose and returns HTTP `201 Created` with the new short URL.

---

### Flow B: Redirection & Click Tracking (`GET /:shortCode`)

```
User visits /xyz ──► Look up shortCode ──► Expired? (410) ──► Send HTTP 302 ──► Original Site
                                                                   │
                                                                   ▼ (Non-blocking background task)
                                                            Parse User-Agent & Referrer
                                                                   │
                                                                   ▼
                                                            Save Click to MongoDB
```

1. **Database Lookup:** Server searches for `shortCode` in the `Url` collection.
2. **Not Found:** If missing, returns `404 Not Found`.
3. **Expiry Check:** If `expiresAt` exists and is earlier than current time, returns `410 Gone`.
4. **Password Check:** If link is protected by a passcode and passcode doesn't match, returns `401 Unauthorized` password unlock screen.
5. **Immediate HTTP 302:** The server immediately issues `res.redirect(302, url.originalUrl)`.
6. **Non-Blocking Click Analytics:** In the background (without `await` in the redirect path), `ua-parser-js` extracts Browser, OS, and Device type, records the Referrer header, and increments the click count in MongoDB.

---

## 3. Top Interview Questions & How to Answer Them

### Q1: Why HTTP 302 instead of HTTP 301 for redirects?
> **Answer:** *"HTTP 301 is a Permanent Redirect, which browsers cache aggressively on disk. If we used 301, subsequent visits from the same user would bypass our server entirely, breaking click tracking and preventing link expiration. HTTP 302 is a Temporary Redirect, which forces the browser to hit our server every single time, ensuring 100% accurate analytics and instant expiry enforcement."*

### Q2: How does asynchronous click tracking work and why is it important?
> **Answer:** *"In a high-throughput URL shortener, the redirect speed is the critical user experience metric. We issue the `res.redirect(302)` response immediately, and fire `recordClickAsync()` as a detached promise with its own `.catch()` error handler. This guarantees database write latency or user-agent parsing never slows down the user's redirect."*

### Q3: How do you handle NanoID collisions?
> **Answer:** *"A 7-character nanoid has over 3.5 trillion unique combinations. While probability of collision is low, we implement a defensive retry loop: we query `Url.findOne({ shortCode })`. If it exists, we generate a fresh nanoid and retry up to 5 times before failing gracefully."*

### Q4: How does analytics aggregation work?
> **Answer:** *"We use MongoDB Aggregation Pipelines with `$match`, `$group`, `$sort`, and `$limit 5` stages. For clicks-per-day, we group clicks by date over the last 7 days and fill in zero-click days on the backend so charts always render continuously."*

---

## 4. Backend File Architecture

| File Path | Purpose |
|---|---|
| `server/src/server.js` | Entry point; connects to DB and starts HTTP server on port 5001 |
| `server/src/app.js` | Express app configuration, CORS, Helmet, and route mounting |
| `server/src/config/db.js` | MongoDB Mongoose connection with automatic in-memory fallback |
| `server/src/models/Url.js` | URL schema: `originalUrl`, `shortCode`, `clicks`, `expiresAt`, `passcode` |
| `server/src/models/Click.js` | Analytics schema: `urlId`, `timestamp`, `browser`, `os`, `device`, `referrer` |
| `server/src/controllers/urlController.js` | Handlers for create, list, edit (`PATCH`), delete, and analytics aggregation |
| `server/src/controllers/redirectController.js` | Fast 302 redirect handler + background click recorder |
| `server/src/middleware/rateLimiter.js` | Protects short-link creation (30 req / 15 min) |
| `server/src/middleware/errorHandler.js` | Centralized JSON error response handler |
| `server/tests/api.test.js` | Jest & Supertest automated API unit and integration test suite |
