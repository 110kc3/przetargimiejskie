# B2G validation sprint — przetargimiejskie

> **Status:** active execution plan, rewritten 2026-08-11. This replaces the
> consumer lead-generation sprint. The commercial hypothesis is now a
> standardized municipal-data product, not consulting, valuation or a SaaS
> portal.

## Objective

Sell one bounded, source-linked pilot to a municipality or municipal property
unit, then prove that a second buyer or renewal exists before automating delivery.

The product is:

> **Karta wyników zbywania mienia — [jednostka], [rodzaj nieruchomości], [stały okres]**

Version one is a file delivery:

- an accessible PDF with historical process and publication metrics;
- a source-linked CSV/XLSX ledger of every included event;
- explicit scope, denominators, unknown outcomes and data-completeness notes;
- a generation timestamp and deterministic input fingerprint.

It is not bespoke advice. Every buyer receives the same methodology and a fixed
scope selected before generation.

## Hard product boundary

The product describes published historical events. It must never determine or
predict property value, recommend an opening price, estimate fiscal loss, diagnose
why an auction failed, or claim legal/non-compliance findings.

Every artifact carries this statement:

> Opracowanie przedstawia historyczne informacje opublikowane przez wskazane
> źródła. Nie stanowi wyceny nieruchomości, operatu szacunkowego, rekomendacji
> cenowej, audytu prawnego ani doradztwa inwestycyjnego.

Do not use: `wycena`, `optymalna/rekomendowana cena`, `jak ustalić cenę pierwszego
przetargu`, `strata`, `naruszenie`, or unsupported causal language such as `brak
wadium oznacza problem zasięgu`.

## Phase A — trustworthy pilot artifact

The first deliverable is a residential-only Gliwice preview for an explicit fixed
period. Before it may be published or sent:

1. Separate metrics from rendering into a tested pure module.
2. Require asset class, start date and end date on every generation run.
3. Keep `sold`, `unsold` and unknown/archived outcomes separate. Unknown is never
   counted as unsold.
4. Measure elapsed time only from an explicitly unsold event to the next distinct
   dated event for the same property.
5. Describe published starting-price changes without calling them loss, cost or
   evidence of causation.
6. Add a readiness audit: minimum sample, outcome balance, source coverage,
   unknown-outcome rate and disqualification reasons.
7. Include source URLs, denominator labels, data timestamp and input fingerprint.
8. Verify every headline metric independently against the committed Gliwice data
   and inspect the rendered PDF before committing it.

The old PDFs and charts are not sales assets. They mix property classes and contain
unsupported causal/fiscal claims; do not send or publish them.

## Phase B — 45-day buyer validation

Start with the current four-entity outreach cohort: Gliwice, Kamienna Góra, Głogów
and Tarnowskie Góry. Pszczyna now passes the automated gate after its 2026-08-10
refresh, but remains pending manual source/content and address-join review. Do
not expand the prospect count by weakening the thresholds. Start with
the property-management department or the director of a municipal ZGM/ZBM;
internal audit is a secondary user, not the opening buyer.

Offer:

- a free, standard one-page preview generated without bespoke analysis;
- a fixed-scope paid pilot at **2,900 zł + VAT, if applicable**;
- delivery as PDF + source ledger, with no account, upload or integration.

Use only lawful contact routes: an inbox explicitly inviting supplier offers, a
published market consultation/request, an opted-in introduction, an industry or
municipal association, or a physical letter. Do not mass-email public departmental
addresses with an unsolicited commercial offer.

Ask the interested department, not a paid procurement consultant:

> Czy zakup pilota za … zł netto może zostać zrealizowany zgodnie z Państwa
> regulaminem zamówień poniżej 170 000 zł? Jakich dokumentów potrzebują Państwo od
> wykonawcy?

Below the statutory PZP threshold, the municipality's internal purchasing rules
still govern the route. Never promise a direct award and never split an annual
service into artificial small orders.

Readiness requires 100% HTTP(S) outcome-source coverage for decided events.
Outcomes inferred only from a later round remain unknown, State Treasury assets
are outside a municipal/ZGM report unless expressly included, and source conflicts
remain visible rather than being resolved by the renderer.

### Day-45 gate

Continue only with:

- at least three substantive buyer responses;
- at least two buyer conversations;
- at least one written request for a priced pilot; and
- at least one paid order or signed purchase document.

Compliments, free-pilot interest and backlink offers do not pass the gate.

## Phase C — manual delivery before software

Deliver the first pilot manually and record:

- corrections requested by the buyer;
- time saved or a concrete internal workflow reuse;
- discrepancies found between the public record and buyer-selected internal
  samples;
- whether the buyer requests a second reporting period.

Automation is earned in stages:

- **one paid buyer:** complete and learn from the manual pilot;
- **two paid buyers or one renewal:** automate recurring report generation;
- **three paid municipalities and two annual continuations:** consider a portal,
  API or scheduled delivery.

Stop or reposition if five qualified buyer conversations produce no paid pilot at
the test price. Stop productization if two delivered pilots produce no workflow use,
second buyer or renewal.

## Explicitly deferred

- new city adapters and nationwide expansion;
- RCN ingestion or automated property matching;
- automatic peer selection;
- accounts, billing, database, customer portal, API or multi-tenancy;
- municipal-system access or customer uploads;
- AI, forecasting, valuation or property-specific recommendations;
- paid advertising, procurement certification or paid consultants.

The project can validate this hypothesis with the existing Node/Playwright pipeline,
public non-personal data, static hosting and the buyer's own purchasing documents.
If a future buyer requests property-specific interpretation, decline it or fund a
licensed partner from signed revenue rather than paying ahead of validation.

## Live owner actions

Tasks that require Kamil—seller/invoice details, review of the final preview and
external outreach—are maintained in the Obsidian vault under
`40-projects/przetargimiejskie/`. Repository TODOs should link there instead of
duplicating a private contact list or personal checklist.
