# REPORTS.md — Reports, dashboards & data-as-product

> **Status:** planning. Builds on [GTM.md](./GTM.md) (free consumer tool +
> lead-gen + sponsorship) and [EXPANSION.md §4](./EXPANSION.md) ("sell the
> service, not the public data"). This document answers one question the others
> only touch: **what reports can we build from the scraped data, who are they
> for, and how do we show — and maybe monetize — them?** No code is changed by
> this document. Decision points are flagged; nothing here commits a city,
> price, or stack.

---

## 0. TL;DR

Yes — the data supports real, defensible reports, and the reason is narrow and
strong: **the municipal sites show you one listing at one moment; you are the
only place that holds the cross-time, cross-city *history*.** That history is
what a report is made of.

Recommended shape, matching the format preference:

1. **A live web dashboard** is the spine — auto-generated from the JSON you
   already publish, static, ≈ €0, and SEO-friendly (it doubles as the
   reach engine GTM.md depends on).
2. **Every view exports** to PDF/CSV/Excel, client-side — so the same dashboard
   yields the downloadable artifact a professional forwards or files.
3. **A monthly email digest** is the retention loop and the sponsorship/lead-gen
   vehicle.

On money: keep the public dashboard **free** (it is public data + reach, and
un-gateable anyway), and put any **paid** layer in **B2B** — where achieved-price
comps and cross-city benchmarks are genuinely scarce and budgets exist. Test
that concierge (a hand-made report sold to 1–2 buyers) before building any
billing. Full trade-offs in §6.

---

## 1. The one asset that makes this work

The source BIP pages are single-shot: one listing, one round, today's price. They
have **no memory**. The pipeline's whole value-add is that it remembers — every
property's chronological `listings[]`, across rounds, with outcomes and (where
sold) achieved prices, across nine cities.

So the reportable material is not "auction listings" (anyone can see those) — it
is everything that only emerges *over time and across cities*:

- how far a city cuts the price after a flat fails to sell;
- whether the winning bid beats the asking price, and by how much;
- which properties are stuck (unsold 2, 3, 4 times);
- how supply ebbs and flows month to month;
- what €/m² (zł/m²) a district actually clears at.

That is the line that also keeps it legal and on-brand (EXPANSION §4.7): you are
not re-publishing a register, you are publishing a **derived, transformed view**
with sources attributed.

---

## 2. What the data can actually support (grounded)

Figures below are from a quick pass over the committed `data/*/*.json` on
2026-06-15 — illustrative of feasibility, not a published statistic.

**The raw material, per listing:** city, kind (flat / commercial / garage /
built / land), round number, starting price, outcome, unsold reason, **achieved
sold price**, area m², derived zł/m², dates, and a source link.

**Scale on hand:** 9 cities · **1,116** auction listings · **266 sold** (262 with
both start & final price) · **170 unsold** · ~**297 land plots** · kinds skew
958 flat / 92 commercial / 38 built / 15 garage · history spanning 2016→2026 with
recent flow ≈ 14–56 listings/month.

### Report primitives (the building blocks every view is assembled from)

| # | Report primitive | The insight it surfaces | Data backing (today) |
|---|---|---|---|
| 1 | **Sold-vs-asking spread** | When municipal flats *do* sell, **94% close at or above the starting price** (median **+12%**, top quartile **+36%**) — competitive bidding is real. | 262 sold w/ both prices |
| 2 | **Price-erosion curves** | How hard a city discounts after failed rounds — e.g. Gliwice's Rybnicka 25/19: 350 700 → 245 490 zł (**−30%**) over 4 unsold rounds; repeatedly-relisted stock commonly lands **−20% to −50%** off original asking. | 289 multi-round chains |
| 3 | **Stale / most-relisted stock** | Deal-hunting + a city-efficiency story: **42 properties unsold ≥ 2×, 9 unsold ≥ 3×**. The "buy-side opportunity" board. | relisting counts |
| 4 | **Supply & flow** | "What each city listed and sold this month/quarter" — the recap that is fresh, linkable and sponsorable. | dated listings, all cities |
| 5 | **zł/m² benchmarks** | Median clearing price per m² by city / district / kind; the basis of the deal score the extension already computes. | priced flats w/ area |
| 6 | **Outcome rates** | Sell-through: of listings with a clear result, **roughly 3 in 5 sell**; the rest reveal where demand is thin. | 266 sold vs 170 unsold |
| 7 | **Land inventory** | ~297 plots — a class invisible on most aggregators and the biggest untapped volume (see SPIKE-HOUSES-LAND.md). | `land.json` × cities |

Each "report" (web view, PDF, or email section) is just a composition of these
primitives, sliced by city / district / kind / time.

---

## 3. How the three axes interlock

You asked to *map all audiences*, *lay out the money trade-offs*, and lead with a
*dashboard that exports, plus email*. They are not independent — they line up:

```
   FORMAT            AUDIENCE it best serves        MONEY it enables
   ───────────────   ────────────────────────────   ──────────────────────
   Live dashboard →  buyers, media, everyone     →  reach / SEO / lead-gen (free)
   Export (PDF/CSV)→ professionals, valuers      →  paid artifact / data feed (B2B)
   Email digest    → returning buyers + sponsor  →  sponsorship + lead-gen (free)
```

The free, public layers (dashboard + digest) are the **marketing** for the paid
B2B layer (export / feed / premium analytics). Build them in that order.

---

## 4. Format plan — dashboard-first, exportable, with an email arm

### 4.1 The live web dashboard (the spine)

Auto-generated from the same JSON the extension and site already consume —
**static, no server, ≈ €0**, and it slots straight into the existing `site/` +
`build-site.sh` pipeline. Proposed views, each built from §2 primitives:

- **City overview** — counts, sell-through, median zł/m², this-month flow.
- **Market trends** — time-series of supply, sold prices, zł/m² (per city / kind).
- **Price-erosion explorer** — pick a property, see its round-by-round curve.
- **Deal board** — most-relisted / steepest-cut / below-median stock (buy-side).
- **Benchmarks** — median zł/m² grid by city × district × kind.
- **Land map** — the ~297 plots, filterable.

Critically for GTM.md §3: ship **one indexable page per city** and a **monthly
"co miasto wystawiło i sprzedało w <miesiąc>"** recap. These are the SEO surface —
the same templating effort produces both the dashboard and the reach engine.

### 4.2 Downloadable from the dashboard (PDF / CSV / Excel)

The export *is* the report for anyone who needs to file, forward, or cite it. All
of it is doable **client-side**, preserving the no-server principle:

- **CSV / Excel** — straight from any table view (SheetJS or a few lines of JS).
- **PDF** — a print-optimized stylesheet → "Download PDF" via the browser, or a
  small client lib for a branded one-pager.
- **The flagship artifact: a periodic "Raport rynku" (market report)** — a
  polished PDF (per city or for the whole Silesian set, quarterly) assembled from
  the same primitives. This is the thing a valuer attaches to a valuation, an
  agency hands a client, or a journalist quotes. It is also the most natural
  *paid* unit (§6).

### 4.3 The email digest (the retention + monetization loop)

"Przetargi miejskie na Śląsku — co miesiąc": the email edition of the
dashboard's recap — new listings, notable price cuts, fresh sold prices, the
month's deal board. It is:

- **free** and sponsorable (one labeled slot — GTM §2.2);
- the carrier for lead-gen CTAs (financing / renovation — GTM §2.1);
- the seed of a **paid B2B variant** later: a *custom* report by email off a
  saved search ("everything in district X under N zł/m²") — the alert MVP in
  TODO.md, repackaged as a recurring report rather than a raw alert.

---

## 5. Audience map — to whom (all segments)

| Audience | The report they want | Willingness to pay | How to reach | Verdict |
|---|---|---|---|---|
| **Buyers & investors** (flippers, small landlords) | Deal board, price-erosion, alerts/digest | Low individually, **high intent** | Extension overlay, FB groups, SEO, digest | **Lead with** — free; the funnel GTM.md already describes |
| **Estate agencies & developers** | Market trends, supply, zł/m² benchmarks, comps export | **Medium–high** (already pay for tools) | Direct outreach, the PDF report, LinkedIn | **Primary paid test** — budget + recurring need |
| **Valuers / rzeczoznawcy majątkowi** | **Achieved sold prices + zł/m² comps** (scarce, hard to get) | Medium, **sticky** | Professional bodies, direct | **Primary paid test** — data is genuinely rare here |
| **Banks & mortgage brokers** | Collateral context, local market data | Medium | Already a GTM lead-gen partner | Mostly lead-gen; a data tie-in is upside |
| **Media & researchers** | "Cities cut X%, sell Y% of stock" angle; transparency | ~Zero | Pitch the recap; open data | **Free, for reach & credibility** — PR, not revenue |
| **Public sector / the cities themselves** | Peer benchmarking ("how does our disposal pricing compare?") | Low–medium, **slow** cycle | Direct, slow | Long shot; revisit once data is authoritative |

**Recommendation:** lead with the **free public dashboard + digest** — it serves
buyers and media at once and builds the reach and credibility everything else
needs. Run the **paid test against agencies + valuers**: they have budgets, and
the achieved-price / cross-city-benchmark material is the part competitors *don't*
have. Treat banks as a lead-gen partner (per GTM), and media as free PR fuel.

---

## 6. Monetization — free, paid, or both (the trade-offs)

### 6.1 The structural truth (unchanged from EXPANSION §4.1 / GTM §0)

The raw facts are public records on `raw.githubusercontent.com`. **You cannot
durably paywall them** — anyone can re-scrape the source. What you *can* sell is
the layer the source doesn't have: **aggregation, freshness, analysis, and
packaging.** Every option below respects that line.

### 6.2 The three models

| Model | What's sold | Infra / effort | Revenue ceiling | On-brand? | Time to first złoty |
|---|---|---|---|---|---|
| **A. All free** (GTM status quo) | Nothing directly; money via lead-gen + sponsorship around free reports | ≈ €0 (static) | Low–med, **reach-bound** | ✅ Perfect | Fast |
| **B. Paid B2B** | A *service* on the data: branded market-report PDF, comps/data export, API, premium analytics | Hosted + auth + billing (bends no-server) + sales effort + RODO | **Higher**, budget-backed | ✅ (B2B ≠ the free consumer promise) | Slow (sales cycle) |
| **C. Both** *(recommended to explore)* | Free public dashboard + digest **as marketing for** a paid B2B layer | A's stack now, B's later, gated on traffic | Highest | ✅ Best of both | Phased |

### 6.3 The defensibility line — what is free vs chargeable

- **Always free:** any single raw fact; the public dashboard; the per-city
  monthly recap; the digest. (Public data + reach; gating it is off-brand and
  pointless.)
- **Defensibly paid (B2B):** cross-city aggregation in bulk; the full historical
  archive as a feed; automated comps export; **custom / saved-search reports**;
  an API; the **polished branded market-report PDF**; freshness/alerting SLAs.

You are charging for *saving a professional time and giving them something they
can't easily assemble themselves* — never for the public record.

### 6.4 Pricing sketch (indicative, PL market — confirm later)

Anchored to EXPANSION §4.5 (pros here already pay hundreds of PLN/mo for
portals/CRM, so a sub-100 PLN tool that surfaces undervalued stock is an easy
yes):

- **One-off market-report PDF** (per city / quarter): ~**99–199 zł**.
- **Recurring report or data feed** (agency / valuer): ~**49–149 zł/mo**,
  annual = 10×.
- **API / multi-seat** (agency teams): bespoke, later.

Start at the **low end**, concierge, and raise into proven demand.

---

## 7. Phased build (cheap, gated — only-plan)

Sequenced so each phase is testable and the spend is gated on the previous one
working. Nothing here is built yet.

1. **Phase 1 — free dashboard over existing JSON.** Templated city + monthly-recap
   pages in `site/`, with client-side CSV/PDF export. Pure static, ≈ €0. **This
   is also the SEO/demand test** (GTM §3 / §6 kill criteria) — if these pages pull
   no organic traffic in ~6 weeks, fix the funnel before anything paid.
2. **Phase 2 — monthly email digest.** A newsletter tool over the recap; add the
   sponsor slot + lead-gen CTA. (RODO: consent + privacy update the day you
   collect the first email — GTM §5.)
3. **Phase 3 — concierge paid report.** Hand-build one quarterly market-report PDF
   and sell it to 1–2 agencies/valuers. **No billing system yet** — invoice
   manually. This learns whether B2B will actually pay before you build for it.
4. **Phase 4 — productize, only if Phase 3 converts.** Then (and only then) add
   the hosted/auth/billing layer for a recurring report, data feed, or premium
   dashboard. Register a JDG before income crosses the unregistered cap (GTM §5).

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| **Small TAM** (Silesian municipal stock is niche) | Keep cost ≈ €0; the land class (§2 #7) and more cities widen it; B2B raises revenue-per-user. |
| **Traffic unproven** — every model is reach-bound | Phase 1 is the cheap test; gate further spend on it (GTM §6). |
| **Data accuracy** — a wrong OCR'd price burns a valuer relationship | Show source links + a plain "informational, confirm against the municipal document" disclaimer on every report (EXPANSION §4.7). |
| **B2B sales cycle is slow** | Run concierge first; don't build billing on spec. |
| **RODO** (emails, custom reports = personal data) | Consent + lawful basis + privacy policy before the first capture; honor deletion. |
| **Source ToS / database right** | Unchanged: transform + attribute, polite crawler (EXPANSION §4.7). |
| **Paid layer erodes the free trust** | Paid stays **B2B**; the consumer dashboard + digest never gate. |

---

## 9. One-paragraph version to act on

Build a **free live dashboard** over the data you already publish — per-city and
per-month views, each with one-click PDF/CSV export — and a **monthly email
digest**. This serves buyers and media, drives the SEO/reach every revenue model
needs, fits your static stack, and costs ≈ €0. Keep every public-facing report
free; the public record can't be fenced off anyway. Then test a **paid B2B layer**
where the data is genuinely scarce — achieved-price comps and cross-city
benchmarks for **agencies and valuers** — starting with a hand-made quarterly
market-report PDF sold to one or two of them, *before* building any billing. Let
that conversion, not ambition, decide whether to productize a recurring report,
data feed, or API. Charge for aggregation, freshness, and packaging — never for
the public facts.
