import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildInventory, extractHiddenInputs, parseDelimited, reconcileBacklog, verifyInventory,
} from '../../spikes/inventory/import-teryt.mjs';

const TERC = `WOJ;POW;GMI;RODZ;NAZWA;NAZWA_DOD;STAN_NA
02;;;;DOLNOŚLĄSKIE;województwo;2026-01-01
02;01;;;bolesławiecki;powiat;2026-01-01
02;01;04;4;Nowogrodziec;miasto;2026-01-01
12;;;;MAŁOPOLSKIE;województwo;2026-01-01
12;18;;;tarnowski;powiat;2026-01-01
12;18;03;4;Dobra;miasto;2026-01-01
24;;;;ŚLĄSKIE;województwo;2026-01-01
24;61;;;Bielsko-Biała;miasto na prawach powiatu;2026-01-01
24;61;01;1;Bielsko-Biała;gmina miejska;2026-01-01
32;;;;ZACHODNIOPOMORSKIE;województwo;2026-01-01
32;15;;;policki;powiat;2026-01-01
32;15;03;4;Dobra;miasto;2026-01-01
`;

const SIMC = `WOJ;POW;GMI;RODZ_GMI;RM;MZ;NAZWA;SYM;SYMPOD;STAN_NA
02;01;04;4;96;1;Nowogrodziec;0936123;0936123;2026-01-01
12;18;03;4;96;1;Dobra;0123456;0123456;2026-01-01
24;61;01;1;96;1;Bielsko-Biała;0925123;0925123;2026-01-01
32;15;03;4;96;1;Dobra;0987654;0987654;2026-01-01
32;15;03;4;99;1;Dobra-Część;0999999;0987654;2026-01-01
`;

const WMRODZ = `RM;NAZWA_RM;STAN_NA
96;miasto;2013-02-28
99;część miasta;2013-02-28
`;

const SOURCE = {
  publisher: 'GUS', retrieved_at: '2026-09-06', effective_date: '2026-01-01', files: {},
};

const LEGACY = {
  schema: 'spike-master/1',
  generated_at: '2026-07-20',
  cities: [
    {
      id: 'bielsko-biala', label: 'Bielsko-Biała', voivodeship: 'slaskie',
      powiat_label: 'Bielsko-Biała (miasto na prawach powiatu)', type: 'city-county',
      status: 'built', path: 'spikes/slaskie/bielsko-biala/bielsko-biala.md',
      spike: { effort: 'Medium', confidence: 'LIVE' },
    },
    {
      id: 'nowogrodziec', label: 'Nowogrodziec', voivodeship: 'dolnoslaskie',
      powiat_label: 'powiat bolesławiecki', type: 'land-powiat-seat',
      status: 'no-build', path: 'spikes/dolnoslaskie/powiat-boleslawiecki/nowogrodziec.md',
      spike: { effort: '—', confidence: 'LIVE' },
    },
  ],
};

const DATA_INDEX = {
  cities: [{ id: 'bielsko', label: 'Bielsko-Biała', voivodeship: 'slaskie' }],
};

function build(legacyMaster = LEGACY) {
  return buildInventory({
    tercCsv: TERC, simcCsv: SIMC, wmrodzCsv: WMRODZ,
    legacyMaster, dataIndex: DATA_INDEX, source: SOURCE, expectedCityCount: 4,
  });
}

test('CSV parser preserves quoted delimiters and leading-zero identifiers', () => {
  assert.deepEqual(parseDelimited('\uFEFFA;B\n"x;y";001\n'), [{ A: 'x;y', B: '001' }]);
});

test('download form attributes are decoded exactly once', () => {
  const inputs = extractHiddenInputs('<input type="hidden" name="__VIEWSTATE" value="a&amp;quot;b&amp;c">');
  assert.equal(inputs.__VIEWSTATE, 'a&quot;b&c');
});

test('TERYT import excludes city parts and preserves prior and pipeline identities', () => {
  const { manifest, discrepancies } = build();
  assert.equal(manifest.total, 4);
  assert.equal(manifest.cities.some((city) => city.label === 'Dobra-Część'), false);

  const bielsko = manifest.cities.find((city) => city.label === 'Bielsko-Biała');
  assert.equal(bielsko.id, 'bielsko-biala');
  assert.equal(bielsko.pipeline_id, 'bielsko');
  assert.deepEqual(bielsko.aliases, ['bielsko']);
  assert.equal(bielsko.lifecycle.runtime, 'monitored');
  assert.equal(bielsko.official.simc, '0925123');
  assert.equal(bielsko.review.review_due, '2026-10-18');
  assert.equal(bielsko.sources[0].verified_at, '2026-07-20');

  const dobra = manifest.cities.filter((city) => city.label === 'Dobra');
  assert.deepEqual(dobra.map((city) => city.id).sort(), ['dobra-0123456', 'dobra-0987654']);
  assert.ok(dobra.every((city) => city.status === 'unresearched'));
  assert.equal(discrepancies.unmatched_historic_entries.length, 0);
  assert.equal(discrepancies.unmatched_pipeline_cities.length, 0);
});

test('repeat import is byte-stable and keeps the coverage contract', () => {
  const first = build();
  const second = build(first.manifest);
  assert.equal(JSON.stringify(second.manifest), JSON.stringify(first.manifest));
  assert.equal(second.discrepancies.historic_entries, 2);
  assert.ok(second.manifest.cities.every((city) => city.lifecycle && city.capabilities && city.sources));
  assert.ok(second.manifest.cities.every((city) => (
    city.capabilities.cms_family === 'unknown'
    && city.capabilities.accessibility === 'unknown'
    && city.capabilities.coverage_period.from === null
  )));
});

test('powiat rows resolve to official identities and canonical existing evidence', () => {
  const { manifest, discrepancies } = build();
  const input = {
    total: 1,
    cities: [{
      label: 'Bielsko-Biała', voivodeship: 'slaskie',
      powiat_label: 'powiat bielski', powiat_slug: 'powiat-bielski',
      spike_path: 'spikes/slaskie/powiat-bielski/bielsko-biala.md', status: 'done',
    }],
  };
  const { backlog, unresolved } = reconcileBacklog(input, manifest);
  assert.deepEqual(unresolved, []);
  assert.equal(backlog.distinct_city_count, 1);
  assert.equal(backlog.cities[0].city_simc, '0925123');
  assert.equal(backlog.cities[0].spike_path, 'spikes/slaskie/bielsko-biala/bielsko-biala.md');
  assert.equal(backlog.cities[0].spike_path_original, 'spikes/slaskie/powiat-bielski/bielsko-biala.md');

  assert.deepEqual(verifyInventory({
    manifest, backlog, discrepancies, dataIndex: DATA_INDEX,
    checkPaths: false, expectedCityCount: 4,
  }), { cities: 4, pipeline: 1, backlog: 1 });
});
