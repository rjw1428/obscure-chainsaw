import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { parseMovieQuery, resolveFilm } from './letterboxd/resolve.js';
import { getRating } from './letterboxd/ratings.js';
import { getReviews } from './letterboxd/reviews.js';
import { loginToLetterboxd } from './letterboxd/auth.js';
import { submitReview } from './letterboxd/submitReview.js';
import { createSession, getSession } from './sessions.js';
import { closeBrowser } from './browser.js';

const app = express();
app.use(express.json());
app.use(cors(config.corsOrigin ? { origin: config.corsOrigin } : {}));

// Wrap async handlers so thrown errors reach the error middleware.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const tokenFrom = (req) =>
  (req.get('authorization') || '').replace(/^Bearer\s+/i, '') ||
  req.get('x-session-token') ||
  req.body?.token ||
  null;

app.get('/health', (_req, res) => res.json({ ok: true }));

// GET /rating?movie=<title>-<releaseYear>
app.get(
  '/rating',
  wrap(async (req, res) => {
    const film = await resolveFilm(parseMovieQuery(req.query.movie));
    const data = await getRating(film);
    res.json(data);
  }),
);

// GET /reviews?movie=<title>-<releaseYear>&page=1&sort=activity&limit=12
app.get(
  '/reviews',
  wrap(async (req, res) => {
    const film = await resolveFilm(parseMovieQuery(req.query.movie));
    const data = await getReviews(film, {
      page: Math.max(1, Number(req.query.page) || 1),
      limit: Math.min(50, Math.max(1, Number(req.query.limit) || 12)),
      sort: req.query.sort,
    });
    res.json(data);
  }),
);

// POST /login { username, password } -> { token, username, expiresAt }
app.post(
  '/login',
  wrap(async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required.' });
    }
    const { cookies } = await loginToLetterboxd(username, password);
    const token = createSession({ username, cookies });
    res.json({ token, username, expiresInMs: config.sessionTtlMs });
  }),
);

// POST /review { movie, rating (1-10), review } + session token
app.post(
  '/review',
  wrap(async (req, res) => {
    const session = getSession(tokenFrom(req));
    if (!session) {
      return res.status(401).json({ error: 'Invalid or missing session token. Log in first.' });
    }
    const { movie, rating, review } = req.body || {};
    if (!movie || rating == null || !review) {
      return res
        .status(400)
        .json({ error: 'movie, rating (1-10), and review are required.' });
    }
    const score = Number(rating);
    if (!Number.isFinite(score) || score < 1 || score > 10) {
      return res.status(400).json({ error: 'rating must be a number from 1 to 10.' });
    }
    const film = await resolveFilm(parseMovieQuery(movie));
    const result = await submitReview(session, film, { rating: score, review: String(review) });
    res.status(result.ok ? 201 : 202).json(result);
  }),
);

// Central error handler. Never leaks credentials; logs method+path only.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(`[${req.method} ${req.path}]`, err.message);
  res.status(status).json({ error: err.message || 'Internal error' });
});

const server = app.listen(config.port, () => {
  console.log(`letterboxd-backend listening on http://localhost:${config.port}`);
});

async function shutdown() {
  server.close();
  await closeBrowser().catch(() => {});
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
