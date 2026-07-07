---
name: przetargi-city-triage
description: Dispatch a batch of city spikes / adapter builds / re-verifications for przetargimiejskie and keep the spike ledger consistent. Use when the user asks to spike cities, build adapters, clear the verify queue, or "continue the expansion".
---

# przetargi-city-triage

*(Reconstructed 2026-07-07 from the repo's own protocol docs and session history —
if an older original of this skill exists on another machine, replace this file.)*

The canonical protocol lives in the repo — this skill is the dispatcher, not the
spec. **Read these first, always:**

- `spikes/README.md` — the dispatch/resume protocol, folder naming, status meanings
- `spikes/backlog.json` — the 380-powiat queue (`pending` = pick from here)
- `spikes/master-cities.json` — per-city source of truth (`pending`/`build`/`built`/`no-build`/`verify`/`dropped`/`deferred`)
- `pipeline/ADAPTER-GUIDE.md` — how to build an adapter once a city is `build`

## Batch flow

1. **Scope the batch.** Default: the user names cities or a count ("spike 10",
   "clear the verify queue", "build the Low-effort queue"). Map each city to its
   action by `master-cities.json` status: `pending` → spike, `build` → build adapter,
   `verify` → re-spike, everything else → leave alone (never re-do
   `built`/`no-build`/`dropped`/`deferred`).

2. **Dispatch parallel agents** (background Agent tool), one per city, named after
   the action ("Spike <City>", "Rebuild <city> adapter", "Re-spike <City>"). Each
   agent prompt must include: the three load-bearing spike questions from
   `spikes/README.md` (does the gmina sell at auction / where published / what
   format), the BUILD/NO-BUILD verdict + effort + closest analog requirement, the
   spike-file path convention `spikes/<voivodeship>/<powiat>/<city>.md`, and for
   builds: follow `pipeline/ADAPTER-GUIDE.md` end-to-end including
   verify-before-register. Throttle: max ~6 agents at once — API rate limits killed
   larger waves before (2026-07-06); re-dispatch failures after the running batch
   drains.

3. **Ledger discipline (after every batch, no exceptions):**
   - Update `spikes/master-cities.json` (source of truth) with each city's new status.
   - Regenerate the roll-up: `node spikes/build-progress.mjs` —
     `SPIKE-PROGRESS.md` is GENERATED, never hand-edit it.
   - Integrity check: every master-cities entry must have its spike `.md` at its
     recorded path; report any mismatch.

4. **Repo house rules apply** (from `CLAUDE.md`): verify exact paths with ls/grep
   before editing; quiet test flags, failures only; large generated files are
   written via temp + tail-check, never Edit; commit per repo conventions.

5. **Report:** one line per city (`<city>: <old status> → <new status> (<verdict/effort>)`),
   then the new roll-up counts, then anything that failed with why.
