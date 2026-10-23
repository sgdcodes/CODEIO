# Phase 1: Project Setup & Database Connection

## Overview
Phase 1 establishes the production-grade foundation of the **LinkVault** backend. It creates the core architectural skeleton using **Node.js**, **Express.js**, and **Mongoose** (MongoDB), configuring environment variables, cross-origin communication, security headers, and structured error handling.

---

## 1. File Structure & Responsibilities

| File / Folder | Role |
| :--- | :--- |
| `server/src/server.js` | **Server Entry Point**: Loads environment variables with `dotenv`, triggers the asynchronous MongoDB database connection, and binds the Express application to the designated port. |
| `server/src/app.js` | **Express Application Factory**: Configures middleware pipeline (`helmet`, `cors`, `express.json()`), defines core API routes (`/api/health`), and attaches the global error handler. Separation from `server.js` allows easy automated testing without port conflicts. |
| `server/src/config/db.js` | **Database Connector**: Encapsulates Mongoose connection logic with connection string parsing and error logging. |
| `server/src/middleware/errorHandler.js` | **Global Error Interceptor**: Catches unhandled errors or explicit error passes (`next(err)`), returning standardized JSON responses while suppressing stack traces in production. |
| `server/.env.example` | **Environment Template**: Declares required runtime variables (`PORT`, `MONGO_URI`, `BASE_URL`, `CLIENT_URL`) without leaking secrets. |

---

## 2. Server Startup & Request Lifecycle

```
[npm run dev / start]
        │
        ▼
   server.js ──────► Reads .env via dotenv.config()
        │
        ├───► Calls connectDB() in config/db.js (Mongoose connection)
        │
        └───► Imports app from app.js and invokes app.listen(PORT)
                    │
                    ▼
          [Incoming HTTP Request]
                    │
                    ▼
               1. helmet()              (Security headers)
                    │
                    ▼
               2. cors()                (Origin validation)
                    │
                    ▼
               3. express.json()        (Parses JSON body)
                    │
                    ▼
               4. Routes (/api/health)  (Handlers)
                    │
                    ▼
               5. errorHandler()        (Catches and formats any errors)
```

### Request Flow Explained (Interview Perspective):
1. When an HTTP request reaches the server, it enters the Express middleware stack sequentially.
2. `helmet()` attaches standard HTTP headers preventing clickjacking, MIME-sniffing, and cross-site scripting vulnerabilities.
3. `cors()` inspects the incoming `Origin` header against `CLIENT_URL` (allowing local development and blocking unauthorized cross-origin requests).
4. `express.json()` inspects `Content-Type: application/json` and parses the body into `req.body`.
5. The request hits matching route handlers (e.g., `GET /api/health`).
6. If an error is thrown or passed via `next(err)`, execution immediately skips to `errorHandler`.

---

## 3. Why Middleware Order Matters

In Express, middleware executes strictly in the order it is defined:
- **Body Parser First**: `express.json()` must be mounted before route handlers, otherwise route controllers receiving POST/PUT requests will find `req.body` as `undefined`.
- **CORS & Helmet First**: Security headers and CORS policies must wrap all incoming requests before processing so preflight `OPTIONS` requests and blocked origins are handled upfront.
- **Error Handler Last**: The error handling middleware takes 4 arguments `(err, req, res, next)`. Express specifically identifies 4-argument middleware as an error handler. It must be placed at the very bottom of `app.js` so any route or prior middleware can call `next(err)` and land in this centralized handler.

---

## 4. Endpoints Implemented

### Health Check
- **Method:** `GET`
- **URL:** `/api/health`
- **Description:** Verifies that the web server is running and responding.
- **Response:**
  ```json
  {
    "status": "ok"
  }
  ```
- **Status Code:** `200 OK`

---

## 5. How to Run and Test Phase 1

### Prerequisites
Make sure dependencies are installed in `server`:
```bash
cd server
npm install
```

### Running the Server
```bash
# Start in development mode with auto-reload:
npm run dev

# Or start in standard production mode:
npm start
```

### Testing the Health Endpoint
```bash
curl -i http://localhost:5001/api/health
```
**Expected Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"status":"ok"}
```
