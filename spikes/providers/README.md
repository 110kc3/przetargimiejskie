# Institutional seller feeds

These feeds are intentionally **not city adapters**. A state agency or company
can sell in many municipalities, and treating it as a city would corrupt city
counts and price medians. The shared contract lives under
`pipeline/src/providers/`; generated rows live under `data/providers/`.

Current production pilot:

| Provider | Scope | Results | Verdict |
|---|---|---|---|
| [PKP S.A.](./pkp.md) | residential-property sales, nationwide | structured status, bidders and achieved price where published | built |
| [AMW](./amw.md) | residential-category sales, nationwide | positive/negative result notices; OCR for achieved price | built |
| [Orange Nieruchomości](./orange.md) | mixed private-property offers | no dependable auction/result pair | deferred |

The website reads provider data only on `/archiwum-all` during the pilot.
Municipal summary cards, `data/index.json`, city health and the Chrome extension
remain city-only. Graduation to the public `/archiwum` view requires three
consecutive healthy daily refreshes and a manual row/link spot-check.

Preserve-on-collapse floors protect the committed baseline: a refresh must see
at least 50 PKP rows and 5 AMW rows. Falling below that threshold fails the job
without replacing the last-good provider files.

Run locally from `pipeline/`:

```bash
npm run refresh:providers
npm run health:providers
```

`PROVIDER=pkp npm run refresh:providers` refreshes one feed while rebuilding the
small provider index from the files already on disk.
