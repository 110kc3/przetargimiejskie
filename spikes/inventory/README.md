# Official city inventory

`spikes/master-cities.json` is generated from the official GUS TERYT TERC,
SIMC and WMRODZ full files. SIMC locality type `RM=96` defines the 1,026 cities
and towns in the snapshot effective 1 January 2026; city parts are excluded.

The committed `source-manifest.json` records the official download page,
retrieval and effective dates, filenames and SHA-256 checksums. The import keeps
all codes as strings, maps the historic spike ledger and pipeline IDs without
changing their public identifiers, and writes `discrepancies.json` plus its
Markdown rendering.

The production refresh is `.github/workflows/inventory.yml`: a GitHub-hosted,
read-only network job creates an artifact, and a separate publisher accepts only
the five named generated outputs. Pull requests run the importer verification and
targeted tests but never publish. No Tailscale, private proxy or local runner is
part of the workflow.

Commands for fixture development and review:

```sh
node spikes/inventory/import-teryt.mjs verify
node --test pipeline/tests/teryt-inventory.test.js
```

The scheduled workflow performs the official download. A maintainer may reproduce
it with `refresh`, optionally supplying local `--terc`, `--simc` and `--wmrodz`
ZIP fixtures. Repeating an import against the same source snapshot and retrieval
date must be byte-stable.

Official documentation: [TERYT full-file downloads](https://eteryt.stat.gov.pl/eTeryt/rejestr_teryt/udostepnianie_danych/baza_teryt/uzytkownicy_indywidualni/pobieranie/pliki_pelne.aspx?contrast=default)
and [file structures](https://eteryt.stat.gov.pl/eTeryt/rejestr_teryt/udostepnianie_danych/baza_teryt/uzytkownicy_indywidualni/pobieranie/pliki_pelne_struktury.aspx).
