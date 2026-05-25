# Multi-city expansion & monetization plan

> **Status:** planning. Builds on [PLAN.md](./PLAN.md) (the Gliwice architecture) and [SPIKE.md](./SPIKE.md) (the OCR feasibility spike). Nothing here changes the existing Gliwice pipeline yet — this doc decides *how* to scale it to other cities and *how* to make money from it. Build scope is deliberately left to be decided wave-by-wave.

## What this document covers

1. **The architecture problem** — what is hardcoded to Gliwice today, and the adapter pattern that fixes it (on *both* the pipeline side and the extension side).
2. **Per-city feasibility** — every candidate city, what its housing authority is called, how it publishes data, and how much work each one is.
3. **A recommended build order** — incremental waves, starting with a no-op refactor of Gliwice so nothing regresses.
4. **Monetization** — freemium extension vs. standalone SaaS at `przetargimiejskie.pl` vs. a hybrid, with a pricing sketch and the legal/business notes that matter in Poland.

---

# Part 1 — Architecture: from one city to many

## 1.1 The core insight: there are *two* adapter layers, not one

The expansion brief talks about an adapter pattern in the Node pipeline. That is correct but only half the story. There are **two independent places** where the code knows it is dealing with Gliwice, and they fail differently:

- **The pipeline** knows Gliwice's *URLs and document formats*. Swapping a city here means: a new place to fetch from, and a new way to read what comes back (OCR'd PDF text, a DOCX, or an HTML table).
- **The extension** knows Gliwice's *website DOM*. Swapping a city here is harder than the brief implies: it is **not** just "fetch a different JSON file." `zgm-gliwice.pl` is a WordPress/Elementor site, and `extension/content.js` is wired to that specific theme — it looks for `.elementor-image-box-content` cards (`content.js:55`) and a Gliwice-style slug URL `…-DD-MM-YYYY-r/` (`content.js:19`). Katowice, Sosnowiec, Kraków etc. each have a completely different page structure. So each city needs its own **site DOM adapter**, not just a different data file.

Treat these as two separate adapter registries. They share nothing but the JSON schema between them.

## 1.2 What is hardcoded to Gliwice today (the coupling audit)

This is the concrete list, so the refactor has a definition of "done." Verified by grep against the current tree.

**Pipeline side (`pipeline/src/`):**

| File | Gliwice-specific thing |
|---|---|
| `crawl-results.js` | `BASE = 'https://zgm-gliwice.pl/wyniki-przetargow'` (line 10); the PDF-link regex `PDF_RE` (line 20); the three filename date conventions (lines 27–31). |
| `crawl-active.js` | The three active-page URLs + the wykaz URL (lines 15–19); the Elementor card regex (line 42). |
| `crawl-detail-areas.js` | The WordPress sitemap URL `wp-sitemap-posts-post-1.xml` (line 18). |
| `parse-result.js` | The whole regex grammar is tuned to ZGM's Polish boilerplate — including a literal `w Gliwicach` anchor in the garage-address fallback (line 122). |
| `lib/fetch.js` | The bot User-Agent string mentions `zgm-gliwice` (line 9). Cosmetic, but worth generalizing. |
| `refresh.js` | The orchestrator hardwires "one site → `data/*.json`". The property `Map` key (`addr.key`) is **not** namespaced by city. |

**Extension side (`extension/`):**

| File | Gliwice-specific thing |
|---|---|
| `manifest.json` | `host_permissions` and `content_scripts.matches` are `https://zgm-gliwice.pl/*` only. |
| `content.js` | Listing-index path regex (line 16); detail-page slug regex (line 19); Elementor selectors `.elementor-image-box-content` / `.elementor-image-box-description` (lines 55, 76); injection target `.page-content-container` (line 318); the GitHub footer link (line 315). |
| `background.js` | `REPO = '110kc3/zgm-gliwice'` and the single `data/{properties,active,meta}.json` fetch (lines 11–13, 52–56). |
| `normalize.js` | `addressFromSlug()` assumes the Gliwice slug shape. |

None of this is bad code — it is just a single-tenant app that now needs to become multi-tenant. The good news: the *hard* parts (OCR, the address normalizer, the data schema, the PL/EN i18n, the watchlist, the notifications) are already city-agnostic or nearly so.

## 1.3 Proposed pipeline structure

Keep the existing `pipeline/src/` root; introduce a **city registry** plus a per-city folder. This adapts the brief's `scrapers/ parsers/ core/` idea to the layout that already exists (flat `src/` + `src/lib/`).

```
pipeline/
├── src/
│   ├── core/                       # shared, city-agnostic
│   │   ├── ocr-pdf.js              # ← today's ocr-pdf.js, unchanged
│   │   ├── normalize.js            # ← today's normalize.js (see 1.5 for the key change)
│   │   ├── fetch.js  hash.js       # ← today's lib/*
│   │   └── build-properties.js     # ← the prop-merging logic lifted out of refresh.js
│   ├── cities/
│   │   ├── index.js                # the registry: exports [gliwice, katowice, …]
│   │   ├── gliwice/
│   │   │   ├── config.js           # urls, host, slug patterns, UA
│   │   │   ├── crawl.js            # ← today's crawl-results + crawl-active + detail-areas
│   │   │   └── parse.js            # ← today's parse-result.js
│   │   ├── katowice/  { config, crawl, parse }      # OCR path, like Gliwice
│   │   └── sosnowiec/ { config, crawl, parse }      # HTML path, no OCR
│   └── refresh.js                  # loops the registry, writes data/<city>/*.json
└── data/
    ├── gliwice/   { properties, active, meta }.json
    ├── katowice/  { properties, active, meta }.json
    ├── sosnowiec/ { properties, active, meta }.json
    └── index.json                  # city list + per-city counts + generated_at
```

**The contract every city adapter implements.** One small interface — this is the whole adapter pattern:

```js
// pipeline/src/cities/<city>/index.js
export default {
  id: 'katowice',
  label: 'Katowice',
  authority: 'KZGM',
  host: 'kzgm.katowice.pl',          // used by the extension registry too
  source: 'pdf',                      // 'pdf' (needs OCR) | 'html' | 'docx'
  async crawl() { /* → { resultDocs:[…], active:[…], wykaz:[…] } */ },
  parse(rawText, ctx) { /* → [ auctionRecord, … ] */ },
};
```

`refresh.js` becomes a thin loop: for each city in the registry, `crawl()` → (OCR if `source === 'pdf'`) → `parse()` → `build-properties.js` → write `data/<city>/*.json`. The OCR cache stays content-addressed by document URL, so it naturally partitions per city with no extra work.

**Why a registry and not just three scripts.** A registry means adding a city is *one new folder + one line in `cities/index.js`*. The CI workflow, the build loop, and the extension's city list all read from the registry, so they can never drift out of sync.

## 1.4 Three parser families, not one per city

Do not write a brand-new parser for all 18+ cities. The expansion brief already spotted that data comes in three shapes — make those three *shared* parsers and let each city supply only its regex vocabulary:

- **`core/parse-ocr-paragraphs.js`** — for scanned-PDF cities (Gliwice, Katowice, Bytom). The Gliwice parser generalizes here: section splitter + field regexes, where the *phrasing* (`w Gliwicach` vs `w Katowicach`, `ustny przetarg` wording) is passed in per city.
- **`core/parse-html-table.js`** — for HTML-source cities (Sosnowiec, Chorzów, Kraków). Uses a DOM/table parser (e.g. `cheerio`) — **no OCR step at all**. This is dramatically simpler and avoids the `1/1I` OCR-slash class of bug entirely (see SPIKE.md).
- **`core/parse-docx.js`** — for Bytom's DOCX auction lists. `.docx` is just a zip of XML; extract text, then feed the same paragraph parser as the OCR family.

A city's `parse.js` is then mostly a config object — its boilerplate anchors and quirks — handed to one of the three shared engines. Genuinely new code per city should be rare.

## 1.5 Data schema changes

The schema in `data/properties.json` barely changes — but two things **must** change:

1. **Namespace the property key by city.** Today the join key is `street_norm|building|apt` (see `refresh.js` `ensureProperty`). Every Polish city has a `ul. Słowackiego` — without a city prefix, Katowice and Gliwice properties would collide. New key: `city|street_norm|building|apt`, e.g. `katowice|slowackiego|12|3`. This propagates to the extension's `byKey` lookup (`content.js:36`) and to watchlist keys (`watchlist.js`).
2. **Add a `city` field** to every property and every active listing, and split `meta.json` per city (generated_at, parser_version, source counts — already per-run, just now per-city). Add a top-level `data/index.json` so the extension can discover which cities exist without hardcoding the list.

Everything else — `listings[]`, outcomes, `unsold_reason`, `source_pdf`, area enrichment — stays exactly as is. The schema is already good; it just needs a tenant column.

Bump `schema_version` to `2` and keep the extension able to read both during rollout.

## 1.6 Extension changes

**`manifest.json`** — widen `host_permissions` and `content_scripts.matches` to every city's domain. Note these are real, distinct domains — not subpaths of one site (e.g. Sosnowiec's `mzzl.pl`, Kraków's `zbk-krakow.pl`), and several cities publish via a separate **BIP** portal *as well as* a main site, so a city may need more than one host entry. Confirm the exact host list for each city when building its adapter. Keep the GitHub raw host permission.

**A new `extension/sites/` registry** — mirror of the pipeline's city registry, but describing the *DOM*, not the data source:

```js
// extension/sites/katowice.js
export default {
  city: 'katowice',
  hostMatches: ['kzgm.katowice.pl'],
  isListingIndex: (path) => /…/.test(path),
  isDetail:       (path) => /…/.test(path),
  listingCards:   () => document.querySelectorAll('…'),  // city's card selector
  cardToAddress:  (card) => '…',                          // city's card text shape
  detailToAddress:() => '…',
  injectTarget:   () => document.querySelector('…'),
};
```

`content.js` becomes generic: on load, pick the site adapter whose `hostMatches` includes `location.hostname`; if none, return. Everything after that — badges, tooltips, the history panel, the watchlist button, PL/EN re-render — is **already city-agnostic** and stays untouched. This is the single highest-leverage refactor: it turns `content.js` from Gliwice-specific into a renderer driven by a per-site adapter.

**`background.js`** — fetch per-city data lazily. When a tab is on `kzgm.katowice.pl`, fetch `data/katowice/*.json` (not all cities). Cache each city under its own `chrome.storage.local` key with the existing 6h TTL. This keeps memory and network small even at 18 cities. The watchlist alarm should scan only the cities the user actually has watched properties in.

**CI (`.github/workflows/refresh.yml`)** — switch the single job to a **matrix over the city registry**, one job per city. A parser break in Bytom then fails only Bytom and still refreshes everyone else. Each job commits its own `data/<city>/`.

---

# Part 2 — Per-city feasibility

Cities a Gliwice-based flipper or agent would plausibly care about, ordered roughly easiest-first. "Effort" assumes the Part 1 refactor is already done.

| City | Authority | How they publish | Parser family | OCR? | Effort | Notes |
|---|---|---|---|---|---|---|
| **Gliwice** | ZGM | Scanned PDFs | OCR-paragraph | Yes | — | Already done. Becomes the reference adapter. |
| **Sosnowiec** | MZZL | HTML on BIP / `mzzl.pl` | HTML-table | **No** | **Low** | Best first new city: HTML means no OCR, no slash-misread bugs, fast pipeline. Proves the multi-city *data plane* cleanly. |
| **Chorzów** | ZK PGM | HTML tables + some PDFs | HTML-table (+OCR fallback) | Partly | Low–Med | Mostly HTML; a few PDFs may need the OCR path. |
| **Katowice** | KZGM | Scanned PDFs (`Wyniki przetargów …pdf`) | OCR-paragraph | Yes | Medium | The obvious geographic twin. Reuses the Tesseract pipeline ~entirely — only a new regex vocabulary. Proves the *parser adapter*. |
| **Bytom** | Bytomskie Mieszkania | DOCX **and** PDF auction lists | DOCX + OCR-paragraph | Partly | Medium | Clearly labels "first/second auction" → price-drop tracking is easy. Adds the DOCX path. |
| **Kraków** | ZBK | Structured HTML on `zbk.krakow.pl` | HTML-table | No | Medium | First "national-tier" city. High listing volume, structured text ("Najwyższa wylicytowana stawka wyniosła …"). Strong monetization candidate. |
| **Warszawa** | ZGN (per district) | ~18 separate district sites | HTML-table ×18 | Mostly no | **High** | Decentralized — each district (Mokotów, Śródmieście, …) is its own site/adapter. Huge `lokal użytkowy` volume. Do last, and only if revenue justifies it; treat each district as its own registry entry. |

**Takeaway:** the Silesian metro (Sosnowiec, Chorzów, Katowice, Bytom) is four cities, three of them low/medium effort, and together with Gliwice covers the contiguous market a Silesian investor actually shops in. Kraków is the first city worth adding purely for scale. Warszawa is a project in itself — 18 mini-adapters — so it should be demand-gated.

---

# Part 3 — Recommended build order

"Plan everything, build incrementally." Each wave is independently shippable and independently valuable.

### Wave 0 — Refactor Gliwice into the adapter pattern, *adding no city* — ✅ DONE

Done. The pipeline was restructured into `pipeline/src/core/` (shared: `ocr-pdf`, `normalize`, `fetch`, `hash`, `build-properties`) and `pipeline/src/cities/gliwice/` (the city adapter: `crawl-results`, `crawl-active`, `crawl-detail-areas`, `augment-active`, `parse-result`, `config`, `index`), driven by a registry in `cities/index.js`. `refresh.js` is now a thin loop over that registry. Output moved to `data/gliwice/{properties,active,meta}.json` plus a new top-level `data/index.json`. The extension's `background.js` was repointed at `data/gliwice/`.

**Parity verified:** the refactored pipeline's `properties[]`, `active.listings[]` and `wykaz[]` are byte-for-byte deep-equal to the pre-refactor output — the only delta is an additive top-level `city` field (file sizes grew by exactly 21 bytes, the `"city": "gliwice"` line). The parser test suite passes 7/7.

Two items from the original Wave 0 sketch were **deliberately deferred to Wave 1**, where they are genuinely needed and testable: (a) **city-namespaced property keys** — pointless while there is one city and one single-city data file per directory, and they thread through four extension files that can only be verified in a real browser; (b) the **extension site-adapter registry** — pure restructuring that only becomes load-bearing once a second city's DOM exists. Deferring them kept Wave 0 a clean, parity-provable, zero-behaviour-change refactor. `schema_version` stays `1` (the `city` field is additive).

### Wave 1 — Sosnowiec (MZZL)

First real new city, chosen *because* it is HTML, not because it is the nearest. HTML exercises the entire new multi-city machinery — registry, per-city data files, `index.json`, the extension site adapter, namespaced keys — **without** also fighting a brand-new OCR parser. One axis of risk at a time. Ship the `parse-html-table.js` engine here.

### Wave 2 — Katowice (KZGM)

Now add the OCR-paragraph twin. By now the data plane is proven, so this wave only stresses the *parser adapter*: a new Polish-boilerplate vocabulary on top of the existing Tesseract pipeline. Katowice is also the highest-overlap city for the existing Gliwice user base, so it is the first wave that meaningfully grows the audience.

### Wave 3 — Chorzów + Bytom

Fill out the Silesian metro. Chorzów is mostly HTML (reuses Wave 1). Bytom adds the DOCX path — small, isolated work. After this wave the product covers the whole contiguous Silesian housing market.

### Wave 4 — Kraków (ZBK)

The first deliberate scale move beyond Silesia. Structured HTML, high volume, and the point at which "nationwide tool" stops being aspirational. Good moment to harden the pipeline (per-city CI matrix, monitoring) for cities you cannot eyeball every week.

### Wave 5 — Warszawa (ZGN ×districts) — demand-gated

Only build this if Wave 1–4 monetization shows real demand. Model each district as its own registry entry so they can be added a few at a time (start with the high-`lokal użytkowy` central districts). Eighteen adapters is weeks of work; do not pay that cost on spec.

A reasonable internal milestone: **Waves 0–2 are the MVP of "multi-city."** If those three land cleanly, every later city is mechanical.

---

# Part 4 — Monetization

You picked the domain `przetargimiejskie.pl` ("municipal auctions") — a good, broad name that is not boxed into one city or even one asset type (it could later cover municipal land, vehicles, etc.). The domain choice already hints at the right answer: a **destination**, not just a browser add-on.

## 4.1 The core tension you must design around

The current architecture's biggest strength is also the thing that blocks monetizing the extension directly:

> **The data is public JSON on `raw.githubusercontent.com`. Anyone can fetch it. There is, literally, nothing to pay for.**

To charge money you have only two structural options:

- **(a) Paywall the data itself** — move paid cities behind an authenticated endpoint with licence checks. This *kills the "no hosting, no server" principle* that PLAN.md was built on, turns the extension into a thin client of a backend you must run, and is fragile (a client-side extension can always be inspected). Also: the Chrome Web Store removed its own payments system years ago, so even a "paid extension" needs an external payment + licence layer (Stripe, LemonSqueezy, ExtensionPay) regardless.
- **(b) Keep the raw facts free, and sell a *service* on top of them** — alerts, cross-city search, saved searches, analytics, export. These genuinely require a server, so they are naturally and defensibly paywallable. The public records stay public; you charge for *saving people time*.

Option (b) is the only one that is both honest and durable. Auction results are public records — you cannot really *own* them, and trying to fence them off invites someone to just re-scrape the municipal sites themselves. What you *can* own is the aggregation, the freshness, the alerting, and the analysis. Sell the workflow, not the data.

This reframes all three monetization models below.

## 4.2 Option A — Freemium Chrome extension

Free for Gliwice; paid unlocks other cities + watchlist alerts + zł/m² analytics.

**Pros:** smallest change from today; the Web Store is a free distribution channel; the in-context overlay is a genuinely strong, sticky UX.

**Cons:** runs straight into the §4.1 tension. To gate paid cities you must either host their data privately (kills the no-server principle) or accept that the gate is cosmetic. You still need an external payment + licence-key system. And the extension only reaches people who (i) use Chrome and (ii) already browse municipal sites — a small top-of-funnel. **Verdict: weakest as a standalone model.** The extension is a great *product* and a great *funnel*; it is a poor *paywall*.

## 4.3 Option B — Standalone SaaS at `przetargimiejskie.pl`

A web app: search and browse every city's auction history, filter by district / price / zł/m² / "unsold ≥2×", a map view, email alerts, saved searches, CSV/Excel export, a per-listing "deal score" (price vs. local median zł/m²). The extension becomes a free feature that funnels people to the site.

**Pros:** you control the whole experience and can paywall properly (server-side); recurring revenue; independent of Chrome Web Store policy; reachable by people who *don't* already browse BIP portals; **SEO** — "przetarg mieszkanie Katowice", "licytacje lokali Gliwice" are queries flippers actually type, and a content/data site ranks for them. The pipeline already emits clean JSON, so the site is mostly a front-end over data you already produce.

**Cons:** you now host something — auth, a small DB, payments, transactional email, an alerts cron. Ongoing cost and maintenance. It is a bigger build than Option A.

**Cost reality (this matters):** it is cheaper than "SaaS" sounds. A static or mostly-static front-end (Astro / Next.js) on a free Vercel/Netlify tier reading the GitHub JSON at build time; Supabase free tier for users + subscriptions + saved searches; Resend/Postmark free tier for alert emails; the alerts cron as a GitHub Action (you already run one). Real infra cost is ≈ €0 until there is meaningful traffic, then it scales with revenue. The "no hosting" principle bends, but it does not become expensive.

## 4.4 Option C — Hybrid *(recommended)*

Keep both, each doing what it is best at:

- **The extension stays 100% free, all cities.** It is your acquisition channel and your unfair UX advantage — nobody else shows auction history *as an overlay on the municipal site itself, in the moment the user is looking at the listing*. Every flipper who installs it sees your badge and a "powered by przetargimiejskie.pl" link on every listing they view. Do not paywall this; it is un-gateable anyway (§4.1) and far too valuable as marketing.
- **`przetargimiejskie.pl` is the paid product.** It sells the things that *only a server can do* and that the extension structurally cannot: email/SMS alerts across all cities, saved cross-city searches, the full historical archive, analytics and the deal score, map view, and export.

Free tier on the site: browse, search, last ~6–12 months of history. Paid tier: unlimited history, alerts, saved searches, export, analytics. The extension is the wide top of funnel; the site is where money is captured.

**Why this wins:** it resolves the §4.1 tension instead of fighting it. The free, public, un-gateable layer (raw facts + overlay) is exactly the layer you *give away* — and it doubles as distribution. The server-dependent layer (alerts, aggregation, analytics) is exactly the layer that is naturally paywallable. Each half plays to its strength.

## 4.5 Pricing sketch

Your audience — flippers, small landlords, estate agents — is professional and will pay for tools that surface deals, but a low entry price maximizes conversion. Indicative, Polish market, monthly (annual = pay for 10 months):

| Tier | Price/mo | Who | What |
|---|---|---|---|
| **Free** | 0 PLN | Everyone | Extension overlay (all cities); site browse + search; ~6–12 mo history. |
| **Pro** | ~39–49 PLN | Active flipper / landlord | All-city alerts, unlimited saved searches, full history, analytics + deal score, CSV/Excel export. |
| **Agencja** | ~129–199 PLN | Estate agencies, teams | Multi-seat, higher alert volume, API access, maybe priority/early data. |

Anchor expectations against what this audience already pays — portal/CRM subscriptions for agents run well into the hundreds of PLN/month, so a sub-50 PLN tool that finds undervalued municipal stock is an easy yes if it works. Start at the **low end**, raise later; it is much easier to grow into a price than to cut one. Consider a 14-day Pro trial rather than a permanently crippled free tier — let people feel the alerts.

## 4.6 What to build first for monetization

Monetization does **not** wait for all cities. The smallest revenue-testing slice:

1. **Email alerts** — "new auction / price drop on a property matching your saved search." This is the single feature people will pay for; it is the whole reason the watchlist exists in the extension. Build it server-side so it works without the extension open.
2. **A saved search** — city + district + price range + "unsold ≥N×" + max zł/m². Alerts fire off this.
3. **A landing page at `przetargimiejskie.pl`** with the value proposition, a free email-capture, and Stripe checkout for Pro.

That is a testable paid product over **Gliwice + Sosnowiec + Katowice alone** (Waves 0–2). You learn whether anyone pays *before* investing in Kraków and Warszawa. Let revenue, not the city list, decide how far the expansion goes.

## 4.7 Legal & business notes (Poland)

Not legal advice — confirm with an accountant/lawyer (*księgowy* / *radca prawny*) — but the landscape:

- **Is reselling public auction data legal?** The results are public records, and a value-added service over public data is a normal, legitimate business. Two real cautions: (1) the EU **sui generis database right** — re-publishing a *substantial part* of someone else's structured database can be a problem, though raw public registers are weakly protected; you mitigate by transforming the data (you do — OCR, parse, normalize, re-derive) and by attributing sources, which you already do via `source_pdf`. (2) Each municipal site's **terms of service / `robots.txt`** — keep the polite crawler (real User-Agent, ~1 req/sec, the throttling PLAN.md already specifies).
- **Collecting user emails = RODO/GDPR.** A subscription product needs a privacy policy covering user accounts and email processing — your current [PRIVACY.md](./PRIVACY.md) only covers the zero-data extension and will not be sufficient for the SaaS. You also need a way to honor deletion/export requests.
- **Business form.** For early, low revenue you may qualify for *działalność nieewidencjonowana* (unregistered activity, capped monthly revenue). Past that, a **JDG** (*jednoosobowa działalność gospodarcza*) is the usual route. Selling digital subscriptions has **VAT** implications (and selling to EU consumers outside Poland brings VAT-OSS into play). A *ryczałt* tax rate may apply to IT/services — an accountant will pin the exact rate.
- **Payments.** Stripe supports PL and handles SCA/cards; for the local market also consider **Przelewy24 / BLIK**, which Polish buyers strongly prefer. Show prices **brutto** (VAT-inclusive) to consumers.
- **Disclaimer.** The product surfaces *informational* history; final terms always come from the municipality's own documents. Say so plainly in the UI — it manages expectations and limits liability if an OCR figure is ever wrong.

---

# Part 5 — Concrete next steps

1. **Wave 0 — refactor Gliwice into the registry/adapter pattern**, no new city, parity-gated against today's `data/`. (Part 1.)
2. **Wave 1 — add Sosnowiec (MZZL)**, building the shared `parse-html-table.js` engine. First proof the multi-city machinery works end to end.
3. **Stand up `przetargimiejskie.pl`** as a landing page + email capture as soon as Wave 1 data exists — start measuring interest before writing more parsers.
4. **Wave 2 — add Katowice (KZGM)**, proving the OCR parser adapter; this is the MVP of "multi-city."
5. **Build the alerts + saved-search + Stripe slice** (Part 4.6) over Gliwice + Sosnowiec + Katowice. Find out if people pay.
6. **Let revenue decide Waves 3–5.** Chorzów/Bytom finish Silesia cheaply; Kraków is the scale bet; Warszawa is demand-gated and built district-by-district.

The throughline: **refactor before you expand, expand before you scale, and charge for the service layer — never the public data.**
