# Letterboxd backend (POC)

A small Node/Express service that reads Letterboxd ratings and reviews and
automates login + review submission. Reads are scraped from Letterboxd's
server-rendered HTML; the authenticated actions drive a headless browser
(Puppeteer).

> **Prototype only.** This logs into Letterboxd with a username/password and
> scrapes its pages, which almost certainly breaks Letterboxd's Terms of Use
> and is brittle (markup and bot protection can change at any time). The
> durable path is Letterboxd's official OAuth API. Use this against accounts
> you control, for an internal demo, not production traffic.

## Setup

```bash
cd server
cp .env.example .env     # adjust if needed
npm install              # also downloads a Chromium for Puppeteer
npm start                # or: npm run dev  (auto-restart)
```

Server listens on `http://localhost:3000` by default.

## API

The `movie` parameter is always `"<title>-<releaseYear>"`. The trailing
four-digit group is treated as the year, so hyphenated titles work
(`spider-man-no-way-home-2021`).

### GET `/rating?movie=the-matrix-1999`

```json
{
  "movie": { "slug": "the-matrix", "name": "The Matrix", "year": 1999, "filmId": "51518" },
  "rating": {
    "average": 4.18, "averageOutOf10": 8.36,
    "bestRating": 5, "worstRating": 0.5,
    "ratingCount": 3129676, "reviewCount": 340312
  }
}
```

### GET `/reviews?movie=the-matrix-1999&page=1&sort=activity&limit=12`

`sort` is one of `activity` (default), `added`, `rating-highest`,
`rating-lowest`. Each review includes the reviewer, a 1–10 `rating` (and the
native `ratingStars` on the 0.5–5 scale), text, date, likes, spoiler flag, and
a permalink.

### POST `/login`

```json
{ "username": "you", "password": "secret" }
```

Returns an opaque session token. Passwords are never stored; only the
post-login cookies are kept in memory, keyed by the token.

```json
{ "token": "0p4qu3-t0k3n", "username": "you", "expiresInMs": 43200000 }
```

### POST `/review`

Send the session token as `Authorization: Bearer <token>`, an
`x-session-token` header, or a `token` field in the body.

```json
{ "movie": "the-matrix-1999", "rating": 9, "review": "Still holds up." }
```

`rating` is 1–10 and maps to Letterboxd's 10 half-star steps. The film is
resolved to its Letterboxd id from the title + year.

## How resolution and scraping work

Verified against the live site:

- **Film pages and review pages respond to plain `fetch`** (HTTP 200) with a
  browser-like User-Agent, so ratings and reviews are scraped directly, no
  browser needed.
- **The search endpoint rejects plain `fetch` (HTTP 403).** So resolution
  avoids search for the common case: it slugifies the title and tries
  `/film/<slug>/`, then `/film/<slug>-<year>/`, accepting the page only when its
  year matches. This correctly disambiguates, e.g. `dune-1984` → `dune` vs
  `dune-2021` → `dune-2021`, and handles hyphenated titles like
  `spider-man-no-way-home-2021`.
- **Search is the fallback** for titles the slug guess misses. Because search is
  gated, that fallback renders through the headless browser
  (`resolveViaSearch`), which needs Puppeteer's Chromium installed.
- **Rating** comes from the film page's JSON-LD `aggregateRating`.
- **Reviews** are parsed from `.viewing-list .listitem`: `.inline-rating` star
  glyphs (★ and ½) → 1–10, the `a.avatar` username, `.js-review-body` text,
  `.date`, and `.like-link-target`.

The read paths above were validated end to end. The **login** and
**review-submission** selectors (in `src/letterboxd/auth.js` and
`submitReview.js`, marked `#SELECTORS`) were **not** verified against a real
account and will likely need tuning. Run with `HEADLESS=false` to watch and
adjust those flows.

## Notes

- Reads (`/rating`, `/reviews`) work without Chromium. The search fallback,
  `/login`, and `/review` need the full Puppeteer install (run `npm install`
  without `PUPPETEER_SKIP_DOWNLOAD`).
- Sessions live in memory and expire after `SESSION_TTL_MINUTES`. Restarting
  the server drops them.
