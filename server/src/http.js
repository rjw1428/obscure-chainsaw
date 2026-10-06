import { config } from './config.js';

/**
 * Fetch a Letterboxd page as HTML with browser-like headers.
 * Used for read-only scraping (resolve, ratings, reviews), which is served
 * from server-rendered HTML and does not require a logged-in browser.
 *
 * If Letterboxd starts gating these pages behind bot protection, switch these
 * callers to render through Puppeteer (see browser.js) instead.
 */
export async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': config.userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  });
  if (!res.ok) {
    const err = new Error(`Upstream ${res.status} for ${url}`);
    err.status = res.status === 404 ? 404 : 502;
    throw err;
  }
  return res.text();
}
