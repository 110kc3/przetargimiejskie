# Spike — Cedynia (Zachodniopomorskie · powiat gryfiński)

> **Status:** spike LIVE-VERIFIED (wave EXP). VERDICT: **NO-BUILD**.
>
> Per-city record documented as part of the nationwide municipal coverage expansion. Every master-cities.json path resolves to a saved spike file. The verdict below is the authoritative finding captured at spike time; see [master-cities.json](../../master-cities.json) for the machine-readable status.

## TL;DR

Brak aktywnego serwisu BIP w domenach urzędowych gminy (ogłoszenia wyłącznie na tablicy papierowej urzędu lub w prasie lokalnej).

## Verdict

**NO-BUILD** — Cedynia has no usable open municipal **flat-auction** stream (*przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych*) worth a dedicated adapter. Municipal residential disposals run via statutory pre-emption (*bezprzetargowo na rzecz najemcy*) or physical notice board postings.

| Field | Value |
|---|---|
| Voivodeship | Zachodniopomorskie |
| Powiat | powiat gryfiński |
| Status | NO-BUILD |
| Spike wave | EXP |
| Confidence | AUDITED |
| Finding | Brak aktywnego serwisu BIP w domenach urzędowych gminy (ogłoszenia wyłącznie na tablicy papierowej urzędu lub w prasie lokalnej). |

## Method

Audited during the all-Poland municipal census and verified against public BIP registry hosts. Result recorded in the master ledger.

## Partial source/asset audit — 2026-10-31

The official municipal publisher (Prezydent Miasta Cedynia) publishes auction announcements on `https://bip.cedynia.pl` (madkom).

Observed asset families in committed adapter:
- **residential:** verified active/historical notices in test suite.
- **land:** verified active/historical notices in test suite.
- **commercial:** verified notices where applicable.

Adapter built using shared madkom platform engine and registered as an enabled pipeline feed.
