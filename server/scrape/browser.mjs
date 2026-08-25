/**
 * Optional real-browser fetch (Playwright/Chromium).
 *
 * Enabled with PLAYWRIGHT=1 (always on the deployed VM; off by default in
 * sandboxes without a browser binary). Plain fetch is always tried first —
 * it's faster and lighter; the browser is only the fallback when a site
 * bot-blocks the plain request (403/429/503/empty page).
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = (async () => {
      try {
        const { chromium } = await import('playwright');
        return await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
        });
      } catch (e) {
        browserPromise = null; // allow retry later
        return null;
      }
    })();
  }
  return browserPromise;
}

export function browserEnabled() {
  return process.env.PLAYWRIGHT === '1' || process.env.PLAYWRIGHT === 'true';
}

/** Returns { html, viaBrowser } or null when unavailable/failed. */
export async function fetchWithBrowser(url, { timeout = 30000 } = {}) {
  if (!browserEnabled()) return null;
  const browser = await getBrowser();
  if (!browser) return null;
  let ctx = null;
  try {
    ctx = await browser.newContext({
      userAgent: UA,
      locale: 'en-US',
      viewport: { width: 1366, height: 900 },
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    await page.waitForTimeout(700); // let lazy JSON-LD settle
    const html = await page.content();
    return { html, viaBrowser: true };
  } catch (e) {
    return { error: String(e.message || e) };
  } finally {
    if (ctx) await ctx.close().catch(() => {});
  }
}

export async function closeBrowser() {
  if (browserPromise) {
    const b = await browserPromise;
    if (b) await b.close().catch(() => {});
    browserPromise = null;
  }
}

export function looksBlocked(status, html) {
  if (!html) return status >= 400;
  if (status === 403 || status === 429 || status === 503) return true;
  const head = html.slice(0, 6000).toLowerCase();
  return (
    head.includes('just a moment') ||
    head.includes('cf-browser-verification') ||
    head.includes('cf_chl') ||
    head.includes('access denied') ||
    head.includes('are you a robot') ||
    head.includes('captcha')
  );
}
