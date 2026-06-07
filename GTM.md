# Go-to-market & monetization — sharpened plan

> **Status:** strategy. This supersedes the subscription/"Pro" direction in
> [EXPANSION.md §4](./EXPANSION.md). The hybrid *funnel* logic there still holds
> (free extension + free public site), but the paid layer is **not** a
> subscription. Every consumer feature stays free forever. Money comes from
> **businesses and supporters, never from the user.** No code is changed by this
> document.

---

## 0. TL;DR

Don't paywall anything. Auction history, alerts, archive, export, analytics — keep
them all free, because the data is public and gating it is both un-defensible and
off-brand for a privacy-first tool. Instead, monetize the two things that don't
require taking anything away from users:

1. **Lead-gen partnerships (the engine).** The product stays free and you earn
   referral fees by connecting high-intent users — people actively eyeing a
   municipal flat — to financing, renovation, and survey/valuation partners.
2. **Sponsorship + donations (the supplement).** One tasteful, non-tracking sponsor
   for the free tool and a weekly newsletter, plus a no-pressure tip jar / GitHub
   Sponsors to keep the project independent.

Both ride on the same prerequisite: **an SEO-first public site that brings in
strangers.** Traffic is the whole game here — these models pay in proportion to
reach, not to how cleverly you wall things off.

Grounding from the live data: ~20–46 dated auction events per month across the
cities you cover (measured from `data/*/properties.json`), trending up. Enough flow
that a free weekly "what the city listed" digest is genuinely useful — which is what
makes it sponsorable and what feeds the lead-gen moments.

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

### 2.1 Lead-gen partnerships — the engine

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

### 2.2 Sponsorship + donations — the supplement

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
| **Small TAM.** | Silesian municipal-flat hunters are a niche of a niche; this is a strong side-income / micro-business, not a venture. | Keep cost ≈ €0 so even modest traffic is profitable. Grow TAM via asset types the domain name already allows (land, garages, commercial, vehicles). |
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

Track from day one (Plausible/Umami — privacy-friendly, on-brand):

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
- [ ] Privacy-friendly analytics (Plausible/Umami) live.
- [ ] `site/CNAME` + DNS + GitHub Pages HTTPS confirmed (per README §Website).
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

## 8. One-paragraph version to act on

Keep every consumer feature free — that's now the strategy, not a sacrifice. Ship an
SEO-first public site over the data you already publish and a free weekly newsletter,
because reach is what every revenue model here depends on. Drive the first traffic
from PL real-estate Facebook groups and the free extension's overlay link. Then
monetize *around* the user, never *to* them: switch on donations and one tasteful
sponsor first (zero effort, zero gating), and build the real engine — labeled,
non-tracking lead-gen to one mortgage broker and one renovation firm at the moment
someone's eyeing a flat — once traffic proves it's worth it. Run leads by hand
before automating, register a JDG the moment income is real, and update the privacy
policy the day you collect the first email.
