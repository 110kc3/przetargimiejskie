// Headless-browser fetch — renders a JavaScript-driven page and returns its HTML
// after the client-side scripts have populated the DOM.
//
// WHY THIS EXISTS. The pipeline is deliberately lean (no server, near-zero deps):
// almost every municipal BIP we cover is server-rendered, so plain `core/fetch.js`
// (getText) is enough. A few are NOT — they ship a ~4 KB shell and build the page
// in the browser (e.g. Jaworzno `bip.jaworzno.pl` / `bip.mznk.jaworzno.pl`, and
// Żory `zbmzory.bip.net.pl`, both showing "Wczytywanie…" in the raw HTML). getText
// can't see their content. This module renders such pages with headless Chromium.
//
// ⚠️ OPT-IN ONLY. Playwright + Chromium is a heavy dependency (~150 MB browser)
// relative to the rest of the pipeline. Do NOT use it for a city that has any
// server-rendered or JSON-API source — prefer those. Only reach for renderHtml
// when a source is genuinely client-rendered AND worth the weight.
//
// LIGHTER ALTERNATIVE — the JSON API. The client-rendered BIPs fetch their data
// from a JSON API (the `bip.net.pl` platform exposes `/api/page-content/…` and
// `/api/menus/<id>`; observed live on Żory). When you can find a source's API
// endpoint, hit it with plain `getText` and parse JSON — no browser needed, and
// it fits the lean design far better than this module. Use render.js only when no
// such endpoint can be found.
//
// CI: `npx playwright install --with-deps chromium` must run before the pipeline
// (wired in .github/workflows/refresh.yml). Locally: `npx playwright install chromium`.
//
// Lifecycle: one shared browser is launched lazily on first use; refresh.js calls
// closeBrowser() at the end of a run so the process can exit.

let browserPromise = null;

/** Lazily launch (and reuse) a single headless Chromium. */
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
      args: ['--no-sandbox', '--disable-dev-shm-usage'], // required on CI runners
    });
  }
  return browserPromise;
}

/**
 * Render `url` with headless Chromium and return the fully-populated HTML.
 * @param {string} url
 * @param {object} [opts]
 * @param {string}  [opts.waitForSelector]  CSS selector to wait for before reading
 *        the HTML — the most reliable "content has loaded" signal; pass the
 *        selector of the list/article container for the page in question.
 * @param {string}  [opts.waitUntil='networkidle']  Playwright load state.
 * @param {number}  [opts.timeout=30000]  ms.
 * @param {string}  [opts.userAgent]  browser-like UA (some WAFs want one).
 * @returns {Promise<string>} the rendered outerHTML of the document
 */
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

/** Close the shared browser (call once at the end of a pipeline run). No-op if
 *  renderHtml was never used, so refresh.js can always call it unconditionally. */
export async function closeBrowser() {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch {
    /* already gone */
  } finally {
    browserPromise = null;
  }
}
