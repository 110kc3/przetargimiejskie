# Go-to-market — municipal auction-data workflow services

> **Status:** active B2G discovery strategy, corrected 2026-08-11 after the
> public-data pricing review. The Gliwice report is a free proof of capability,
> not the paid product. Consumer subscriptions, lead generation and valuation
> remain outside the commercial thesis.

## Decision

Public notices and result documents are free. Access to them, or a summary made
only from them, is not presented as something a municipality should buy.

The paid hypothesis is a service around a real municipal workflow:

> **uporządkowanie i automatyzacja rejestru wyników sprzedaży mienia**

Possible paid work includes:

- mapping the unit's existing register and recurring reporting process;
- importing, normalizing and reconciling public or buyer-provided records;
- linking announcements, results and repeat dates for the same property;
- flagging missing outcomes, conflicting fields and unavailable source links;
- producing repeatable Excel/CSV exports or inputs to reports the unit already
  prepares;
- maintaining the agreed register and correction workflow.

These are candidate services, not assumed needs. No proposal or price is created
until a buyer confirms which repeated task exists, who performs it, and what
output would replace work rather than merely add another report.

The public Gliwice example under `/dla-samorzadow/przyklad-gliwice/` remains a
free, immutable demonstration of the data method. It does not silently change
with the daily dataset and carries no price or purchase claim.

## Buyer and discovery question

The first operational counterpart is the head of the property-sales function in
a ZGM/ZBM or municipal property department. That person can establish whether
the unit already has a structured internal register and whether any recurring
reconciliation or reporting is still manual. Procurement and finance determine
the route only after an actual need and scope exist.

The first question is:

> Jak dziś łączą Państwo ogłoszenie, wynik i kolejny termin tej samej
> nieruchomości, kto aktualizuje ten rejestr i jakie cykliczne zestawienia z niego
> powstają?

Follow with concrete process questions:

- What file or system is the authoritative register?
- Which steps are copied or checked manually, by whom, and how often?
- Which recurring export or report has a deadline and a named recipient?
- Which missing, duplicated or inconsistent fields create rework?
- Would an external implementation or maintenance service be usable under the
  unit's information-security and purchasing rules?

If there is no recurring job, no meaningful rework and no owner for the output,
there is no paid service to sell.

## Engagement shape

The sequence is discovery-first:

1. Show the free Gliwice example as evidence that the method works.
2. Confirm a repeated, owned workflow and its present cost in time or errors.
3. Define one measurable result, acceptance test, data boundary and delivery
   responsibility.
4. Ask the buyer for its permitted purchasing route and required documents.
5. Only then provide a written scope, total price and delivery date.

The first paid engagement may be a one-time register clean-up/implementation or
a small recurring maintenance and export service. There is deliberately no
public list price: the free data is not being sold, and the service cannot be
priced honestly before its work and acceptance criteria are known.

## Hard boundary

The public example and any future service may organize historical information
and automate agreed data operations. They must not:

- determine or predict property value;
- recommend an opening or subsequent price;
- estimate fiscal loss or missed revenue;
- diagnose why an auction did or did not attract a buyer;
- state that a municipality complied with or breached the law;
- present address joins, inferred rounds or missing outcomes as verified facts;
- replace the buyer's authoritative internal register or statutory report.

Every report artifact carries this statement:

> Opracowanie przedstawia historyczne informacje opublikowane przez wskazane
> źródła. Nie stanowi wyceny nieruchomości, operatu szacunkowego, rekomendacji
> cenowej, audytu prawnego ani doradztwa inwestycyjnego.

Use neutral phrases such as `wynik bez nabywcy`, `opublikowana cena wywoławcza`,
`brak opublikowanego wyniku` and `pozycja do weryfikacji`.

## Evidence gate

A public example or buyer-scoped analysis may be used only when the exact entity,
asset class and closed period pass automated gates and manual source review:

- at least 20 decided events;
- at least three sold and three unsold events;
- 100% valid outcome-source links for decided events;
- unknown outcomes at or below 25%;
- inferred outcomes kept unknown;
- non-municipal owner types excluded from a municipal scope;
- known address aliases folded before sequence metrics;
- every headline and rendered page independently inspected.

This proves data quality, not willingness to pay. The current free demonstration
is Gliwice. Other cities are not prospects until a workflow owner confirms a
problem; data qualification alone no longer creates an outreach list.

## Gliwice route

Gliwice's official ZGM material assigns sales of municipal premises by auction to
ZGM, and its organizational structure identifies a Dział Sprzedaży. That is the
right discovery owner; the general City Hall is not the first target.

Do not send an unsolicited commercial email to the published auction-help
address. It is provided for participants in property auctions, not suppliers.
Use one of these routes:

1. a targeted physical letter asking for a short process conversation;
2. a published ZGM market analysis, request for quotation or service procedure;
3. an introduction or explicit invitation to send the material.

After an invitation, email the free example and ask the process questions above.
Exact current contacts, official links and the letter draft live only in the
private vault.

## Validation gates

### Discovery gate — first 30 days

Continue only if there is:

- at least one conversation with the actual workflow owner;
- one confirmed repeated manual/reconciliation task;
- a named output, frequency and acceptance criterion; and
- explicit permission to return with a scoped service proposal.

### Commercial gate — day 60

Continue service development only with:

- one written request for scope or quotation through a permitted route; and
- one paid order, signed purchase document or formal procurement invitation.

Five qualified workflow-owner conversations with no repeated problem worth
funding is a stop/reposition signal. Interest in the free report is not demand.

### Repeatability gate — day 90+

Automation beyond the first implementation requires:

- a delivered service reused in a real workflow;
- a second paying unit or a renewal/maintenance request; and
- evidence that the same core process exists without bespoke reinvention.

## Explicitly deferred

- selling city-by-city reports made only from public data;
- public pricing before scope discovery;
- consumer lead forms, broker calls and CPL partnerships;
- newsletter monetization, sponsorship and paid advertising;
- RCN ingestion, peer cohorts and municipal league tables;
- new city adapters built only to enlarge a prospect list;
- accounts, billing, customer portal, multi-tenancy or a generic API;
- AI, forecasting, valuation and property-specific recommendations;
- paid procurement or valuation consultants before revenue.

## Source of truth

- Execution and kill gates: [GTM-SPRINT.md](./GTM-SPRINT.md)
- Public page: `site/dla-samorzadow/index.html`
- Free example generator: `scripts/build-onepager.mjs`
- Evidence audit: `scripts/audit-b2g-readiness.mjs`
- Owner actions, official contacts and outreach draft: private Obsidian vault,
  `40-projects/przetargimiejskie/b2g-pilot.md`
