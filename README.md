# przetargimiejskie

Nationwide pipeline and Chrome extension tracking municipal property auctions (*przetargi nieruchomości*) across Polish cities and institutional sellers.

- **Nationwide auction monitoring:** Crawls, OCRs, and parses municipal announcements and outcome protocols through 619 registered city adapters drawn from an inventory of 1,026 official Polish cities, plus a separate PKP and AMW provider pilot. Registered is not published: 133 cities have published data as of 2026-11-14; two more (Ruda Śląska, Limanowa) are enrolled for their first publication, and the other 484 are held out of the daily refresh until their platform engine can extract prices and dates from attachments (BIP.INFO and MADKOM can; see [TODO.md](TODO.md)).
- **Relisting & price history:** Tracks price adjustments, auction rounds, and historical outcomes (sold, unsold, announced) for unique properties.
- **Chrome extension:** Opens any enabled city's data from the catalogue, and injects chronological auction history, relisting badges, and deal scores onto the supported portals of Gliwice, Katowice, Bytom, Rybnik, Mysłowice, Świętochłowice and Bielsko-Biała.
- **Serverless data pipeline:** A scheduled GitHub Actions refresh commits validated static JSON consumed directly by the extension. Municipal publication was stalled from 2026-10-21 to at least 2026-11-14; the recovery is recorded in [TODO.md](TODO.md) and the daily health run now fails when no publication lands within 2 days.
- **Documentation:** [`OPERATING-MODEL.md`](OPERATING-MODEL.md) · [`TODO.md`](TODO.md) · [`PLAN.md`](PLAN.md) · [`PRIVACY.md`](PRIVACY.md)

## Quick Start

```bash
sudo apt-get install poppler-utils tesseract-ocr tesseract-ocr-pol catdoc
cd pipeline
npm install

# Offline unit test suite (committed fixtures, no network or OCR tools needed)
npm test

# Live crawl of every registered city; CITY=<id> limits it to one city
npm run refresh
```

To run the Chrome extension, open `chrome://extensions`, enable **Developer mode**, and load the [`extension/`](extension/) directory unpacked.

## Status and limits

- Racibórz and Pszczyna need residential Polish egress and are excluded from hosted refreshes; see [`PL-EGRESS-PLAN.md`](PL-EGRESS-PLAN.md).
- The PKP and AMW provider rows appear only on the `/archiwum-all` website view; they are not part of the extension, `data/index.json` or municipal medians.
- The `/alerty/` page only prepares an e-mail draft; it does not send mail or subscribe anyone.
- The extension stores everything locally and only contacts GitHub for the public dataset; see [`PRIVACY.md`](PRIVACY.md).
