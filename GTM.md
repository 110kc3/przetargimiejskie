# Go-to-market & monetization — sharpened plan

> **Status:** strategy. This supersedes the subscription/"Pro" direction in
> [EXPANSION.md §4](./EXPANSION.md). The hybrid *funnel* logic there still holds
> (free extension + free public site), but the paid layer is **not** a
> subscription. Every consumer feature stays free forever. Money comes from
> **businesses and supporters, never from the user.** No code is changed by this
> document.

---

## 0. TL;DR

> **Re-ordered 2026-07-27.** The §8 competitor research changed which line comes
> first. Everything user-facing stays free; what changed is *who pays*.

Don't paywall anything. Auction history, alerts, archive, export, analytics — keep
them all free, because the data is public and gating it is both un-defensible and
off-brand for a privacy-first tool. Monetize around the user, in this order:

1. **B2G — sell the outcome data back to the cities (the primary thesis, §2.2).**
   45 % of municipal auctions fail; we are the only source that knows which, at what
   price, and after how many rounds. That's a curiosity to a buyer and a budget
   problem to a city. **It needs no traffic and no RODO exposure, so it is testable
   immediately** — three pitch-ready one-pagers already exist.
2. **Sponsorship + donations (the supplement, §2.3).** One tasteful, non-tracking
   sponsor for the free tool and a weekly newsletter, plus a no-pressure tip jar /
   GitHub Sponsors to keep the project independent.
3. **Lead-gen partnerships (conditional, §2.1).** Referral fees from financing,
   renovation and survey partners — but this pays strictly in proportion to consumer
   traffic, and §8 shows that traffic is contested by a bigger incumbent. Build
   nothing here until reach actually exists.

Only line 3 depends on **an SEO-first public site that brings in strangers**. Line 1
does not — which is precisely why it now goes first.

Grounding from the live data — **re-measured nationally 2026-07-27**, superseding
the "~20–46 events/month" figure this document was originally sized on (that came
from Śląskie-only coverage and understated the flow by ~3×):

| Metric (all 121 crawled cities) | Value |
|---|---|
| Dated auction events / month | **median 89**, peak 147 (Jul 2026) |
| Live auctions right now | **255** (215 of them flats) |
| Unique properties tracked | 1 996 |
| Concluded outcomes | 652 sold · **781 unsold** |
| **Sell-through** | **45 %** |

Two things follow. First, the flow easily supports a weekly digest — that was never
in doubt. Second, and more important, **the 45 % sell-through is the product**: more
than half of municipal auctions fail, and by law a second attempt may drop the price
to 50 % of valuation (a further round of negotiations, to 40 %). Nobody publishes
that — see the competitor research in §8, and the B2G line it makes possible in §2.2.

---

## 1. What's settled — don't relitigate

- **Everything for the user is free, forever.** Extension (all cities) + public site
  + archive + alerts/newsletter + export. The public records stay public; you never
  fence them off. This is now a feature of the business model, not a concession.
- **The funnel is the funnel.** Free extension overlay = high-intent capture; free
  public site = reach. Same as before.
- **Cheap stack.** Static front-end over the JSON you already publish; a newsletter
  tool; a simple lead form. No auth, no billing system, no subscription DB needed.
  Infra ≈ €0.

What changed from EXPANSION.md: the revenue does **not** come from a Pro tier.
Sections 2–8 below replace §4.4–§4.6 of that document.

---

## 2. The revenue model

> **Inbound contact for all of the below:** `kontakt@przetargimiejskie.pl`. The site
> footer and `/privacy` already publish it with an open "otwarty na współpracę"
> invite, so partners and sponsors can reach you directly.

### 2.1 Lead-gen partnerships — CONDITIONAL, demoted 2026-07-27

> **Demoted from "the engine" after the §8 competitor research.** This model pays
> in proportion to consumer traffic, and we are now known to be competing for that
> traffic against an incumbent with 7 000+ listings, alerts and paying customers.
> It is not dead — but it is downstream of a traffic war we are currently losing,
> so **build nothing here** (no lead form, no CTA, no partner funnel) until organic
> traffic actually materialises. The primary thesis is now §2.2. Keep this section
> for when/if reach arrives.

The audience is, by definition, people about to spend money on property. At the exact
moment they're looking at a municipal flat they need adjacent services. You connect
them and get paid per qualified lead or on commission. Nothing is gated; users
arguably get *more* value.

The high-intent moments and who pays for them, ranked by value:

| Partner type (PL term) | The moment | Why it converts | Notes |
|---|---|---|---|
| **Mortgage / financing brokers** (*ekspert kredytowy / pośrednik kredytowy*) | "Can I finance this?" on a listing | Highest-value lead in the funnel; brokers routinely pay per qualified lead | Best first partner. Direct deal or a broker network. |
| **Renovation / fit-out firms** (*ekipy remontowe, firmy wykończeniowe*) | "This is a wreck — what'll it cost to fix?" | Municipal flats are almost always in poor condition; near-universal need | Local Silesian firms; start with one per city. |
| **Surveyors / valuers / inspectors** (*rzeczoznawca majątkowy, inspektor budowlany*) | Pre-bid due diligence | Serious bidders want a check before committing | Per-lead, lower volume. |
| **Property insurance** (*ubezpieczenie nieruchomości*) | Just after purchase | Standard affiliate/commission programs exist in PL | Easy to bolt on later. |
| **Agents for the *exit*** (*biuro nieruchomości*) | "Ready to sell the flip" | Agents pay for seller leads | A later, second-side motion. |

Avoid **notary** (*notariusz*) referral fees — it's a regulated profession with a
fixed tariff (*taksa notarialna*); paying for referrals is legally fraught. Link to
info, don't monetize it.

**How it looks on the page (and stays on-brand):**

- A contextual, clearly **labeled** CTA on listing/detail pages and in the
  newsletter — e.g. "Potrzebujesz finansowania? / Szukasz ekipy remontowej?" Marked
  *współpraca* (partnership), never disguised as editorial.
- **No behavioural ad networks, no third-party trackers.** Either a trackable
  referral link to the partner, or a simple lead form ("zostaw kontakt, oddzwoni
  doradca") that *you* route to the partner. Contextual placement only — this is the
  line that keeps the privacy promise (and the extension's Web Store privacy claims)
  intact.

**Pricing the deals:** start with a flat monthly placement fee per partner (easy to
sell, predictable) or per-qualified-lead (CPL) where the partner can attribute value
— mortgage and renovation leads support real CPLs. Revenue-share on closed deals is
the upside but needs trust and tracking; defer it.

**The honest catch:** this pays in proportion to traffic, you're *vouching* for
partners (a bad one burns trust — vet them), and capturing a lead's contact details
makes you a data controller (RODO — see §5). Start with one or two hand-picked local
partners and run it concierge (collect leads, email the partner, invoice monthly)
before automating anything.

> **Load-bearing assumption, still untested (flagged 2026-07-27).** The mortgage
> broker is ranked the highest-value partner *on the assumption that these buyers
> take mortgages*. Municipal auction stock is distressed, deposit-up-front and
> fast-completion, which selects for **cash flippers and investors** — who need no
> financing at all. If that's what the audience is, the top revenue category
> evaporates and renovation/survey moves to #1. **Ask this explicitly in the §3.2
> demand calls** ("jaki procent Waszych klientów na przetargach bierze kredyt?").
> It is cheaper to learn this in one phone call than to build a funnel around it.

### 2.2 Selling the outcome data back to the cities (B2G) — **THE PRIMARY THESIS**

*Promoted 2026-07-27 from "underrated line" to the primary revenue thesis, after
the §8 research showed every advantage we hold points at the seller side and every
disadvantage at the buyer side.*

Nationally: **45 % sell-through — 781 failed auctions** sitting in `data/`, with
achieved prices, round numbers and time-to-sale attached. A city sees only its own
board, and only while a notice is live; we hold every round and every outcome across
121 cities, so we can tell a city both its own sell-through *and* how it compares.

**Three pitch-ready one-pagers now exist**, generated from each city's own data by
[`scripts/build-onepager.mjs`](./scripts/build-onepager.mjs) (`node
scripts/build-onepager.mjs <city-id>` — any city with ≥20 published outcomes):

| City | Published outcomes | Unsold | The hook |
|---|---|---|---|
| **Gliwice** | 242 | **51 %** | 80 % of failed auctions drew *no deposit at all* — a reach problem, not a price problem |
| **Świętochłowice** | 70 | **60 %** | −26 % median price cut once a round fails |
| **Gorzów Wlkp.** | 65 | **55 %** | voivodeship capital; 71 % failure in its worst year |

Metrics degrade gracefully — a tile a city's data can't support is dropped rather
than rendered as a misleading zero.

**Why this beats lead-gen as the primary line.** A failure rate is a curiosity to a
buyer and a budget problem to a city — and this model has four properties §2.1
lacks:

- **No traffic dependency.** It sells on the dataset, not on reach, so it can be
  tested *this week* rather than after SEO compounds — decisive now that §8 shows
  the reach war is against an incumbent.
- **No RODO exposure.** No lead form, no personal data, no consent flow, no ESP.
- **No CPL negotiation**, and public bodies are used to paying for reports.
- **The competitor structurally cannot follow.** Their entire business is selling
  access to buyers; selling failure analytics to the sellers conflicts with that,
  and they hold no outcome data to build it from.
- A city that links back is also free authority + traffic (the B2G distribution
  angle already in GTM-SPRINT Week 3–4).

**Sizing, roughly:** ~380 powiat seats, of which 54 already clear the publish gate.
Ten cities at 5–10k zł/yr is 50–100k zł/yr — more than a niche lead-gen funnel would
plausibly throw off, and it does not depend on winning a traffic war.

Caveats to respect: public-sector procurement is slow, budget cycles are annual, and
a municipality may bristle at "your auctions fail" framing — **lead with *"how to
price round 1 so it sells"***, not with the failure rate. The generated one-pagers
already follow that rule. Send the three that exist, then judge.

### 2.3 Sponsorship + donations — the supplement

- **A single contextual sponsor** for the free tool + the weekly newsletter:
  "Partnerem serwisu jest X." One tasteful slot, no tracking, clearly labeled. Best
  candidates are the same adjacent businesses (a renovation firm, an agency, a
  broker, a building-materials retailer). Sell it as a flat monthly/quarterly fee,
  priced against reach (sessions + newsletter subscribers).
- **The newsletter is the vehicle.** "Przetargi miejskie na Śląsku — co tydzień":
  the free version of the alerts people balked at paying for, now funded by a
  sponsor. It also drives retention and feeds every lead-gen CTA.
- **Donations as a floor:** GitHub Sponsors (fits the open repo) + a PL tip jar
  (*"Postaw mi kawę"* / BLIK). Framed as "wesprzyj niezależny projekt." Won't be
  large, but it's zero-effort, zero-gating, and reinforces the independent ethos.

**The honest catch:** sponsorship and donations are *modest* and scale only with
audience. They're the right thing to switch on first (no infra, no gating), but
lead-gen — especially mortgage + renovation — is where the real money is once the
site has traffic.

---

## 3. Why SEO is the whole ballgame

Every model above pays in proportion to reach, and the only cheap source of strangers
is organic search. The extension is bottom-of-funnel (high intent, tiny reach — it
only fires for people already on a BIP page). The public site is the top.

Ship **one indexable page per city and per listing**, targeting the queries this
audience actually types: `przetarg/licytacja mieszkania <miasto>`, `mieszkanie od
miasta <miasto>`, `lokale ZGM <miasto>`. Add a monthly auto-generated "co miasto
wystawiło w <miesiąc>" recap per city — fresh, linkable, compounding. You already
generate all the underlying data; this is mostly templating over existing JSON.

This is also the demand test: if the SEO pages don't pull traffic, no monetization
model works, and you've learned that for ≈ €0 before building anything else.

---

## 4. Risks & mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Small TAM.** | Municipal-flat hunters are a niche of a niche. Still true nationally — but the flow is **~3× larger than this doc originally assumed** (§0: median 89 events/month, not 20–46), so "micro-business" is the right frame while the original number was too pessimistic to decide on. | Keep cost ≈ €0 so even modest traffic is profitable. Grow TAM via asset types the domain already allows (land, garages, commercial). Re-run the §0 measurement before any go/no-go. |
| **Aggregators own the listing layer** (§8). | ListaPrzetargow.pl carries 7 000+ live listings vs our 255, with alerts. Any pitch built on "we aggregate auctions" loses on the merits. | Reposition onto history/rounds/outcomes, which none of them track (§8.2). Never compete on listing count or freshness; never quote coverage as the headline. |
| **The history moat is copyable in principle.** | Nothing stops a funded aggregator from parsing results too — our defence is a time-series that took months to accumulate, not a secret. | Keep compounding history (it can't be backfilled from live boards once notices expire — that's the real barrier), and get the positioning planted publicly first. |
| **Monetization scales with traffic, and traffic is unproven.** | Lead-gen and sponsorship are both reach-dependent. | SEO-first (§3) is the cheap traffic test; gate further effort on it (§7). |
| **Partner CTAs erode the clean, trusted UX.** | The product's trust *is* the asset that makes leads valuable. | Contextual, clearly labeled, no trackers, one or two partners max at first. If it feels like ads, you've lost. |
| **You vouch for partners.** | A bad mortgage broker or cowboy renovation crew damages your reputation. | Vet hard; start with people you'd personally recommend; drop non-performers fast. |
| **Source sites change / block the crawler.** | Breaks the data the whole thing runs on. | Per-city CI matrix + monitoring (already on the TODO); polite crawler; committed caches as retention. |
| **Lead handling = RODO obligations.** | Capturing third-party contact data is regulated. | Consent + lawful basis on the form; updated privacy policy; clear partner hand-off (separate controller). See §5. |

---

## 5. Legal / tax notes (Poland)

> Not legal/tax advice — confirm with a *księgowy* / *radca prawny*.

- **RODO/GDPR for leads & newsletter.** The current [PRIVACY.md](./PRIVACY.md) only
  covers the zero-data extension. Lead forms and a newsletter mean you process
  personal data: you need a consent checkbox, a stated lawful basis, a real privacy
  policy covering it, and a clean hand-off to the partner (who becomes a separate
  controller). Honor deletion/export requests.
- **Disclosure.** Sponsored/partner placements must be **labeled** (*współpraca /
  materiał partnera*) — Polish unfair-commercial-practices law plus basic trust.
- **Business form & tax.** Referral and sponsorship income is business income.
  *Działalność nierejestrowana* (unregistered activity) can bridge the very start,
  but as of **1 Jan 2026 its cap is quarterly: 10 813,50 zł** (≈ 3 600 zł/month
  averaged) — modest, so register a **JDG** as soon as income is real. A *ryczałt*
  rate likely applies to this kind of service/commission income; VAT may apply.
  Confirm specifics with an accountant.
- **Database right / source ToS.** Unchanged from EXPANSION.md §4.7: you transform
  and attribute the public data (which mitigates the EU *sui generis* database
  right), and you keep the crawler polite (real UA, ~1 req/s).

---

## 6. Metrics & kill criteria

Track from day one (**Umami Cloud Hobby — free, cookieless, EU region**; wired
2026-07-27, needs only the account. Plausible was dropped as paid):

- **Reach:** organic sessions/week; which city pages rank; newsletter subscribers.
- **Lead-gen:** CTA click-through; leads captured/week; lead → partner-accepted rate;
  revenue per partner.
- **Sponsorship:** is reach high enough that a sponsor will pay a fee you'd bother
  invoicing?

**Kill / pivot criteria:**

- Public site live + actively shared for **6 weeks**, organic traffic ≈ flat zero →
  the funnel is broken; fix positioning/SEO before any monetization work.
- Traffic exists but **lead CTAs get ~zero clicks** over a few weeks → the intent
  isn't where you think; move the CTA to the higher-intent moment (detail page,
  newsletter) or change the offer.
- You have leads but **no partner will pay** for them → start with flat placement /
  sponsorship instead of CPL, or the niche is too small to support paid partners yet
  (lean on donations, keep growing reach).

---

## 7. Launch checklist (≈4–6 weeks, sequenced)

**Week 1–2 — Public site + reach (the prerequisite)**
- [ ] SEO pages: one per city + one per active/archived listing, over existing JSON.
- [ ] Sitemap + meta titles/descriptions on the §3 queries; monthly per-city recap.
- [ ] Privacy-friendly analytics live — code shipped; set the `ANALYTICS_ID` repo variable.
- [ ] DNS + OVH hosting + HTTPS confirmed for przetargimiejskie.pl (per README §Website; OVH is the live host).
- [ ] Launch the weekly newsletter ("co tydzień: nowe przetargi miejskie na Śląsku").
- [ ] Extension: discreet "powered by przetargimiejskie.pl" link on each badge.

**Week 2–3 — Seed the audience (the demand test)**
- [ ] Post value-first roundups in 3–5 PL real-estate FB groups (*flipping
      nieruchomości*, regional *nieruchomości Śląsk/Katowice/Gliwice*).
- [ ] Grow the newsletter list. **Decision gate:** is traffic/subscribers moving? If
      flat after 6 weeks → stop and fix the funnel before monetizing.

**Week 3–4 — Switch on the easy money**
- [ ] Add GitHub Sponsors + a PL tip jar (low effort, no gating).
- [ ] Pitch one contextual sponsor (renovation firm / agency / broker) on a flat fee.
- [ ] Add a privacy policy + consent covering the newsletter and any lead form.

**Week 4–6 — Land the first lead-gen partners (the engine)**
- [ ] Sign 1–2 partners: one mortgage broker, one renovation firm. Flat placement or
      CPL.
- [ ] Add the labeled, non-tracking CTA at the high-intent moment (detail page +
      newsletter); route leads concierge-style (manual hand-off, monthly invoice).
- [ ] Register a JDG before income crosses the quarterly unregistered cap (§5).
- [ ] Automate lead routing only once the manual version clearly works.

---

## 8. Competitive landscape — researched 2026-07-27

> Previously absent from every document in this repo. The moat was asserted
> ("no competitor can make this claim") and never checked. Checked now.

### 8.1 Live-listing aggregation is occupied, and comprehensively

**The primary rival is [ListaPrzetargow.pl](https://listaprzetargow.pl/), and it is
materially stronger than we are on the consumer side.** Measured head-to-head
against a real listing of theirs (`/oferty/4943-przetarg-mieszkanie-gliwice-slaskie`):

| | ListaPrzetargow | przetargimiejskie |
|---|---|---|
| Source institutions | **3 100 urzędów** + 1 500 spółdzielni + 500 spółek SP + komornicy + syndycy | 121 city BIPs |
| Live listings | **7 000+** | 255 |
| Per-listing fields | address, price, zł/m², area, **piętro, liczba pokoi, wadium, postąpienie, terminy oględzin, stan techniczny, pełny opis** | address, price, zł/m², area, round, date |
| Archive depth | live pages back to **2018** | ~2023 |
| Alerts | e-mail, minutes after publication | none (digest generated, unsent) |
| Revenue | **~120 zł/mies. · ~800 zł/rok — paying customers today** | zero |

Other players: [Monitor Urzędowy](https://monitorurzedowy.pl/) (~2 000 notices/day,
all office types), [otoprzetargi.pl](https://www.otoprzetargi.pl/),
[przetargi-komunikaty.pl](https://przetargi-komunikaty.pl/),
[Adradar](https://www.adradar.pl/).

**Correction to an earlier draft of this section, which called them "a notice board
that forgets listings when they expire." That was wrong** — their expired listings
stay live and indexed for years, with *more* per-listing depth than ours. Any
strategy built on out-listing or out-freshing them fails on the merits, and no
amount of adapter-building changes it. Delete "we aggregate municipal auctions"
from the positioning entirely.

### 8.2 …but the outcome layer is genuinely unoccupied

The gap is narrower than first claimed, and it is exactly two things:

1. **Outcomes.** Their status field reads *"Oferta zakończona"* — the listing
   closed. Nothing about whether it **sold**, for how much, or failed for want of
   bidders. We hold 652 sold / 781 unsold with achieved prices, because we OCR the
   result PDFs (`ocr-cache/`, `pdf-text-cache/`, `doc-text-cache/`, per-city result
   parsers). Nobody scrapes result PDFs casually — this is the durable moat.
2. **The per-property join.** They hold the 2018 and the 2026 notice for the same
   flat as two unrelated pages. We join them into one timeline with round numbers
   (`normalize.js` address keys).

Be honest about the asymmetry between the two: **#2 is a feature gap they could
close in a sprint** — they already hold the raw material and merely don't compute
it. **#1 is a data-and-pipeline gap**, and result PDFs are genuinely expensive to
parse. So the moat is one item long: *we know what happened; they only know what
was offered.* Everything downstream should be built on that sentence and nothing
else.

`ceny.listaprzetargow.pl` was checked and is **not** a counter-example: it is
aggregate secondary-market medians by city/district, not per-property auction
history.

This matters legally as much as commercially: under *ustawa o gospodarce
nieruchomościami* art. 39, a failed first auction lets the authority cut the price
**to 50 % of valuation** in the second, and negotiations may go to **40 %**. So
"this is round 3" is not trivia — it is a concrete, quantified discount signal, and
we are the only source that can tell you. Searching for published analysis of these
price trajectories returns regulations and one-off local press stories, never a
dataset. Nobody occupies this.

### 8.3 What this changes — B2G becomes the primary thesis

The decisive observation: **every advantage we hold points at the seller side, and
every disadvantage sits on the buyer side.** So stop competing for the buyer.

1. **Promote B2G (§2.2) from "underrated line" to the primary revenue thesis.**
   Our unique asset is *failure data* — 45 % sell-through, 781 failed auctions.
   That is a curiosity to a buyer and a **budget problem** to a city. It needs no
   traffic (so no reach war with an incumbent), no RODO exposure (no lead form, no
   consent, no ESP), and it sells to a customer the competitor structurally cannot
   follow us to: their whole business is selling *access to buyers*, and turning
   round to sell "your auctions are failing" analytics to the sellers conflicts
   with it — and they have no outcome data to do it with anyway.
2. **Demote lead-gen (§2.1) to conditional.** It is not dead, but it is now
   *downstream of winning a traffic war we are losing*. Do not build the lead form,
   the CTA or the partner funnel until organic traffic actually materialises. If
   the §3.2 calls come back "our clients pay cash", drop it entirely.
3. **Reposition all consumer copy.** Not "find municipal auctions" (lost) but
   **"before you bid, see whether it already failed twice and how far the price has
   fallen"**. Hero, Web Store listing, FB posts — lead with history and outcomes,
   never with city counts. The free public site stays, but as credibility and
   top-of-funnel for §2.2, not as a rival listing product.
4. **Willingness to pay is now evidenced, not hoped for.** ListaPrzetargow sustains
   ~120 zł/mies. on strictly *less* information than we hold. That does not prove
   anyone will pay *us*, but it removes "does this category monetize at all?" from
   the unknowns.
5. **Treat them as a customer, not only a rival.** 7 000 listings with no outcome
   layer is a natural data partner — "powered by przetargimiejskie" is a more
   realistic use of the dataset than fighting them for the same reader.
6. **The 45 % number is a press asset.** *"Prawie połowa miejskich przetargów na
   mieszkania kończy się bez nabywcy"*, with per-city breakdowns, is a story
   regional outlets run — and the one thing no competitor can produce. Free
   authority, and it warms up the §2.2 city conversations.

---

## 9. One-paragraph version to act on

*Rewritten 2026-07-27 after the §8 competitor research and the §0 re-measurement.*

Keep every consumer feature free — that's the strategy, not a sacrifice. But stop
selling aggregation: ListaPrzetargow already carries 7 000+ listings to our 255 and
that race is lost. **Sell the history instead** — we are the only source that can
say "this is the 3rd attempt and the price is down 30 %", which by law can run to
−50 %, and the only one holding the 45 % national failure rate. Lead every piece of
copy with that. Ship the SEO pages over the data already published, run the free
weekly digest, and drive first traffic from PL real-estate Facebook groups and the
extension overlay. Monetize *around* the user, never *to* them, and run three tracks
in parallel rather than in sequence, because they fail independently: donations plus
one tasteful sponsor (zero effort), labeled non-tracking lead-gen once traffic proves
out — asking brokers first whether these buyers even take mortgages (§2.1), since
that assumption is untested and load-bearing — and the B2G line (§2.2), which needs
no traffic and no RODO exposure and can therefore be tested this week by sending the
Gliwice one-pager that has been sitting finished in `outreach/`. Run leads by hand
before automating, register a JDG the moment income is real, and update the privacy
policy the day you collect the first email.
