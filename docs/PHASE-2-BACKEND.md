# Phase 2: Core Backend (Shorten & Redirect)

## Overview
Phase 2 implements the core URL shortening and redirection engine for **LinkVault**. It provides endpoints to generate unique short links, accept optional custom aliases, enforce link expiration dates, fetch existing links, and redirect visitors to their target destination with standard HTTP status codes.

---

## 1. Data Model (`Url`)

The Mongoose model is defined in `server/src/models/Url.js`:

```javascript
{
  originalUrl: { type: String, required: true, trim: true },
  shortCode:   { type: String, required: true, unique: true, index: true, trim: true },
  clicks:      { type: Number, default: 0 },
  expiresAt:   { type: Date, default: null },
  createdAt:   { type: Date }, // via timestamps: true
  updatedAt:   { type: Date }  // via timestamps: true
}
```

- **`shortCode` Index**: Marked with `unique: true` and `index: true` (creating a B-tree index in MongoDB) to guarantee \(O(\log N)\) instant lookups on redirection.
- **`expiresAt`**: Stores timestamp after which the link becomes inactive.

---

## 2. Link Creation Flow & Collision Handling

When a user calls `POST /api/urls`:

```
Client Request (POST /api/urls)
       │
       ▼
1. Validate originalUrl (must be valid http/https URL)
       │
       ├─► [Custom Alias provided?]
       │         │
       │         ├── YES: Validate format (3-20 chars, [a-zA-Z0-9-_]), check against reserved words,
       │         │        and query DB for conflicts. (Return 409 Conflict if taken).
       │         │
       │         └── NO:  Generate 7-char nanoId (e.g., "xK9_q1Z").
       │                  Loop with collision retry (up to 5 attempts) to guarantee uniqueness.
       │
       ▼
2. Parse expiresInDays: If provided, calculate expiresAt = Date.now() + days * 86400000.
       │
       ▼
3. Persist Url document in MongoDB.
       │
       ▼
4. Respond with 201 Created containing full shortUrl (BASE_URL + "/" + shortCode).
```

### Why Collision Handling is Crucial:
- `nanoid(7)` uses a 64-character URL-friendly alphabet (\(64^7 \approx 4.39 \text{ trillion combinations}\)).
- While the birthday paradox probability is low, production systems must never fail or overwrite existing data upon collision.
- The controller uses an optimistic loop: it generates a code, queries MongoDB with an indexed check, and retries up to 5 times. If all retries fail, it returns an explicit error rather than corrupting data.

---

## 3. Redirection Flow & Why HTTP 302 instead of 301

When a user visits `http://localhost:5001/:shortCode`:

```
Visitor clicks short URL: http://localhost:5001/my-deal
       │
       ▼
1. GET /:shortCode received (mounted after /api to prevent namespace collisions)
       │
       ▼
2. Find document: Url.findOne({ shortCode: "my-deal" })
       │
       ├─► Not found?  ──► Return 404 Not Found (JSON)
       │
       ├─► Expired?    ──► Return 410 Gone (JSON: "This short link has expired")
       │
       ▼
3. Record click analytics asynchronously (does not block redirect)
       │
       ▼
4. Return HTTP 302 Found with Location: originalUrl
```

### Why HTTP 302 (Found / Temporary) vs. HTTP 301 (Moved Permanently)?
- **HTTP 301 (Permanent Redirect)**: The visitor's browser caches the target URL indefinitely. Future clicks on the short link would bypass the backend server entirely and jump directly to the target URL from local browser cache. This would **break click tracking and analytics**.
- **HTTP 302 (Temporary Redirect)**: Instructs the browser: *"Go to the target destination, but always ask the backend server again next time."* This ensures every single click hits LinkVault, allowing continuous click counting, device tracking, and immediate enforcement of link expiration.

---

## 4. API Endpoints Table

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/urls` | Create a shortened URL | `201 Created`<br>`400 Bad Request`<br>`409 Conflict` |
| `GET` | `/api/urls` | List all URLs (newest first) | `200 OK` |
| `DELETE` | `/api/urls/:id` | Delete a URL and its analytics | `200 OK`<br>`400 Bad Request`<br>`404 Not Found` |
| `GET` | `/:shortCode` | Redirect to original target URL | `302 Found`<br>`404 Not Found`<br>`410 Gone` |

---

## 5. Testing with curl and Postman

### 1. Create Short URL (Auto-Generated Code)
```bash
curl -X POST http://localhost:5001/api/urls \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://news.ycombinator.com"}'
```

### 2. Create Short URL with Custom Alias and Expiry (e.g. 7 days)
```bash
curl -X POST http://localhost:5001/api/urls \
  -H "Content-Type: application/json" \
  -d '{
    "originalUrl": "https://github.com",
    "customAlias": "gh-code",
    "expiresInDays": 7
  }'
```

### 3. List All Links
```bash
curl http://localhost:5001/api/urls
```

### 4. Test Redirection in Terminal
```bash
# -i displays response headers (notice HTTP 302 and Location header)
curl -i http://localhost:5001/gh-code
```

### 5. Test Expired / Non-Existent Link
```bash
curl -i http://localhost:5001/unknown-link-123
```

### 6. Delete Link
```bash
curl -X DELETE http://localhost:5001/api/urls/<LINK_OBJECT_ID>
```
