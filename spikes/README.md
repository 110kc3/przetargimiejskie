# spikes/ — per-city build go/no-go spikes (all of Poland)

One markdown file per city, grouped **by district**:

```
spikes/<voivodeship>/<powiat>/<city>.md
```

- **voivodeship** — województwo slug (ASCII), e.g. `mazowieckie`, `slaskie`.
- **powiat** — the *district*. For a **miasto na prawach powiatu** (city-county) the
  folder is the city slug itself (the city *is* its own powiat). For a town inside a
  land powiat it is `powiat-<adjective>`, e.g. `powiat-olkuski`.
- **city** — city slug, ASCII-folded (ł→l, ą→a, …), spaces→`-`.

Example: `spikes/malopolskie/powiat-olkuski/olkusz.md`, `spikes/mazowieckie/warszawa/warszawa.md`.

## ⚑ Status files — READ before working on any city

Any agent (or person) picking up a city MUST check these first, so we never
re-spike, re-build, or duplicate work:

- **[`backlog.json`](./backlog.json)** — the full queue of all 380 powiat seats,
  each `status: "done" | "pending"` with voivodeship/powiat/`spike_path`. Pick
  `pending` cities from here. Human view: [`BACKLOG.md`](./BACKLOG.md).
- **[`master-cities.json`](./master-cities.json)** — the authoritative **per-city
  status** of every city already spiked. If a city is here, its `status` is the truth:

  | status | meaning |
  |---|---|
  | `pending` | not yet spiked |
  | `build` | spiked, source profiled, ready to build |
  | `built` | adapter shipped + registered + tested |
  | `no-build` | no usable flat-auction stream |
  | `verify` | needs a live re-check before building |
  | `dropped` / `deferred` | prior Śląsk decisions |

- **[`SPIKE-PROGRESS.md`](./SPIKE-PROGRESS.md)** — human roll-up + the BUILD-ready queue.

**Rule:** `built`/`no-build`/`dropped`/`deferred` → leave alone. `build` → build it
(see the guide below). `pending` → spike it.

> Every batch, after spiking/building, UPDATE `master-cities.json` + regenerate
> `SPIKE-PROGRESS.md` so status stays current, and re-run the integrity check
> (every master entry must have its spike `.md`).

## How to build (extract data)

Once a city is `build`, the full adapter-writing + data-extraction methodology —
the whole flow, CMS families → which analog to clone → core utilities → field
extraction → verify-before-register — is in
**[`pipeline/ADAPTER-GUIDE.md`](../pipeline/ADAPTER-GUIDE.md)**.

## What a spike file is

A live go/no-go investigation answering the three load-bearing questions (per
[EXPANSION.md](../EXPANSION.md) and the [SPIKE-TARNOWSKIE-GORY.md](../SPIKE-TARNOWSKIE-GORY.md) template):

1. **Does the gmina sell municipal property at auction?** (in scope vs out)
2. **Where is it published?** (host, BIP boards/URLs)
3. **In what format?** (server-rendered HTML / text-PDF / scanned-PDF→OCR / JSON-API / SPA)

…then a **BUILD / NO-BUILD** verdict + effort estimate + closest existing analog.

**Heuristic (from TODO.md):** a dedicated municipal housing manager (ZGM/ZBM/MZBM/ZGL)
publishing "przetarg ustny … na sprzedaż lokali mieszkalnych" = BUILD candidate;
a generic city-BIP property section usually skews to land + tenant sales. Confirm
open flat-auction volume EARLY.

## Scope & waves

- **Master list:** [`master-cities.json`](./master-cities.json).
- **Wave A (this effort):** all **66 miasta na prawach powiatu** (city-counties) — the
  largest cities, where ~all municipal flat-auction volume sits — plus the land-powiat
  seats already built. This is the highest-signal slice of "every city in Poland".
- **Long tail (later runs):** the ~900 towns inside land powiats. Enumerated progressively;
  the powiat folders are created as towns are spiked.
- **Progress + resume point:** [`SPIKE-PROGRESS.md`](./SPIKE-PROGRESS.md).

## Dispatch protocol

One agent per city. **Every dispatched agent is pointed at the Status files above +
[`pipeline/ADAPTER-GUIDE.md`](../pipeline/ADAPTER-GUIDE.md) first** — so it skips any
city already `done`/`built`/`no-build`/`dropped`/`deferred` and follows the standard
extraction flow. A spike agent live-verifies the three questions and writes its
`spikes/<woj>/<powiat>/<city>.md`; then `master-cities.json` + `SPIKE-PROGRESS.md`
are regenerated.
