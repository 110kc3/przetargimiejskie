# Saved-search / auction-alert validation

Source date: 19 October 2026. This is a self-service product experiment, not a
consulting or broker-lead offer. There is no billing, account system, newsletter
subscription or alert e-mail delivery in this slice.

The optional `/alerty/` form prepares a draft locally. The criteria stay in the
current tab's sessionStorage until the preview page reads and removes them. No
personal details are requested in the form, and no criteria enter page URLs.
`/alerty/zainteresowanie/` states that nothing has been sent and offers an explicit
mailto link. Only the visitor's own send action can produce a received message.
Ordinary correspondence handling and retention are disclosed in `/privacy/`.

## Measurement contract

| Evidence | What it can establish | What it cannot establish |
| --- | --- | --- |
| Cloudflare requests / bot classifications | Technical traffic estimates | People, interest confirmations, conversion or revenue |
| `/alerty/` page views | Exposure to the optional offer | Unique people or opted-in contacts |
| `/alerty/zainteresowanie/` page views | Interest in preparing a draft | Mail sent, subscription or willingness to pay |
| Actually received, voluntary e-mail | One confirmed interested contact after deduplication | A customer or payment |
| Explicit willingness-to-pay answer in received mail | Stated willingness, still hypothetical | A sale or revenue |
| Paid order / accounting evidence | Revenue, if later implemented and observed | Not present in this experiment |

Cloudflare supports page/path dimensions; this static flow uses separate routes,
not a made-up custom conversion event. Its page views and visits are different
metrics, and neither counts unique people. Query strings are not used for
measurement. Official references: [metrics](https://developers.cloudflare.com/web-analytics/data-metrics/high-level-metrics/),
[dimensions](https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/),
[privacy](https://www.cloudflare.com/web-analytics/),
[FAQ](https://developers.cloudflare.com/web-analytics/faq/).

## Thirty-day gate

Start the window when the deployed flow is actually available; record that date
in the owning TODO section. The gate is **10 distinct voluntary interested
contacts and 3 explicit willingness-to-pay confirmations within 30 days**. Do not
build billing or claim validated demand before that evidence exists. The current
status is **unobserved**, not zero verified customers and not a met gate.

Keep the received-message register privately, outside this repository. A record
has `source: "received_email"`, `voluntary: true`, a stable opaque `contact_id`,
`received_at`, and optional boolean `willingness_to_pay`. Do not enter e-mail
addresses or message bodies into public data files. Multiple messages from the
same contact count once. Page views and mailto clicks do not enter this register.

Run `node scripts/report-alert-interest.mjs PRIVATE_REGISTER.json REAL_START_DATE`
to produce the bounded-window counts and gate result. The script does not send
messages, collect submissions, infer identities or measure revenue. Missing or
unconfirmed evidence never qualifies.

Search Console remains an owner-account check: verify the property, inspect the
submitted sitemap and coverage/report date. The observed DNS verification token
and Google referrals do not prove account ownership or sitemap acceptance.
