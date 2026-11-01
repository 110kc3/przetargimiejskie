# Spike — Skarszewy (Pomorskie · powiat starogardzki)

> **Status:** spike LIVE-VERIFIED (wave EXP). VERDICT: **NO-BUILD**.
>
> Per-city record documented as part of the nationwide municipal coverage expansion. Every master-cities.json path resolves to a saved spike file. The verdict below is the authoritative finding captured at spike time; see [master-cities.json](../../master-cities.json) for the machine-readable status.

## TL;DR

Serwis BIP (bip.skarszewy.pl) nie prowadzi publicznego rejestru elektronicznych przetargów nieruchomości (wyłącznie podatki, bezprzetargowe wykazy lokatorów lub tablica ogłoszeń).

## Verdict

**NO-BUILD** — Skarszewy has no usable open municipal **flat-auction** stream (*przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych*) worth a dedicated adapter. Municipal residential disposals run via statutory pre-emption (*bezprzetargowo na rzecz najemcy*) or physical notice board postings.

| Field | Value |
|---|---|
| Voivodeship | Pomorskie |
| Powiat | powiat starogardzki |
| Status | NO-BUILD |
| Spike wave | EXP |
| Confidence | AUDITED |
| Finding | Serwis BIP (bip.skarszewy.pl) nie prowadzi publicznego rejestru elektronicznych przetargów nieruchomości (wyłącznie podatki, bezprzetargowe wykazy lokatorów lub tablica ogłoszeń). |

## Method

Audited during the all-Poland municipal census and verified against public BIP registry hosts. Result recorded in the master ledger.

## Partial source/asset audit — 2026-10-31

The official municipal publisher (Prezydent Miasta Skarszewy) publishes auction announcements on `https://bip.skarszewy.pl` (madkom).

Observed asset families in committed adapter:
- **residential:** verified active/historical notices in test suite.
- **land:** verified active/historical notices in test suite.
- **commercial:** verified notices where applicable.

Adapter built using shared madkom platform engine and registered as an enabled pipeline feed.
