# Go-to-market — municipal outcome reporting

> **Status:** active B2G validation strategy, rewritten 2026-08-11. This
> supersedes the consumer subscription, lead-generation and “price the first
> round” directions. The free public site and extension may continue, but they
> are not the commercial thesis.

## Decision

The first paid product is a standardized, fixed-scope municipal report:

> **Karta wyników zbywania mienia — one entity, one asset class, one closed period**

It is a productized data delivery, not consulting, valuation, legal audit or a
SaaS portal. Version one consists of:

- an accessible HTML/PDF report;
- a row-level CSV with source and control fields;
- explicit denominators for sold, unsold and unknown outcomes;
- observed date sequences, elapsed time and published starting-price changes;
- data-readiness checks, methodology, exclusions and a deterministic input
  fingerprint.

The public Gliwice example under `/dla-samorzadow/przyklad-gliwice/` is an
immutable report snapshot. It does not silently change when the daily public
dataset is refreshed.

## Buyer and use case

The primary champion is the head or director of a municipal property, asset or
real-estate department. Where a ZGM/ZBM/MZBM/ZGL runs disposals, target its
director or asset-sales lead. A deputy mayor or secretary may sponsor the
purchase; procurement and finance determine the permitted route. Internal audit
is a possible user, not the opening buyer.

The report may be used as a source-linked analytical appendix for management
reporting, reconciliation of published and internal records, or preparation of
municipal asset information. It does not replace a statutory report, internal
record, operat szacunkowy or legal review.

## Fixed pilot offer

- one entity;
- residential premises only in the first cohort;
- one closed period of no more than four full years;
- HTML/PDF, CSV and methodology;
- public-source data only; no account, upload or integration;
- delivery target: up to 10 working days after written scope confirmation;
- test price: **2,900 zł plus VAT if applicable**.

The total price, seller identity, source scope and delivery date must be confirmed
in writing before an order is accepted. The buyer decides its own purchasing route;
never promise a direct award.

## Hard product boundary

The product describes historical information published by identified sources. It
must not:

- determine or predict property value;
- recommend an opening or subsequent price;
- estimate fiscal loss, “cost of a failed auction” or missed revenue;
- diagnose why an auction did or did not attract a buyer;
- state that a municipality complied with or breached the law;
- present address joins, inferred rounds or missing outcomes as verified facts;
- compare unlike asset classes, periods or incomplete cohorts.

Every artifact carries this statement:

> Opracowanie przedstawia historyczne informacje opublikowane przez wskazane
> źródła. Nie stanowi wyceny nieruchomości, operatu szacunkowego, rekomendacji
> cenowej, audytu prawnego ani doradztwa inwestycyjnego.

Use neutral phrases such as `wynik bez nabywcy`, `opublikowana cena wywoławcza`,
`brak opublikowanego wyniku` and `pozycja do weryfikacji`. Do not use
`optymalna cena`, `strata`, `naruszenie`, `problem zasięgu` or other causal
language.

## Data acceptance gate

A report is eligible only when the exact entity, asset class and closed period
pass all automated gates and a manual source review:

- at least 20 decided events;
- at least three sold and three unsold events;
- 100% valid outcome-source links for decided events;
- unknown outcomes at or below 25%;
- inferred outcomes kept in the unknown category;
- non-municipal owner types excluded from a municipal scope;
- known address aliases folded before sequence metrics are calculated;
- every headline and rendered page independently inspected before release.

The readiness audit is a data-quality gate, not evidence of demand. For the
maximum four-year residential scope ending 2026-07-31, the current outreach
starting set is:

- Gliwice;
- Kamienna Góra;
- Głogów;
- Tarnowskie Góry.

The 2026-08-10 Pszczyna refresh now passes the automated numeric gate (38
decided events, 9.5% unknown and 100% recorded outcome-link coverage), but it is
not outreach-ready until the required manual source/content and address-join
review is completed.

Do not lower thresholds to manufacture a larger prospect list. Additional
entities enter the cohort only after their source coverage is improved and the
same audit passes.

## Distribution without a consulting motion

Use a standardized preview and written scope. Do not sell workshops, bespoke
recommendations or open-ended analysis.

Permitted validation routes, in order:

1. a published supplier/cooperation inbox that explicitly accepts offers;
2. a published request for quotation, market consultation or purchasing notice;
3. an opted-in introduction through a municipal association or event;
4. a factual public benchmark that lets officials request the fixed pilot;
5. a targeted physical letter if postage is acceptable.

Do not mass-email public departmental addresses, disguise sales as an access-to-
information request, or use e-Doręczenia as a marketing list. Once a buyer opts in,
ask:

> Czy zakup pilota za 2 900 zł + VAT, jeżeli ma zastosowanie, może zostać
> zrealizowany zgodnie z Państwa
> regulaminem zamówień poniżej 170 000 zł? Jakich dokumentów potrzebują Państwo
> od wykonawcy?

## Validation gates

### Day 45

Continue only if the current cohort or newly qualified targets
produce:

- at least three substantive responses;
- at least two buyer conversations;
- at least one written request for a priced pilot; and
- at least one paid order or signed purchase document.

Five qualified buyer conversations with no paid pilot at 2,900 zł is a stop or
reposition signal. Compliments, requests for free bespoke work and backlinks do
not pass the gate.

### Day 90

Continue productization only with:

- two paid pilots in total;
- at least one documented reuse in a real municipal workflow; and
- one second-period order, renewal or annual commitment.

One paid buyer earns a carefully documented manual delivery. Two paid buyers or
one renewal earn recurring report automation. A portal, API or integration is not
considered until three municipalities pay and two commit to continuation.

## What is explicitly deferred

- consumer lead forms, broker calls and CPL partnerships;
- newsletter monetization, sponsorship and paid advertising;
- RCN ingestion, automatic peer cohorts and league tables;
- new city adapters built only to enlarge the sales list;
- accounts, billing, database, customer portal, API or multi-tenancy;
- municipal-system access or customer uploads;
- AI, forecasting, valuation and property-specific recommendations;
- paid procurement or valuation consultants before revenue.

No paid consultant is required for the validation sprint. Seller/controller
identity, invoicing status and the permitted purchase documents are owner facts
that must be supplied before accepting money; they are tracked in the private
vault rather than duplicated here.

## Source of truth

- Implementation, quality and kill gates: [GTM-SPRINT.md](./GTM-SPRINT.md)
- Public offer: `site/dla-samorzadow/index.html`
- Report generator: `scripts/build-onepager.mjs`
- Readiness audit: `scripts/audit-b2g-readiness.mjs`
- Owner-only actions and target contacts: Obsidian vault,
  `40-projects/przetargimiejskie/b2g-pilot.md`
