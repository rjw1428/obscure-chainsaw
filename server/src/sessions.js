import { randomBytes } from 'node:crypto';
import { config } from './config.js';

/**
 * In-memory session store: maps an opaque token to a logged-in Letterboxd
 * cookie jar. This is a POC store; for production, persist encrypted and
 * outside process memory.
 *
 * A session holds the cookies captured right after a successful login, plus
 * the username and an expiry. Credentials (passwords) are never stored.
 */
const sessions = new Map(); // token -> { username, cookies, expiresAt }

export function createSession({ username, cookies }) {
  const token = randomBytes(24).toString('base64url');
  sessions.set(token, {
    username,
    cookies,
    expiresAt: Date.now() + config.sessionTtlMs,
  });
  return token;
}

export function getSession(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return s;
}

export function deleteSession(token) {
  return sessions.delete(token);
}

// Periodically evict expired sessions.
setInterval(() => {
  const now = Date.now();
  for (const [token, s] of sessions) {
    if (now > s.expiresAt) sessions.delete(token);
  }
}, 60 * 1000).unref();
