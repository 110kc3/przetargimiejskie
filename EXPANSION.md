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

> **Correction (spike, May 2026).** The first draft of this table assumed every city's housing authority — the "ZGM-equivalent": KZGM, MZZL, ZK PGM, … — publishes municipal-property **sale**-auction results the way Gliwice's ZGM does. A spike disproved that. Gliwice's ZGM is the *exception*: it runs property sales itself. In the other cities checked, the housing authority runs **rentals**, and **sales are run by the city hall and published on the city BIP**. The table below is corrected; any entry not yet spiked is marked *unverified* and must be spiked before an adapter is written.

## 2.1 What the spike found

- **Sosnowiec — MZZL.** Fetched `mzzl.pl` directly. MZZL does **not sell** flats. Its "wyniki przetargów" page is auctions to **rent** (`wynajem`) commercial units and garages; its residential page offers flats for **rent** to means-tested tenants (a `stawka czynszowa` per m² — a rent rate, not a sale price). No sale-auction stream exists on `mzzl.pl`. Sosnowiec's municipal-property sales, if published, would be on the **city BIP** (`bip.um.sosnowiec.pl`) — unspiked.
- **Katowice — KZGM.** KZGM likewise runs **rental** auctions (najem of flats and commercial units). Municipal-property **sales** are handled by **Katowice City Hall** (Wydział Budownictwa i Dróg), not KZGM — published on the city portal, unspiked.
- **Gliwice — ZGM.** Confirmed: ZGM runs the sale auctions itself and publishes result PDFs. The whole tool was built on this — and it now looks like the *atypical* arrangement, not the norm.

The load-bearing question for every remaining city is therefore **not** "what is the ZGM-equivalent called" but: **does this city sell municipal property at auction at all, and which BIP publishes the results?** Some cities keep their entire residential stock as rental housing and have no sale-auction stream to track.

## 2.2 Corrected feasibility table

Format/effort columns are removed — they cannot be estimated until each source is spiked. "Status" is the honest state of knowledge.

| City | Housing authority (rentals) | Likely sales source | Status |
|---|---|---|---|
| **Gliwice** | ZGM — *also runs sales (atypical)* | ZGM result PDFs | ✅ Verified, built (Wave 0) |
| **Sosnowiec** | MZZL — *confirmed: rentals only, not a sales source* | City BIP `bip.um.sosnowiec.pl` | ⚠️ Spiked — JS-SPA BIP, no sales confirmed (SPIKE-WAVE1.md) |
| **Katowice** | KZGM — *confirmed: rentals, not a sales source* | Katowice City Hall / city portal | ✅ Spiked — city BIP viable, **Wave 2 pick** (SPIKE-WAVE1.md) |
| **Chorzów** | ZK PGM — *flats are rental-only* | City BIP `bip.chorzow.eu` — land/commercial only, free-text HTML | ❌ Spiked + **dropped** — no residential flat-sale auctions exist (SPIKE-WAVE2.md) |
| **Bytom** | Bytomskie Mieszkania — *rentals* | i-BIIP catalog `i-biip.um.bytom.pl` (HTML) | ✅ Spiked + **built (Wave 3, v1.4.0)** — clean HTML catalog (SPIKE-WAVE2.md) |
| **Zabrze** | ZGM — *rentals* | City BIP `bip.miastozabrze.pl` — dedicated *Lokale mieszkalne* sale board, per-announcement PDF/DOC attachments | ✅ Spiked + **built (Wave 4, v1.6.0)**; flats auctioned, 113 entries, server-rendered (SPIKE-WAVE2.md) |
| **Kraków** | ZBK | City BIP / ZBK — unknown | ❓ Entirely unspiked |
| **Warszawa** | ZGN (per district) | City / district BIPs — unknown | ❓ Entirely unspiked, decentralised |

**Takeaway:** the comfortable "four easy Silesian cities" picture from the first draft is not reliable. Until each city's BIP is spiked we do not know (a) whether it sells municipal property at all, (b) where it publishes results, or (c) in what format (HTML vs PDF). The Part 1 adapter architecture is unaffected — it still cleanly absorbs whatever each city turns out to be — but the *order and effort* of the build now depend entirely on spike outcomes. A real possibility worth naming: some target cities may have **no sale-auction data at all**, in which case their only municipal-auction dataset is **commercial rentals** — a different vertical the product could choose to cover or skip.

---

# Part 3 — Recommended build order

"Plan everything, build incrementally." Wave 0 is done. Every wave after it is now **spike-gated**: no city adapter is written until that city's real sales source has been located and its format inspected — the discipline that caught the Sosnowiec problem for the cost of four page fetches instead of a wasted adapter.

### Wave 0 — Refactor Gliwice into the adapter pattern, *adding no city* — ✅ DONE

Done. The pipeline was restructured into `pipeline/src/core/` (shared: `ocr-pdf`, `normalize`, `fetch`, `hash`, `build-properties`) and `pipeline/src/cities/gliwice/` (the city adapter: `crawl-results`, `crawl-active`, `crawl-detail-areas`, `augment-active`, `parse-result`, `config`, `index`), driven by a registry in `cities/index.js`. `refresh.js` is now a thin loop over that registry. Output moved to `data/gliwice/{properties,active,meta}.json` plus a new top-level `data/index.json`. The extension's `background.js` was repointed at `data/gliwice/`.

**Parity verified:** the refactored pipeline's `properties[]`, `active.listings[]` and `wykaz[]` are byte-for-byte deep-equal to the pre-refactor output — the only delta is an additive top-level `city` field (file sizes grew by exactly 21 bytes, the `"city": "gliwice"` line). The parser test suite passes 7/7.

Two items from the original Wave 0 sketch were **deliberately deferred to Wave 1**, where they are genuinely needed and testable: (a) **city-namespaced property keys** — pointless while there is one city and one single-city data file per directory, and they thread through four extension files that can only be verified in a real browser; (b) the **extension site-adapter registry** — pure restructuring that only becomes load-bearing once a second city's DOM exists. Deferring them kept Wave 0 a clean, parity-provable, zero-behaviour-change refactor. `schema_version` stays `1` (the `city` field is additive).

### Wave 1 — Spike the city-BIP sales sources

Before any second city is built: spike `bip.um.sosnowiec.pl`, Katowice's city property portal, and the Kraków BIP. For each, answer the three load-bearing questions — does the city sell municipal property at auction, where are results published, in what format (HTML / PDF / attachment). Produce a short findings note per city, the way [SPIKE.md](./SPIKE.md) did for Gliwice. The deliverable of Wave 1 is **knowledge, not code**: an evidence-backed shortlist of which city to build first.

### Wave 2 — Build the first verified city

Take whichever city Wave 1 proves has the cleanest, richest sale-auction data and build its adapter. This wave also lands the two items deferred from Wave 0 — **city-namespaced keys** and the **extension site-adapter registry** — plus whichever shared parser engine the source needs (`parse-html-table.js` for an HTML BIP, or the OCR-paragraph engine for PDF attachments). One real second city, end to end.

### Wave 3+ — Remaining cities, each spike-gated

Add cities one at a time, each preceded by its own BIP spike. Drop any city whose spike shows no usable sale-auction data. Harden the pipeline (per-city CI matrix, monitoring) once three cities are live. Warszawa stays last and demand-gated — it is ~18 district BIPs and only worth it if revenue justifies it.

The honest milestone: **the MVP of "multi-city" is now Wave 1 (the spikes) + Wave 2 (one verified city).** Until the spikes are done, any commitment to a specific city, order, or effort estimate is a guess.

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

1. ✅ **Wave 0 — Gliwice refactored** into the registry/adapter pattern, parity-verified. Done.
2. **Wave 1 — spike the city-BIP sales sources** (`bip.um.sosnowiec.pl`, Katowice's city property portal, Kraków's BIP). Find where municipal-property *sales* are actually published, and in what format. Output: a per-city findings note.
3. **Wave 2 — build the first city the spikes verify** has clean sale-auction data; land city-namespaced keys + the extension site-adapter registry alongside it.
4. **Stand up `przetargimiejskie.pl`** as a landing page + email capture once a second city's data exists — start measuring interest.
5. **Build the alerts + saved-search + Stripe slice** (Part 4.6) over the cities that are live. Find out if people pay.
6. **Add remaining cities one spike at a time**, dropping any with no usable sale data; let revenue decide how far to go.

The throughline: **spike before you build, refactor before you expand, expand before you scale, and charge for the service layer — never the public data.**
