import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLand, landKey, mergePartialLand, reconcileLandHistory, splitParcels } from '../src/core/build-land.js';

const historyPlot = (key, date, outcome = 'active') => ({ key, listings: [{ date, outcome }] });

test('past announcements and terminal results fold identically in either source order', () => {
  const announcement = { dzialka_nr: '271', auction_date: '2020-04-23', starting_price_pln: 760000, source_url: 'announcement.html' };
  for (const outcome of ['sold', 'unsold', 'no_winner']) {
    const result = { ...announcement, outcome, final_price_pln: outcome === 'sold' ? 768000 : null, source_pdf: 'result.pdf', source_url: undefined };
    for (const rows of [[announcement, result], [result, announcement]]) {
      const [plot] = buildLand(rows, 'busko-zdroj').plots;
      assert.equal(plot.listings.length, 1);
      assert.equal(plot.listings[0].outcome, outcome);
      assert.equal(plot.listings[0].source_url, 'result.pdf');
      assert.equal(plot.listings[0].final_price_pln ?? null, result.final_price_pln);
    }
  }
});

test('a complete current board retains older plots and auction attempts by default', () => {
  const previous = [historyPlot('old', '2026-01-01', 'sold'), historyPlot('same', '2026-02-01', 'unsold')];
  const current = [historyPlot('same', '2026-11-01'), historyPlot('new', '2026-12-01')];
  const { plots, preserveFile } = reconcileLandHistory(previous, current);
  assert.equal(preserveFile, false);
  assert.equal(plots.length, 3);
  assert.deepEqual(plots.find(p => p.key === 'same').listings.map(l => l.date), ['2026-02-01', '2026-11-01']);
  assert.equal(plots.find(p => p.key === 'old').listings[0].outcome, 'sold');
  assert.equal(previous[1].listings.length, 1);
});

test('explicit fresh rebuild replaces complete input but partial input retains history', () => {
  const previous = [historyPlot('old', '2026-01-01', 'sold')];
  const current = [historyPlot('new', '2026-12-01')];
  assert.equal(reconcileLandHistory(previous, current, { mergeHistory: false }).plots.length, 1);
  assert.equal(reconcileLandHistory(previous, current, { mergeHistory: false, complete: false }).plots.length, 2);
  assert.equal(reconcileLandHistory(previous, [], { mergeHistory: false }).preserveFile, true);
});

test('empty evidence archives retained active events without inventing results or changing inputs', () => {
  const previous = [historyPlot('future', '2026-12-01'), historyPlot('sold', '2026-01-01', 'sold')];
  assert.equal(reconcileLandHistory(previous, []).preserveFile, true);
  const result = reconcileLandHistory(previous, [], { verifiedEmpty: true });
  assert.equal(result.preserveFile, false);
  assert.equal(result.plots.find(p => p.key === 'future').listings[0].outcome, 'archived');
  assert.equal(result.plots.find(p => p.key === 'sold').listings[0].outcome, 'sold');
  assert.equal(previous[0].listings[0].outcome, 'active');
  assert.equal(result.plots[0].listings[0].date, '2026-12-01');
});

test('retained past announcements age without downgrading outcomes or future dates', () => {
  const previous = [historyPlot('past', '2026-01-01'), historyPlot('future', '2026-12-01'), historyPlot('unsold', '2026-01-02', 'unsold')];
  const result = reconcileLandHistory(previous, [], { today: '2026-10-19' });
  assert.equal(result.preserveFile, false);
  assert.equal(result.plots.find(p => p.key === 'past').listings[0].outcome, 'archived');
  assert.equal(result.plots.find(p => p.key === 'future').listings[0].outcome, 'active');
  assert.equal(result.plots.find(p => p.key === 'unsold').listings[0].outcome, 'unsold');
});

test('landKey prefers parcel, then obręb-qualified parcel, then address', () => {
  assert.equal(landKey({ dzialka_nr: '233/1' }), 'dz|233/1');
  assert.equal(landKey({ dzialka_nr: '233/1', obreb: 'Śródmieście' }), 'dz|śródmieście|233/1');
  assert.equal(landKey({ address: { key: 'solskiego|10|' } }), 'addr|solskiego|10|');
  assert.equal(landKey({ street: 'Solskiego', street_norm: 'solskiego', building: '10' }), 'addr|solskiego|10|');
  assert.equal(landKey({ address_raw: 'ul. Bukowa dz. 5' }), 'addr|ul. bukowa dz. 5');
  assert.equal(landKey({}), null);
});

test('one plot per parcel; two rounds fold into one entry with 2 listings', () => {
  const { plots } = buildLand([
    { dzialka_nr: '1963/59', obreb: 'Brzezinka', area_m2: 514, starting_price_pln: 100000, auction_date: '2025-09-01', round: 1, outcome: 'archived' },
    { dzialka_nr: '1963/59', obreb: 'Brzezinka', area_m2: 514, starting_price_pln: 90000, auction_date: '2026-01-15', round: 4, outcome: 'active' },
  ], 'myslowice');
  assert.equal(plots.length, 1);
  const p = plots[0];
  assert.equal(p.key, 'dz|brzezinka|1963/59');
  assert.equal(p.kind, 'grunt');
  assert.equal(p.city, 'myslowice');
  assert.equal(p.area_m2, 514);
  assert.equal(p.listings.length, 2);
  // sorted oldest → newest, round preserved
  assert.deepEqual(p.listings.map((l) => l.round), [1, 4]);
  assert.equal(p.listings[0].outcome, 'archived');
});

test('distinct parcels stay separate; latest-date plot sorts first', () => {
  const { plots } = buildLand([
    { dzialka_nr: '10/1', auction_date: '2025-01-01', starting_price_pln: 1 },
    { dzialka_nr: '20/2', auction_date: '2026-06-01', starting_price_pln: 2 },
  ], 'bielsko');
  assert.equal(plots.length, 2);
  assert.equal(plots[0].dzialka_nr, '20/2'); // newest first
});

test('plot area takes the largest seen; missing round derives from order', () => {
  const { plots } = buildLand([
    { dzialka_nr: '5/5', area_m2: 600, auction_date: '2025-03-01', starting_price_pln: 1 },
    { dzialka_nr: '5/5', area_m2: 650, auction_date: '2025-08-01', starting_price_pln: 1 },
  ], 'gliwice');
  assert.equal(plots[0].area_m2, 650);
  assert.deepEqual(plots[0].listings.map((l) => l.round), [1, 2]); // derived
});

test('address-fallback keying when no parcel number is present', () => {
  const { plots } = buildLand([
    { street: 'Bukowa', street_norm: 'bukowa', building: '7', area_m2: 800, starting_price_pln: 670000, auction_date: '2026-05-01' },
  ], 'bielsko');
  assert.equal(plots.length, 1);
  assert.equal(plots[0].key, 'addr|bukowa|7|');
  assert.equal(plots[0].area_m2, 800);
});

test('empty input → empty plots', () => {
  assert.deepEqual(buildLand([], 'x'), { plots: [] });
  assert.deepEqual(buildLand(null, 'x'), { plots: [] });
});

test('buildLand attaches a geoportal_url to each plot', () => {
  const { plots } = buildLand([{ dzialka_nr: '5/5', obreb: 'X', auction_date: '2026-09-01', starting_price_pln: 1 }], 'demo', { label: 'Demo' });
  assert.ok(plots[0].geoportal_url, 'geoportal_url set');
});

test('splitParcels: distinct parcels, deduped, with separators', () => {
  assert.deepEqual(splitParcels('263/2, 263/6').map((p) => p.nr), ['263/2', '263/6']);
  assert.deepEqual(splitParcels('5/1; 5/2, 5/1').map((p) => p.nr), ['5/1', '5/2']);
  assert.deepEqual(splitParcels('389').map((p) => p.nr), ['389']);
  assert.deepEqual(splitParcels(null), []);
});

test('buildLand attaches a per-parcel `parcels` list for multi-parcel plots', () => {
  const { plots } = buildLand([{ dzialka_nr: '263/2, 263/6', obreb: 'Bojków', area_m2: 1626, auction_date: '2026-07-14', starting_price_pln: 543060 }], 'gliwice', { label: 'Gliwice' });
  assert.deepEqual(plots[0].parcels.map((p) => p.nr), ['263/2', '263/6']);
});

for (const today of ['2026-09-10', '2026-09-11', '2026-09-24']) {
  test(`mergePartialLand retains results and unseen history on ${today}`, (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date(`${today}T12:00:00Z`) });
    const previous = buildLand([
      { dzialka_nr: '1/1', auction_date: '2025-01-10', outcome: 'unsold', starting_price_pln: 100 },
      { dzialka_nr: '1/1', auction_date: '2026-09-10', outcome: 'sold', starting_price_pln: 90 },
      { dzialka_nr: '2/2', auction_date: '2024-04-20', outcome: 'archived', starting_price_pln: 50 },
    ], 'demo').plots;
    const current = buildLand([
      { dzialka_nr: '1/1', auction_date: '2026-09-10', outcome: 'active', starting_price_pln: 85, source_url: 'https://fallback.test/1.pdf' },
      { dzialka_nr: '3/3', auction_date: '2026-10-01', outcome: 'active', starting_price_pln: 200 },
    ], 'demo').plots;

    const merged = mergePartialLand(previous, current);
    assert.deepEqual(new Set(merged.map((plot) => plot.key)), new Set(['dz|1/1', 'dz|2/2', 'dz|3/3']));
    const first = merged.find((plot) => plot.key === 'dz|1/1');
    assert.equal(first.listings.length, 2, 'same-date fallback row is folded into existing history');
    assert.equal(first.listings[1].starting_price_pln, 85, 'newly parsed fields win');
    assert.equal(first.listings[1].source_url, 'https://fallback.test/1.pdf');
    assert.equal(first.listings[1].outcome, 'sold', 'an announcement cannot overwrite a resolved result');
  });
}

test('mergePartialLand preserves resolved outcomes but accepts newly published results', () => {
  const plot = (outcome) => [{ key: 'dz|1/1', listings: [{ date: '2026-09-10', outcome }] }];
  for (const resolved of ['sold', 'unsold', 'cancelled']) {
    for (const announcement of ['active', 'archived']) {
      const previous = plot(resolved);
      assert.equal(mergePartialLand(previous, plot(announcement))[0].listings[0].outcome, resolved);
      assert.equal(previous[0].listings[0].outcome, resolved, 'previous data is not mutated');
      assert.equal(mergePartialLand(plot(announcement), plot(resolved))[0].listings[0].outcome, resolved);
    }
  }
  assert.equal(mergePartialLand(plot('unsold'), plot('sold'))[0].listings[0].outcome, 'sold');
});
