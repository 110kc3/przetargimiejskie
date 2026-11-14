# przetargimiejskie

Nationwide pipeline and Chrome extension tracking municipal property auctions (*przetargi nieruchomości*) across Polish cities and institutional sellers.

- **Nationwide auction monitoring:** Crawls, OCRs, and parses municipal announcements and outcome protocols across 1,000+ Polish cities plus PKP and AMW.
- **Relisting & price history:** Tracks price adjustments, auction rounds, and historical outcomes (sold, unsold, announced) for unique properties.
- **Chrome extension:** Injects chronological auction history, relisting badges, and deal scores directly onto municipal listing portals.
- **Serverless data pipeline:** Daily automated GitHub Actions refresh commits validated static JSON consumed directly by the extension.
- **Documentation:** [`OPERATING-MODEL.md`](OPERATING-MODEL.md) · [`TODO.md`](TODO.md) · [`PLAN.md`](PLAN.md) · [`PRIVACY.md`](PRIVACY.md)

## Quick Start

```bash
# Run unit test suite
cd pipeline
npm test

# Run the ingestion orchestrator locally
npm run refresh
```

To run the Chrome extension, open `chrome://extensions`, enable **Developer mode**, and load the [`extension/`](extension/) directory unpacked.
