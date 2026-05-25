# Privacy Policy

**Extension:** ZGM Gliwice — auction history
**Publisher:** 110kc3 (https://github.com/110kc3)
**Effective date:** 2026-05-19
**Source code:** https://github.com/110kc3/przetargimiejskie (MIT-style attribution, fully open source)

This extension is a personal, free, open-source tool. It does not collect, transmit, sell, share, or monetize your personal data in any way.

## Summary in plain language

Everything the extension stores stays on your computer. The only network requests it makes are to (a) GitHub, to download an updated copy of the public auction dataset, and (b) the official ZGM Gliwice website, only as part of pages you are already viewing yourself. Nothing is sent to me, to a third-party server, to an analytics service, or to anyone else.

## What data the extension stores locally

The extension uses `chrome.storage.local` — a per-browser key-value store that lives on your computer — to remember the following:

| Key                  | What it is                                                                                          | Why                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `lang`               | Your chosen interface language (`pl` or `en`)                                                       | So the UI keeps your language preference between sessions                 |
| `watchlist`          | A list of property keys you have starred (e.g. `kozielska\|62\|III`) plus the time you starred them | So we can alert you when a watched property is listed for auction again   |
| `cache:properties`, `cache:active`, `cache:meta` | A cached copy of the public dataset fetched from GitHub                                             | So pages on `zgm-gliwice.pl` annotate instantly without re-downloading    |
| `notif:registry`     | A short map from notification IDs to property URLs                                                  | So clicking a notification opens the right detail page                    |

This data never leaves your computer. It is not synchronized to any cloud, it is not shared with the extension's developer, and it is not visible to Anthropic, Google, Anthropic-related services, or any third party.

## Network requests the extension makes

The extension makes exactly two kinds of network requests:

1. **GitHub static asset download.** The service worker fetches three small JSON files from this public, read-only URL prefix:
   - `https://raw.githubusercontent.com/110kc3/przetargimiejskie/main/data/gliwice/properties.json`
   - `https://raw.githubusercontent.com/110kc3/przetargimiejskie/main/data/gliwice/active.json`
   - `https://raw.githubusercontent.com/110kc3/przetargimiejskie/main/data/gliwice/meta.json`

   These files contain only public auction data scraped from the ZGM Gliwice website. The fetch sends only the standard headers a browser sends to download a public file — no cookies, no tokens, no user identifiers. GitHub's own privacy policy applies to these requests; see https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement.

2. **Pages on zgm-gliwice.pl.** The extension's content script runs only when you, the user, navigate to a page on `https://zgm-gliwice.pl/`. It reads the visible HTML of that page (e.g. a listing card or property detail) so it can decorate it with prior-auction information. It does not send any data from those pages to any external server — all processing happens in your browser.

The extension does **not** contact any other server. There is no analytics, no error reporting, no ad network, no tracking pixel.

## Permissions the extension requests, and why

| Permission                                                    | Reason                                                                            |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `storage`                                                     | To remember the four keys listed above on your computer                           |
| `alarms`                                                      | To wake up every ~4 hours and check whether any watched property is now listed    |
| `notifications`                                               | To show a desktop notification when a watched property is listed                  |
| `host_permissions: https://zgm-gliwice.pl/*`                  | So the content script can annotate pages on the auction website                   |
| `host_permissions: https://raw.githubusercontent.com/110kc3/przetargimiejskie/*` | So the service worker can fetch the public dataset JSON         |

## Data sharing, sale, or transfer

None. The extension does not share, sell, lease, transfer, or otherwise disclose your data to any third party. There is no third party involved at all, beyond your browser, GitHub (as a static file host), and the ZGM Gliwice website (as the source you are already visiting).

## Children's privacy

The extension does not knowingly collect any personal information. It does not have user accounts and it does not have a way to even identify a "user." It is therefore not directed at, and not problematic for, users of any age.

## Changes to this policy

If material aspects of the extension change — for example, if a new feature requires a new permission or if data is ever transmitted somewhere new — this policy will be updated in this repository at the same time the change ships. The `version` field in the extension's `manifest.json` and the "Effective date" above will both move together. The change history is auditable in git.

## Contact

For questions, complaints, or removal requests, open an issue at the public repository:

https://github.com/110kc3/przetargimiejskie/issues

The extension's source code, the dataset it fetches, and this policy itself all live there.

## Verification

Because the extension is open source, you can verify every claim in this document by inspecting the code yourself. The most relevant files:

- [`extension/manifest.json`](./extension/manifest.json) — permissions declared
- [`extension/background.js`](./extension/background.js) — all network requests
- [`extension/watchlist.js`](./extension/watchlist.js) — all `chrome.storage.local` writes for watchlist
- [`extension/i18n.js`](./extension/i18n.js) — language-preference storage
- [`extension/content.js`](./extension/content.js) — what runs on `zgm-gliwice.pl` pages

There is no other source of data in or out.
