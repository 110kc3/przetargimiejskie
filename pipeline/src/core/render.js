let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    let chromium;
    try {
      ({ chromium } = await import('playwright'));
    } catch {
      throw new Error(
        "render.js needs Playwright. Run `npm install` in pipeline/ and " +
        "`npx playwright install chromium` (CI does this automatically).",
      );
    }
    browserPromise = chromium.launch({
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browserPromise;
}

export async function renderHtml(url, opts = {}) {
  const { waitForSelector, waitUntil = 'networkidle', timeout = 30000, userAgent } = opts;
  const browser = await getBrowser();
  const context = await browser.newContext(userAgent ? { userAgent } : {});
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil, timeout });
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout });
    }
    return await page.content();
  } finally {
    await context.close();
  }
}

export async function closeBrowser() {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch {
  } finally {
    browserPromise = null;
  }
}
