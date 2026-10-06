import { config } from '../config.js';
import { newPage } from '../browser.js';

/**
 * Log in to Letterboxd with Puppeteer and capture the session cookies.
 *
 * NOTE: The selectors below match Letterboxd's sign-in form at time of writing
 * but are NOT verified against a live login (no test account was provided).
 * Verify #SELECTORS against the real DOM and adjust if the flow breaks.
 *
 * @returns {Promise<{ username: string, cookies: object[] }>}
 */
export async function loginToLetterboxd(username, password) {
  const page = await newPage();
  try {
    await page.goto(`${config.base}/`, { waitUntil: 'domcontentloaded' });

    // Reveal the sign-in form if it is collapsed in the header. #SELECTORS
    const signInToggle = await page.$('.sign-in-menu a, a[href="/sign-in/"]');
    if (signInToggle) {
      await signInToggle.click().catch(() => {});
    }

    // The sign-in fields use name="username" / name="password". #SELECTORS
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    await page.type('input[name="username"]', username, { delay: 20 });
    await page.type('input[name="password"]', password, { delay: 20 });

    // Submit the form. #SELECTORS
    await Promise.all([
      page
        .click('.sign-in-form input[type="submit"], form#signin-form input[type="submit"], button[type="submit"]')
        .catch(() => page.keyboard.press('Enter')),
      page.waitForNetworkIdle({ idleTime: 1200, timeout: 15000 }).catch(() => {}),
    ]);

    // Success indicator: the member menu / avatar appears. #SELECTORS
    const loggedIn = await page
      .waitForSelector('.member-menu, a[href="/settings/"], .nav-account, .avatar.-a24', {
        timeout: 8000,
      })
      .then(() => true)
      .catch(() => false);

    if (!loggedIn) {
      // Look for an explicit error message to report. #SELECTORS
      const err = await page
        .$eval('.inline-error, .message-error, .error', (el) => el.textContent.trim())
        .catch(() => null);
      const e = new Error(err || 'Login failed: could not confirm a signed-in session.');
      e.status = 401;
      throw e;
    }

    const cookies = await page.cookies();
    return { username, cookies };
  } finally {
    await page.close().catch(() => {});
  }
}
