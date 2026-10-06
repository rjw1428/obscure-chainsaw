import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 3000),
  base: (process.env.LETTERBOXD_BASE || 'https://letterboxd.com').replace(/\/$/, ''),
  headless: String(process.env.HEADLESS ?? 'true') !== 'false',
  sessionTtlMs: Number(process.env.SESSION_TTL_MINUTES || 720) * 60 * 1000,
  userAgent:
    process.env.USER_AGENT ||
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  corsOrigin: process.env.CORS_ORIGIN || '',
};
