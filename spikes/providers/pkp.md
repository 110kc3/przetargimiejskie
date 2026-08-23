# PKP S.A. property auctions — BUILD

Official source: <https://www.pkp.pl/pl/nieruchomosci-przetargi?menu=2>

## Scope and contract

The official directory is server-rendered and exposes stable query fields. The
adapter selects `Kategoria = Sprzedaż`, `Przeznaczenie = lokal mieszkalny`, all
statuses, and publication dates from 2020 onward. It follows every 50-row result
page and uses the stable `show=<id>` value as `event_key = pkp:<id>`.

The list supplies publication/auction/bid/wadium dates, location, status,
starting price, bidder count and achieved price. Detail pages add the unit area,
optional plot area and the underlying offer link. Detail enrichment is reused
from committed rows and fetched only when a positive unit area is absent.

Status mapping:

| PKP status | Stored outcome |
|---|---|
| Ogłoszony | `active` (aged to `archived` after its decisive date) |
| Rozstrzygnięty | `sold` |
| Nierozstrzygnięty | `no_winner` |
| Unieważniony / Odwołany | `cancelled` |

## Known limitations

- Some detail pages publish `0 / 0` for area. Zero is treated as unknown; a
  usable area embedded in the title is retained when present.
- A resolved auction can omit the achieved price even though its status proves
  it concluded. Such a row remains `sold` with `final_price_pln: null` rather
  than inventing a price.
- Titles are heterogeneous. Address parsing covers the common `ul./al.`,
  building/flat and `lokal nr N` forms; every row retains the verbatim title and
  direct official detail URL for verification.
