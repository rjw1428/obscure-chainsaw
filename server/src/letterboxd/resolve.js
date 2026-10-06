import * as cheerio from 'cheerio';
import { config } from '../config.js';
import { fetchHtml } from '../http.js';
import { newPage } from '../browser.js';

/**
 * Parse a `movie` query of the form "<title>-<releaseYear>", where the title
 * may itself contain hyphens. The trailing 4-digit group is treated as the year.
 * e.g. "spider-man-no-way-home-2021" -> { title: "spider man no way home", year: 2021 }
 */
export function parseMovieQuery(movie) {
  if (!movie || typeof movie !== 'string') {
    const e = new Error('Missing "movie" query. Use ?movie=<title>-<releaseYear>.');
    e.status = 400;
    throw e;
  }
  const m = movie.trim().match(/^(.*?)-(\d{4})$/);
  if (!m) {
    const e = new Error('Invalid "movie". Expected "<title>-<releaseYear>", e.g. the-matrix-1999.');
    e.status = 400;
    throw e;
  }
  const title = m[1].replace(/-+/g, ' ').trim();
  const year = Number(m[2]);
  if (!title) {
    const e = new Error('Invalid "movie": empty title.');
    e.status = 400;
    throw e;
  }
  return { title, year };
}

// Cache resolved films so repeated requests skip the round-trip.
const cache = new Map(); // `${title}|${year}` -> resolved

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Read a film page (works over plain fetch) and extract name + year. */
async function getFilmInfo(slug) {
  let html;
  try {
    html = await fetchHtml(`${config.base}/film/${slug}/`);
  } catch (err) {
    if (err.status === 404) return { found: false };
    throw err;
  }
  const $ = cheerio.load(html);
  const yearText =
    $('a[href*="/films/year/"]').first().text().trim() ||
    ($('title').text().match(/\((\d{4})\)/) || [])[1] ||
    '';
  const year = Number(yearText) || null;
  const name =
    ($('meta[property="og:title"]').attr('content') || $('title').text() || '')
      .replace(/\s*\(\d{4}\).*$/, '')
      .trim() || slug;
  return { found: true, slug, year, name };
}

/**
 * Fallback resolver using Letterboxd search. The search endpoint rejects plain
 * fetch (HTTP 403), so this renders it through the headless browser, which
 * requires Puppeteer's Chromium to be installed.
 */
async function resolveViaSearch({ title, year }) {
  let page;
  try {
    page = await newPage();
  } catch (err) {
    const e = new Error(
      'Could not resolve film by direct slug, and the search fallback needs the ' +
        'Puppeteer browser (run `npm install` without PUPPETEER_SKIP_DOWNLOAD). ' +
        `Underlying: ${err.message}`,
    );
    e.status = 502;
    throw e;
  }
  try {
    await page.goto(`${config.base}/search/films/${encodeURIComponent(title)}/`, {
      waitUntil: 'domcontentloaded',
    });
    const candidates = await page.$$eval(
      '.search-result .react-component[data-item-slug]',
      (els) =>
        els.map((el) => {
          let ident = {};
          try {
            ident = JSON.parse(el.getAttribute('data-postered-identifier') || '{}');
          } catch {}
          const name = el.getAttribute('data-item-name') || '';
          return {
            slug: el.getAttribute('data-item-slug'),
            link: el.getAttribute('data-item-link'),
            name,
            bareTitle: name.replace(/\s*\(\d{4}\)\s*$/, ''),
            year: Number((name.match(/\((\d{4})\)\s*$/) || [])[1]) || null,
            filmId: typeof ident.uid === 'string' ? ident.uid.replace(/^film:/, '') : null,
            lid: ident.lid || null,
          };
        }),
    );
    const wantTitle = normalize(title);
    const exact = candidates.find(
      (c) => c.year === year && normalize(c.bareTitle) === wantTitle,
    );
    const sameYear = candidates.find((c) => c.year === year);
    return exact || sameYear || null;
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Resolve a title + year to a Letterboxd film. Tries a direct slug guess over
 * fetch first (fast, ungated), then the year-suffixed slug, then search.
 */
export async function resolveFilm({ title, year }) {
  const key = `${normalize(title)}|${year}`;
  if (cache.has(key)) return cache.get(key);

  const base = slugify(title);
  const guesses = [base, `${base}-${year}`];

  let resolved = null;
  for (const slug of guesses) {
    const info = await getFilmInfo(slug);
    if (info.found && info.year === year) {
      resolved = { slug: info.slug, filmId: null, lid: null, name: info.name, year, matchedBy: 'slug' };
      break;
    }
  }

  if (!resolved) {
    const hit = await resolveViaSearch({ title, year });
    if (hit) {
      resolved = {
        slug: hit.slug,
        filmId: hit.filmId,
        lid: hit.lid,
        name: hit.bareTitle || hit.name,
        year: hit.year ?? year,
        matchedBy: 'search',
      };
    }
  }

  if (!resolved) {
    const e = new Error(`No Letterboxd match for "${title}" (${year}).`);
    e.status = 404;
    throw e;
  }

  resolved.link = `/film/${resolved.slug}/`;
  cache.set(key, resolved);
  return resolved;
}
