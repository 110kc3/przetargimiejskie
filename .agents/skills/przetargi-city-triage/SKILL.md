---
name: przetargi-city-triage
description: Spike, build or re-verify explicitly selected municipal auction adapters in przetargimiejskie and reconcile the city ledger. Use for city-triage batches or an accepted expansion task in this repository only.
---

# City triage

Verify this is przetargimiejskie. Read current repository instructions and the accepted
queue; an old expansion idea is not permission to add cities. A review/plan-only request
does not authorize adapter, ledger, generated-file or Git mutations.

Read `spikes/README.md`, `spikes/backlog.json`, `spikes/master-cities.json` and
`pipeline/ADAPTER-GUIDE.md`. These are the protocol and source of truth; this skill
does not duplicate their schema or replace their verification requirements.

Map the selected cities/count to their current states: pending → spike, build →
adapter, verify → re-spike. Leave built/no-build/dropped/deferred entries alone unless
the user explicitly selects reconsideration. Record whether auctions exist, where
they are published and their format; follow the protocol's verdict, effort, closest
analogue and file-path requirements. Verify before registering an adapter.

Default to sequential city work. Delegate only if the current session actually
authorizes agents; then cap concurrency at the smaller of available slots and six,
give each worker disjoint city ownership and let one coordinator update the shared
ledger after results are verified. Do not let workers race on master-cities.json.

After an authorized batch, reconcile master-cities.json from observed results and
regenerate `SPIKE-PROGRESS.md` using `node spikes/build-progress.mjs`. Verify that
ledger entries reference existing spike notes. Never hand-edit the generated rollup
or mark a city verified solely because a workflow was dispatched.

Use current native-platform commands and quiet tests with the real exit code. Stage
only this batch's changes, commit and push unless excluded. Never wait after push;
record pending run/commit evidence for the next session. Report each city's outcome,
ledger changes, local checks, external verification still pending and owner blockers.
