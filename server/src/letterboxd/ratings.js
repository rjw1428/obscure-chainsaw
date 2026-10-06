import * as cheerio from 'cheerio';
import { config } from '../config.js';
import { fetchHtml } from '../http.js';

/**
 * Extract the parsed JSON-LD "Movie" object from a film page.
 * Letterboxd wraps the JSON in a CDATA comment, which we strip first.
 */
function parseFilmJsonLd(html) {
  const $ = cheerio.load(html);
  let parsed = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (parsed) return;
    const raw = $(el)
      .contents()
      .text()
      .replace(/\/\*\s*<!\[CDATA\[\s*\*\//, '')
      .replace(/\/\*\s*\]\]>\s*\*\//, '')
      .trim();
    try {
      const j = JSON.parse(raw);
      if (j && (j['@type'] === 'Movie' || j.aggregateRating)) parsed = j;
    } catch {
      /* try the next block */
    }
  });
  return parsed;
}

/**
 * Get the aggregate rating for a resolved film.
 * Letterboxd ratings are on a 0.5–5 scale; we also return a 0–10 value.
 */
export async function getRating(film) {
  const url = `${config.base}/film/${film.slug}/`;
  const html = await fetchHtml(url);
  const ld = parseFilmJsonLd(html);

  if (!ld || !ld.aggregateRating) {
    const e = new Error(`No rating data found for "${film.slug}".`);
    e.status = 404;
    throw e;
  }

  const agg = ld.aggregateRating;
  const average5 = typeof agg.ratingValue === 'number' ? agg.ratingValue : Number(agg.ratingValue);

  return {
    movie: {
      slug: film.slug,
      name: ld.name || film.name,
      year: film.year,
      filmId: film.filmId,
      url,
    },
    rating: {
      average: average5, // native Letterboxd scale (0.5–5)
      averageOutOf10: Number((average5 * 2).toFixed(2)),
      bestRating: agg.bestRating ?? 5,
      worstRating: agg.worstRating ?? 0.5,
      ratingCount: agg.ratingCount ?? null,
      reviewCount: agg.reviewCount ?? null,
    },
  };
}
