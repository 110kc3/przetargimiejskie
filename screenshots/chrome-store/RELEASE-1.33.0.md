# v1.33.0 browser captures — 19 October 2026

`v1.33.0-web-catalog.png`, `v1.33.0-popup.png` and
`v1.33.0-extension-archive.png` are actual Playwright/Chromium captures of the
local assembled website and the unpacked Chrome extension, using committed
public JSON. GitHub data requests in the extension test are fulfilled with those
same local files; the interface and service worker run unchanged. The images
are not AI images or SVG illustrations. Source dates/status shown in the UI
belong to the retained public data, not a fabricated fresh crawl.

Reproduce after `bash build-site.sh /tmp/przetargi-b3-site`:

```sh
RUN_BROWSER_TESTS=1 RELEASE_SCREENSHOT_DIR=screenshots/chrome-store \
  node --test --test-reporter=dot pipeline/tests/catalog-browser.test.js
```

The older undated PNG/SVG set is historical illustrative material. Its city
counts and UI are not the v1.33.0 release. Use [WEB_STORE_LISTING.md](../../WEB_STORE_LISTING.md)
for the current copy and scope. Store submission remains an owner account step.
