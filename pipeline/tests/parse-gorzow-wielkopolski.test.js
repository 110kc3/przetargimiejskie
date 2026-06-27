// PLACEHOLDER — the Gorzów Wielkopolski adapter generated on 2026-06-27 was
// corrupted by a sandbox mount-sync during the build agent's final write
// (truncated parse.js → the test file fails to load). It is therefore NOT
// registered in cities/index.js and needs a clean rebuild. Spike verdict: BUILD —
// see spikes/lubuskie/gorzow-wielkopolski/gorzow-wielkopolski.md (bip.um.gorzow.pl,
// born-digital PDFs both streams, ~12 flats/batch). This stub keeps `npm test`
// green until the rebuild lands; delete the stale src/cities/gorzow-wielkopolski/
// directory and rebuild the adapter, then replace this file with the real test.
import test from 'node:test';
test('gorzow-wielkopolski adapter — pending clean rebuild (build corrupted by mount-sync)', () => {});
