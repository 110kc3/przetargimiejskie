# Agencja Mienia Wojskowego property auctions — BUILD

Official active list:
<https://amw.com.pl/pl/nieruchomosci/przetargi-nieruchomosci>

Official results:
<https://amw.com.pl/pl/nieruchomosci/przetargi-nieruchomosci/wyniki-przetargow>

## Scope and contract

The adapter follows the active list's server-rendered “Więcej ofert” pagination
and keeps sale rows carrying the official `mieszkaniowe` category. It also reads
the current official result ledger. Positive results map to `sold`, negative
results to `unsold`; result PDFs stay the primary source link.

Active offers have a stable trailing numeric ID. Result cards do not expose that
offer ID, so active and result events join on a deterministic hash of normalized
city + address + auction date. Fresh result fields replace the matching active
row while history missing from today's finite result page remains committed.

Positive result PDFs are often scanned. The shared OCR cache extracts achieved
price, admitted bidders, round and oral/written mode. Cached OCR text is parsed
again on every refresh so parser repairs update old rows without downloading or
OCRing the PDF twice.

The `mieszkaniowe` category occasionally includes a development plot. A row with
a parcel (`dz.`) but no apartment identity is classified as `grunt`, with its
area stored as `land_area_m2`; it does not enter flat-price statistics.

## Known limitations

- The result page is a short rotating ledger. Durable history starts from the
  first committed crawl and grows through merge-on-refresh.
- Negative result notices usually prove only that the auction failed; they do
  not consistently publish a structured reason.
- OCR-derived fields can remain null when a new scan is unreadable. The official
  PDF and source status are still retained, and health rejects duplicate or
  identity-less rows rather than guessing missing values.
