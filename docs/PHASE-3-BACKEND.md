# Phase 3: Click Tracking, Analytics & Link Expiry

## Overview
Phase 3 introduces granular analytics and intelligent lifecycle management to **LinkVault**. Every time a user clicks a short link, the system captures deep contextual metrics (browser family, operating system, device form factor, and referrer), computes 7-day time-series aggregations, and strictly handles expired links.

---

## 1. Data Model (`Click`)

The Mongoose model is defined in `server/src/models/Click.js`:

```javascript
{
  urlId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Url', required: true, index: true },
  timestamp: { type: Date, default: Date.now },
  browser:   { type: String, default: 'Unknown' },
  os:        { type: String, default: 'Unknown' },
  device:    { type: String, default: 'Desktop' },
  referrer:  { type: String, default: 'Direct' }
}
```

---

## 2. Asynchronous Click Recording (Decoupled from Redirect)

When an incoming request hits `GET /:shortCode`:

```
User visits short link
        │
        ▼
Lookup URL in database & verify active status
        │
        ├───► [Async Fire-and-Forget Analytics] (NOT awaited)
        │           │
        │           ├── Parse User-Agent (ua-parser-js) -> Browser, OS, Device
        │           ├── Parse Referer header -> Hostname / Direct
        │           ├── Increment Url.clicks via $inc: { clicks: 1 }
        │           └── Insert Click document into MongoDB
        │
        └───► [Immediate Response]
                    │
                    ▼
              res.redirect(302, originalUrl)
```

### Why Asynchronous / Non-Blocking?
- **Speed & Latency**: A URL shortener's primary performance metric is redirection latency. If we awaited the database writes and header parsing before issuing the HTTP response, user redirection would be delayed by 30–80 milliseconds.
- **Fault Tolerance**: If the analytics collection encounters an issue (e.g., database connection spike), we catch it in `recordClickAsync(..).catch(...)`. The visitor's redirect **never fails or slows down**.

---

## 3. MongoDB Aggregation Pipelines Explained

The `GET /api/urls/:id/analytics` endpoint runs parallel aggregation queries to calculate top metrics.

### A. 7-Day Clicks Time-Series:
```javascript
Click.aggregate([
  // Stage 1: Filter to only this URL and the last 7 calendar days
  { $match: { urlId: targetUrlId, timestamp: { $gte: sevenDaysAgo } } },

  // Stage 2: Group clicks by date string (e.g., "2026-10-23")
  {
    $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
      count: { $sum: 1 }
    }
  },

  // Stage 3: Sort chronologically ascending
  { $sort: { _id: 1 } }
]);
```
*Zero-Fill Handling*: If a day had 0 visits, MongoDB omits that date. The controller iterates through the past 7 calendar days and backfills any missing days with `clicks: 0` so chart libraries receive a contiguous series.

### B. Top 5 Categories (Browsers, Devices, Referrers):
```javascript
Click.aggregate([
  // Stage 1: Match clicks belonging to the URL
  { $match: { urlId: targetUrlId } },

  // Stage 2: Group by dimension (e.g. $browser) and sum count
  { $group: { _id: '$browser', count: { $sum: 1 } } },

  // Stage 3: Order descending by popularity
  { $sort: { count: -1 } },

  // Stage 4: Take only the top 5
  { $limit: 5 },

  // Stage 5: Project clean output format
  { $project: { _id: 0, name: '$_id', count: 1 } }
]);
```

---

## 4. Link Expiration: Application-Level vs. MongoDB TTL

In LinkVault, we chose **Application-Level Expiration** over MongoDB TTL (Time-To-Live) indexes:
- **Why NOT MongoDB TTL?**: MongoDB TTL index physically deletes the document from disk when `expiresAt` passes. If the document is purged, visiting the expired link returns `404 Not Found` (indistinguishable from a broken or fake link), and all historical analytics are destroyed.
- **Application-Level Strategy**: When `expiresAt <= new Date()`, the document remains in the database. When visited, LinkVault explicitly returns `410 Gone` with a friendly message: *"This short link has expired and is no longer accessible"*. This allows the dashboard and analytics to continue showing historical performance while safely deactivating the link.

---

## 5. Rate Limiting Protection

To protect LinkVault from automated bots and denial-of-service abuse, `express-rate-limit` is attached to `POST /api/urls`:
- **Limit:** 30 link creation requests per IP address per 15-minute window.
- **Headers:** Sends standard `RateLimit-*` headers indicating remaining requests and reset timers.
- **Exceeded:** Returns `429 Too Many Requests`.

---

## 6. How to Test Analytics

### 1. Create a Link
```bash
curl -X POST http://localhost:5001/api/urls \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://wikipedia.org", "customAlias": "wiki"}'
```
*(Copy the returned `_id` and the short link).*

### 2. Simulate Different Visits
Simulate visits with different User-Agents and Referrers using `curl`:
```bash
# Chrome on macOS with Twitter referrer
curl -s http://localhost:5001/wiki \
  -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -e "https://t.co/somelink" > /dev/null

# Safari on iPhone with LinkedIn referrer
curl -s http://localhost:5001/wiki \
  -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" \
  -e "https://www.linkedin.com/feed/" > /dev/null

# Firefox on Linux with Direct visit
curl -s http://localhost:5001/wiki \
  -A "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0" > /dev/null
```

### 3. Retrieve Analytics Report
```bash
curl http://localhost:5001/api/urls/<LINK_ID>/analytics
```
**Sample Output:**
```json
{
  "success": true,
  "shortCode": "wiki",
  "totalClicks": 3,
  "status": "active",
  "clicksPerDay": [
    { "date": "2026-10-17", "clicks": 0 },
    { "date": "2026-10-18", "clicks": 0 },
    { "date": "2026-10-19", "clicks": 0 },
    { "date": "2026-10-20", "clicks": 0 },
    { "date": "2026-10-21", "clicks": 0 },
    { "date": "2026-10-22", "clicks": 0 },
    { "date": "2026-10-23", "clicks": 3 }
  ],
  "topBrowsers": [
    { "name": "Chrome", "count": 1 },
    { "name": "Mobile Safari", "count": 1 },
    { "name": "Firefox", "count": 1 }
  ],
  "topDevices": [
    { "name": "Desktop", "count": 2 },
    { "name": "Mobile", "count": 1 }
  ],
  "topReferrers": [
    { "name": "t.co", "count": 1 },
    { "name": "www.linkedin.com", "count": 1 },
    { "name": "Direct", "count": 1 }
  ]
}
```
