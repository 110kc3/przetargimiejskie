# 6-week validation sprint — przetargimiejskie

> **Status:** execution plan. Sharpens the *sequencing* of [GTM.md §7](./GTM.md#7-launch-checklist-46-weeks-sequenced).
> The strategy in GTM.md is settled and correct; this doc changes only the *order*
> and adds the missing concrete artifacts. No code direction changes.

---

## The one idea that changes the order

GTM.md sequences **traffic first, partners last** (SEO in week 1–2, sign a broker in
week 4–6). That's the builder's instinct, and it's backwards for *de-risking*.

The cheapest test with the most kill-power isn't "can I get traffic" — it's
**"will any broker or renovation firm actually pay for these leads?"** That's a few
phone calls, not weeks of SEO. If the answer is no, every hour spent on traffic is
wasted. If it's yes, you get a real **price per lead**, which is the only number that
tells you whether even *maximum* traffic is worth your time.

So: **run the partner demand test in Week 1, in parallel with turning on analytics.**
Everything else stays as GTM.md has it.

### Size the prize before building anything

```
monthly revenue ≈ (qualified leads / month) × (price per lead)
```

You don't know either number yet. Get **price per lead** from Week-1 calls (a broker
will quote you a CPL or a flat monthly fee). Estimate **leads/month** later from
traffic. Sanity floor from your own data: ~20–46 dated auctions/month region-wide →
the high-intent pool is small, so this is **side-income / micro-business scale**, not
a venture. That's fine — but decide with the actual CPL in hand, not a guess.

---

## Week-by-week

### Week 1 — Instrument + demand test (do both in parallel)

**A. Turn on analytics (½ day).** The site currently has *none* — you can't measure a
funnel you can't see. Add Plausible or Umami (privacy-friendly, on-brand) to every
page in `site/`. Without this, Weeks 2–6 produce no data.

**B. Demand test — the decisive call (rest of the week).** Contact **5–8 mortgage
brokers** (*ekspert / pośrednik kredytowy*) and **3–4 renovation firms** (*ekipa
remontowa / firma wykończeniowa*) operating in your cities. Use the pilot offer below.
Goal for the week: **one verbal "yes — I'd pay ~X per lead or ~Y/month, send me the
pilot."**

> **Week-1 gate.** ≥1 partner gives a real number + a soft pilot yes → continue to
> Week 2. Zero interest after ~10 honest conversations → the engine has no buyer.
> Don't build the SEO machine; fall back to donations + one sponsor, or park the
> monetization and keep it as a free portfolio piece.

### Week 2 — Build the funnel you just validated

- SEO pages: one per city + one per active/archived listing, templated over the JSON
  you already publish. Target the queries in GTM.md §3 (`przetarg/licytacja mieszkania
  <miasto>`, `mieszkanie od miasta <miasto>`, `lokale ZGM <miasto>`).
- Sitemap + meta titles/descriptions; the monthly auto "co miasto wystawiło w
  <miesiąc>" recap per city.
- **Add the lead capture you promised the partner:** a labeled, non-tracking lead form
  ("zostaw kontakt, oddzwoni doradca") + the weekly-newsletter signup. The site has
  neither today.
- Update PRIVACY.md the day the form goes live (consent + lawful basis — GTM.md §5).

### Week 3–4 — Drive traffic and run leads by hand

- Seed value-first roundups in **3–5 PL real-estate FB groups** (regional *nieruchomości
  Śląsk / Katowice / Gliwice*, *flipping nieruchomości*). Not spam — post the useful
  "what the city listed this week" digest.
- Switch on the extension's discreet "powered by przetargimiejskie.pl" overlay link.
- **Extend the B2G angle you already built.** Your `outreach/gliwice/` ZGM pitch
  ("62% przetargów bez rozstrzygnięcia — pomożemy z zasięgiem, bezpłatnie") is a strong
  distribution lever: if a city links to you, that's free authority + traffic. Clone
  it for 2–3 more cities once Gliwice replies.
- Hand the **first pilot leads free** to the Week-1 partner. Route them concierge-style
  (you email the partner, no automation yet).

### Week 5–6 — Convert and decide

- Convert the pilot partner to **paid** — CPL or flat monthly placement, whichever they
  preferred in Week 1.
- Pitch **one** contextual sponsor (renovation firm / agency / broker) on a flat fee.
- Add GitHub Sponsors + a PL tip jar (zero effort, zero gating).
- Register a **JDG** before income crosses the *działalność nierejestrowana* quarterly
  cap (10 813,50 zł, per GTM.md §5).

> **Week-6 gates (concrete, replaces "flat zero").**
> - **Traffic:** organic sessions clearly trending up (rough target: >150–300/week and
>   climbing), ≥1 city page ranking. Flat → fix SEO/positioning before monetizing.
> - **Intent:** lead-CTA click-through ≳1–2% and at least a handful of leads/week. Zero
>   clicks despite traffic → wrong moment/offer; move the CTA to the detail page or
>   newsletter.
> - **Money:** the pilot partner converts to paid. If leads are good but *no one* will
>   pay → flip to flat placement/sponsorship, or the niche is too thin for paid partners
>   yet — lean on donations and keep growing reach.

---

## Outreach artifacts (copy-paste, Polish)

### Cold email — mortgage broker

> **Temat:** Współpraca — leady: osoby kupujące mieszkania z przetargów miejskich (Śląsk)
>
> Dzień dobry [Imię],
>
> prowadzę **przetargimiejskie.pl** — bezpłatny serwis, który w jednym miejscu zbiera
> miejskie przetargi na mieszkania na Śląsku i pokazuje historię cen. Trafiają tu osoby
> aktywnie szukające mieszkania od miasta — czyli w większości za chwilę będą
> potrzebować finansowania.
>
> Chcę połączyć te osoby z **jednym** zaufanym ekspertem kredytowym w regionie.
> Propozycja na próbę, bez ryzyka: pierwszych **5 kontaktów przekazuję bezpłatnie**.
> Jeśli jakość będzie dobra, ustalamy stawkę za kontakt (CPL) albo stały miesięczny
> ryczałt — co będzie wygodniejsze.
>
> Dwa krótkie pytania: (1) czy bierze Pan/Pani leady z zewnątrz i ile zwykle płaci za
> wartościowy kontakt? (2) jakie miasta Pan/Pani obsługuje?
>
> Pozdrawiam,
> Kamil [nazwisko]
> przetargimiejskie.pl · kontakt@przetargimiejskie.pl

### Call opener (~30 seconds)

> "Dzień dobry, Kamil z przetargimiejskie.pl. Prowadzę serwis, na który trafiają osoby
> szukające mieszkań z przetargów miejskich na Śląsku — w większości będą potrzebować
> kredytu. Szukam **jednego** eksperta kredytowego do współpracy na leady; pierwsze
> kontakty daję bezpłatnie na próbę. Czy w ogóle bierze Pan/Pani leady z zewnątrz —
> i ile zwykle płaci się za dobry kontakt?"

### Renovation-firm variant

Swap the value moment: *"mieszkania z przetargów miejskich są niemal zawsze do
remontu — kupujący od razu szukają ekipy."* Same free-pilot structure; ask their
typical price for a warm lead and which cities they cover.

---

## Tracking sheet (one tab, fill from day one)

| Date | Partner | Type (kredyt/remont) | Channel | Takes external leads? | Quoted price (CPL / monthly) | Pilot sent? | Converted? | Notes |
|---|---|---|---|---|---|---|---|---|

Plus a weekly row: `organic sessions · newsletter subs · CTA clicks · leads captured`.

---

## What NOT to do during these 6 weeks

- **Freeze the houses/land/commercial expansion** (TODO.md, 15 June spike). It's a real
  feature build and it does nothing to answer "will someone pay?" Resume it *after* the
  money model is proven — more inventory only matters once a lead is worth money.
- **No new extension features.** The product is mature (v1.29). Every hour goes to
  demand + distribution, not code.
- **Don't automate lead routing** until the manual concierge version has clearly worked
  for a few weeks.

---

## One-line version

Before building traffic, spend Week 1 proving a broker will pay — turn on analytics,
make ~10 calls, get one price per lead. If a buyer exists, run GTM.md's funnel; if not,
you learned it for €0 and saved two months.
