# LinkVault

A small URL shortener with click analytics, built with MongoDB, Express, React and Node.

**Live site:** _add your deployed link here_
**Repository:** _add your GitHub link here_

## What it does

- Turns a long URL into a short one (random 7-character code, or a custom alias you pick)
- Redirects visitors from the short link to the original URL
- Counts every click and records the referrer, browser and device
- Optional expiry date. After it passes, the link shows an "expired" page instead of redirecting
- Per-link stats page: clicks per day for the last 14 days, top referrers, browsers and devices
- Copy and delete links from a simple dashboard

There are no accounts. The first time you open the site, your browser generates a random id and sends it with every request, so you only ever see the links you created from that browser. This keeps the app easy to try without signing up. The trade-off is that clearing browser storage loses access to your dashboard (the short links themselves keep working).

## Tech stack

| Part | Tools |
| --- | --- |
| Database | MongoDB with Mongoose |
| Backend | Node.js, Express, helmet, cors, express-rate-limit |
| Frontend | React 18, React Router, Vite, plain CSS |

## How it works

**Creating a link** (`POST /api/links`): the URL is validated and normalised (only `http` and `https` are accepted, so things like `javascript:` URLs are rejected). If no alias is given, a random code is generated with Node's `crypto` module. The `code` field has a unique index in MongoDB, so if two requests ever produce the same code, the database rejects one and the server retries with a new code. Taken aliases return a `409`.

**Redirecting** (`GET /:code`): the server looks up the code, checks the expiry, logs the click and sends a `302`. I used `302` instead of `301` on purpose, because browsers cache `301` responses and repeat visits would never reach the server to be counted. The click is saved without making the visitor wait for the database write.

**Stats** (`GET /api/links/:code/stats`): uses MongoDB aggregation pipelines to group clicks by day, referrer, browser and device. Days with no clicks are filled in with zeros so the chart has no gaps.

Each link keeps a running `clicks` counter (updated with `$inc`) so the dashboard list does not have to count click documents. The detailed events live in a separate `clicks` collection, indexed on `{ link, createdAt }`.

Other details: rate limit of 20 link creations per minute per IP, request body size limit, reserved aliases (`api`, `stats`, ...) so they cannot clash with app routes, and shortening links that point back to the app itself is blocked.

## API

All `/api/links` routes need an `x-owner-id` header (the React app adds it automatically).

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/links` | Create a link. Body: `{ url, alias?, expiresAt? }` |
| GET | `/api/links` | List your links, newest first |
| GET | `/api/links/:code/stats` | Click statistics for one link |
| DELETE | `/api/links/:code` | Delete a link and its click history |
| GET | `/:code` | Public redirect to the original URL |
| GET | `/api/health` | Health check |

## Running locally

You need Node.js 18+ and a MongoDB database (local, or a free MongoDB Atlas cluster).

```bash
git clone <your-repo-url>
cd linkvault

# backend
cd server
cp .env.example .env      # then edit MONGODB_URI if needed
npm install
npm run dev               # http://localhost:5000

# frontend (in a second terminal)
cd client
npm install
npm run dev               # http://localhost:5173
```

Open http://localhost:5173. In development, Vite proxies `/api` calls to the backend. Short links created locally point at `http://localhost:5000/<code>`.

### Environment variables (`server/.env`)

| Name | Description |
| --- | --- |
| `PORT` | Port for the server (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `BASE_URL` | Optional. Public URL used when building short links. If empty it is taken from the request. |

## Deployment (Render + MongoDB Atlas)

In production the Express server also serves the built React app, so everything runs as one service.

1. Create a free cluster on MongoDB Atlas, add a database user, and allow access from anywhere (`0.0.0.0/0`). Copy the connection string.
2. Push this repo to GitHub.
3. On Render, create a new **Web Service** from the repo with:
   - Build command: `npm run build`
   - Start command: `npm start`
   - Environment variable: `MONGODB_URI` set to your Atlas connection string
4. Once it is live, open the URL and create a link to check that redirects work.

## Project structure

```
linkvault/
  client/            React app (Vite)
    src/pages/       Home (create + list), Stats, NotFound
    src/api.js       fetch helpers
  server/
    src/models/      Link, Click
    src/routes/      links (API), redirect
    src/utils/       code generation and URL validation, user-agent parsing
    src/index.js     app setup
```

## Possible improvements

- User accounts instead of a per-browser id
- Bulk delete and search on the dashboard
- Country-level analytics (needs an IP geolocation lookup)
- Automated tests for the API routes
