# Privacy Policy

**Extension:** Przetargi miejskie
**Publisher:** KAMIL CHOIŃSKI IT (KC-IT) · 110kc3 (https://github.com/110kc3)
**Effective date:** 2026-08-02
**Applies to:** extension version 1.32.0 and later
**Source code:** https://github.com/110kc3/przetargimiejskie (MIT-style attribution, fully open source)

This extension is a free, open-source tool. It does not collect, transmit, sell, share, or monetize your personal data in any way.

> **Scope note.** This policy covers the **browser extension** only. The website
> przetargimiejskie.pl is a separate surface with its own policy (it uses
> cookieless analytics, which the extension does not) — see
> https://przetargimiejskie.pl/privacy.

## Summary in plain language

Everything the extension stores stays on your computer. The only network requests it makes are to (a) GitHub, to download an updated copy of the public auction dataset, and (b) the official municipal websites listed below, only as part of pages you are already viewing yourself. Nothing is sent to me, to a third-party server, to an analytics service, or to anyone else.

## Cities covered

The extension works with public auction data for **nine cities in the Śląskie voivodeship**:

Gliwice · Katowice · Bytom · Zabrze · Sosnowiec · Rybnik · Bielsko-Biała · Mysłowice · Świętochłowice

(The przetargimiejskie.pl website publishes data for many more cities. The extension's own coverage is the nine above, and this policy describes only the extension.)

## What data the extension stores locally

The extension uses `chrome.storage.local` — a per-browser key-value store that lives on your computer — to remember the following:

| Key | What it is | Why |
| --- | --- | --- |
| `lang` | Your chosen interface language (`pl` or `en`) | So the UI keeps your language preference between sessions |
| `theme` | Your chosen light/dark theme | So the UI keeps your appearance preference between sessions |
| `minHistoryYear` | The earliest year of auction history you want shown | So the history filter keeps your setting between sessions |
| `watchlist` | A list of property keys you have starred (e.g. `kozielska\|62\|III`) plus the time you starred them | So the extension can alert you when a watched property is listed for auction again |
| `cache:v<n>:<cities>:merged` | A cached copy of the public dataset fetched from GitHub | So pages annotate instantly without re-downloading |
| `notif:registry` | A short map from notification IDs to property URLs | So clicking a notification opens the right detail page |
| `remind:sent` | Which reminders have already been shown | So the same auction deadline is not announced twice |
| `watchlist:migrated_v2` | A one-off flag marking that an old watchlist format was upgraded | So the upgrade runs once and not on every start |

This data never leaves your computer. It is not synchronized to any cloud, it is not shared with the extension's developer, and it is not visible to any third party. Uninstalling the extension deletes all of it.

## Network requests the extension makes

The extension makes exactly two kinds of network requests:

1. **GitHub static asset download.** The service worker fetches small public JSON files, for each of the nine cities, from this public, read-only URL prefix:

   `https://raw.githubusercontent.com/110kc3/przetargimiejskie/main/data/<city>/`

   — namely `properties.json` and `active.json`. These files contain only public auction data published by the municipalities themselves. The fetch sends only the standard headers a browser sends to download a public file — no cookies, no tokens, no user identifiers. GitHub's own privacy policy applies to these requests; see https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement.

   The service worker also re-checks these files roughly every four hours (see the `alarms` permission below) so that watched properties can be flagged promptly.

2. **Pages on the municipal websites you visit.** The extension's content script runs only when you, the user, navigate to a page on one of these hosts:

   `zgm-gliwice.pl` · `bip.katowice.eu` · `katowice.eu` · `i-biip.um.bytom.pl` · `bytom.pl` · `www.bytom.pl` · `bip.zgm.rybnik.pl` · `bip.myslowice.pl` · `bip.swietochlowice.pl` · `www.bip.swietochlowice.pl` · `bielsko-biala.pl` · `www.bielsko-biala.pl`

   It reads the visible HTML of that page (e.g. a listing card or property detail) so it can decorate it with prior-auction information. It does **not** send any data from those pages to any external server — all processing happens in your browser.

The extension does **not** contact any other server. There is no analytics, no error reporting, no ad network, and no tracking pixel anywhere in the extension.

## Permissions the extension requests, and why

| Permission | Reason |
| --- | --- |
| `storage` | To remember the keys listed above on your computer |
| `alarms` | To wake up every ~4 hours and check whether any watched property is now listed |
| `notifications` | To show a desktop notification when a watched property is listed or a deadline nears |
| `host_permissions: https://raw.githubusercontent.com/110kc3/przetargimiejskie/*` | So the service worker can fetch the public dataset JSON |
| `host_permissions:` `zgm-gliwice.pl`, `bip.katowice.eu`, `i-biip.um.bytom.pl`, `www.bytom.pl` | So the extension can read those municipal pages to annotate them |
| `content_scripts` on the twelve hosts listed above | So the on-page annotation runs when you visit an auction listing |

The extension requests no other permissions. In particular it does not request `tabs`, `history`, `cookies`, `webRequest`, or access to any host beyond those named above.

## Data sharing, sale, or transfer

None. The extension does not share, sell, lease, transfer, or otherwise disclose your data to any third party. There is no third party involved at all, beyond your browser, GitHub (as a static file host), and the municipal websites you are already visiting.

## Children's privacy

The extension does not knowingly collect any personal information. It does not have user accounts and it has no way to identify a "user" at all. It is therefore not directed at, and not problematic for, users of any age.

## Changes to this policy

If material aspects of the extension change — for example, if a new feature requires a new permission, if the list of covered cities or hosts changes, or if data is ever transmitted somewhere new — this policy will be updated in this repository at the same time the change ships. The `version` field in the extension's `manifest.json` and the "Effective date" above will both move together. The change history is auditable in git.

## Contact

For questions, complaints, removal requests, or partnership/business enquiries, email:

kontakt@przetargimiejskie.pl

Or open an issue at the public repository:

https://github.com/110kc3/przetargimiejskie/issues

The extension's source code, the dataset it fetches, and this policy itself all live there.

## Verification

Because the extension is open source, you can verify every claim in this document by inspecting the code yourself. The most relevant files:

- [`extension/manifest.json`](./extension/manifest.json) — permissions and hosts declared
- [`extension/background.js`](./extension/background.js) — all network requests, the city list, the 4-hour alarm, and the cache/notification keys
- [`extension/watchlist.js`](./extension/watchlist.js) — all `chrome.storage.local` writes for the watchlist
- [`extension/i18n.js`](./extension/i18n.js) — language-preference storage
- [`extension/theme.js`](./extension/theme.js) — theme-preference storage
- [`extension/settings.js`](./extension/settings.js) — the history-year setting
- [`extension/content.js`](./extension/content.js) + [`extension/sites/`](./extension/sites) — what runs on municipal pages

There is no other source of data in or out.
