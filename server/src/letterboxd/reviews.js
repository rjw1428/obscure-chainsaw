import * as cheerio from 'cheerio';
import { config } from '../config.js';
import { fetchHtml } from '../http.js';

/**
 * Convert Letterboxd's star glyphs into a numeric score.
 * "★★★★" -> 4 stars -> 8/10; a trailing "½" adds half a star.
 * Returns { stars (0.5–5), score10 (1–10) } or null when unrated.
 */
function parseStars(text) {
  if (!text) return null;
  const full = (text.match(/★/g) || []).length;
  const half = text.includes('½') ? 0.5 : 0;
  const stars = full + half;
  if (stars === 0) return null;
  return { stars, score10: Math.round(stars * 2) };
}

const cleanName = (s) =>
  (s || '').replace(/^(watched|added|reviewed|rewatched)\s+by\s+/i, '').trim();

/**
 * Fetch a page of reviews for a resolved film.
 * @param {object} film  resolved film ({ slug, name, year })
 * @param {object} opts  { page = 1, limit = 12, sort = 'activity' }
 */
export async function getReviews(film, { page = 1, limit = 12, sort = 'activity' } = {}) {
  const sortPath = ['activity', 'added', 'rating-highest', 'rating-lowest'].includes(sort)
    ? sort
    : 'activity';
  const pagePart = page > 1 ? `page/${page}/` : '';
  const url = `${config.base}/film/${film.slug}/reviews/by/${sortPath}/${pagePart}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const reviews = [];
  $('.viewing-list .listitem').each((_, el) => {
    if (reviews.length >= limit) return;
    const $it = $(el);

    const ratingText = $it.find('.inline-rating').first().text().trim();
    const rating = parseStars(ratingText);

    const avatarHref = $it.find('a.avatar').first().attr('href') || '';
    const username = avatarHref.replace(/^\/|\/$/g, '') || null;
    const displayName = cleanName($it.find('.attribution-detail').first().text());

    // Prefer the full review body; fall back to the teaser paragraph.
    let body = $it.find('.js-review-body').first().text().trim();
    if (!body) body = $it.find('p.body-text').first().text().trim();

    const date =
      $it.find('.date time').first().attr('datetime') ||
      $it.find('time').first().attr('datetime') ||
      $it.find('.date').first().text().trim() ||
      null;

    const likesAttr = $it.find('.like-link-target').first().attr('data-count');
    const likes = likesAttr != null ? Number(likesAttr) : null;

    let permalink = $it.find('a.metadata').first().attr('href') || null;
    if (permalink) permalink = `${config.base}${permalink.replace(/#.*$/, '')}`;

    const containsSpoilers =
      $it.find('.contains-spoilers').length > 0 ||
      $it.find('.js-review-body.-hasspoilers, .-hasspoilers').length > 0;

    reviews.push({
      username,
      displayName: displayName || username,
      rating: rating ? rating.score10 : null, // 1–10
      ratingStars: rating ? rating.stars : null, // 0.5–5
      review: body || null,
      date,
      likes,
      containsSpoilers,
      permalink,
    });
  });

  return {
    movie: { slug: film.slug, name: film.name, year: film.year, filmId: film.filmId },
    page,
    sort: sortPath,
    count: reviews.length,
    reviews,
  };
}
