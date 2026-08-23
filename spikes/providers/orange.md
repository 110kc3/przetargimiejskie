# Orange Nieruchomości — DEFER / NO-GO for the auction pilot

Official sales portal: <https://www.nieruchomosci.orange.pl/sprzedaz>

The portal is useful for finding Orange-owned property, but it is not a good fit
for the first auction-history integration:

- it mixes ordinary sale offers, negotiations and a small auction subset;
- the inventory is dominated by land and commercial/technical property rather
  than repeat residential auctions;
- no stable, comprehensive result ledger was found that pairs an offer with
  bidder count and achieved price;
- treating every listing as an auction would mislabel private offers and weaken
  the project's result-history promise.

Decision: do not publish Orange rows in `data/providers` yet. Revisit only if an
official auction-only endpoint or result archive appears. A future **offers**
product could model Orange separately with `transaction_type = offer` and no
auction outcome, but that is a schema/product expansion—not a parser shortcut.
