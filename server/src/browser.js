import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { config } from './config.js';

puppeteerExtra.use(StealthPlugin());

let browserPromise = null;

/**
 * Lazily launch a single shared browser instance. Used for the interactive
 * flows (login, review submission) that need JavaScript and a real session.
 */
export async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteerExtra.launch({
      headless: config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });
  }
  return browserPromise;
}

/** Open a new page with our standard User-Agent and viewport. */
export async function newPage() {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(config.userAgent);
  await page.setViewport({ width: 1280, height: 900 });
  return page;
}

export async function closeBrowser() {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}
