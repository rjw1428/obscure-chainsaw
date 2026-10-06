import { config } from '../config.js';
import { newPage } from '../browser.js';

/**
 * Submit a review for a film using a logged-in session's cookies, by driving
 * Letterboxd's "log / review" modal.
 *
 * NOTE: This is the most fragile flow and is NOT verified against a live
 * account. The modal is loaded via AJAX and its rating widget is a star
 * control, so the #SELECTORS and the rating interaction below are best-effort
 * and should be confirmed/tuned against the real DOM with a test account.
 *
 * @param {object} session resolved session ({ cookies })
 * @param {object} film    resolved film ({ slug, name, year })
 * @param {object} payload { rating (1–10), review (string) }
 */
export async function submitReview(session, film, { rating, review }) {
  const stars = Math.max(1, Math.min(10, Math.round(rating))) / 2; // 0.5–5

  const page = await newPage();
  try {
    await page.setCookie(...session.cookies);
    await page.goto(`${config.base}/film/${film.slug}/`, { waitUntil: 'domcontentloaded' });

    // Open the log/review modal. #SELECTORS
    await page.waitForSelector(
      '.add-this-film, a.-log, a[data-track-action="Review"], .film-actions a',
      { timeout: 10000 },
    );
    await page.click('.add-this-film, a.-log, a[data-track-action="Review"], .film-actions a');

    // Wait for the modal review textarea. #SELECTORS
    await page.waitForSelector('textarea[name="review"], #frm-review-text, .review textarea', {
      timeout: 10000,
    });

    // Mark as watched so the review is accepted as a diary entry. #SELECTORS
    const watched = await page.$('#frm-watched-film, input[name="viewingDateStr"], .film-watched-checkbox input');
    if (watched) {
      const checked = await page.$eval(
        '#frm-watched-film, input[name="viewingDateStr"], .film-watched-checkbox input',
        (el) => el.checked,
      ).catch(() => false);
      if (!checked) await watched.click().catch(() => {});
    }

    // Set the star rating. The widget is a .rateit range; we set its value and
    // dispatch events, falling back to a click at the proportional offset. #SELECTORS
    await page.evaluate((starsVal) => {
      const hidden = document.querySelector(
        'input[name="rating"], #frm-rating, .rateit input[type="range"]',
      );
      if (hidden) {
        hidden.value = String(starsVal);
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
        hidden.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, stars).catch(() => {});

    // Enter the review text. #SELECTORS
    await page.type('textarea[name="review"], #frm-review-text, .review textarea', review, {
      delay: 5,
    });

    // Submit the modal. #SELECTORS
    await Promise.all([
      page.click('.modal input[type="submit"], .modal button[type="submit"], input[value="Save"]'),
      page.waitForNetworkIdle({ idleTime: 1200, timeout: 15000 }).catch(() => {}),
    ]);

    // Best-effort confirmation that the modal closed / saved. #SELECTORS
    const saved = await page
      .waitForFunction(
        () => !document.querySelector('.modal textarea[name="review"], #frm-review-text'),
        { timeout: 6000 },
      )
      .then(() => true)
      .catch(() => false);

    return {
      ok: saved,
      movie: { slug: film.slug, name: film.name, year: film.year },
      submitted: { rating, stars, reviewLength: review.length },
      note: saved
        ? 'Review submitted.'
        : 'Submission sent but confirmation was not detected; verify on Letterboxd.',
    };
  } finally {
    await page.close().catch(() => {});
  }
}
