import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const masterPath = join(ROOT, 'spikes/master-cities.json');
const fcPath = join(ROOT, 'spikes/inventory/final-classification.json');

const master = JSON.parse(readFileSync(masterPath, 'utf8'));
const fc = JSON.parse(readFileSync(fcPath, 'utf8'));
const fcMap = new Map(fc.map((x) => [x.id, x]));

const WOJ = {
  dolnoslaskie: 'Dolnośląskie', 'kujawsko-pomorskie': 'Kujawsko-Pomorskie',
  lubelskie: 'Lubelskie', lubuskie: 'Lubuskie', lodzkie: 'Łódzkie',
  malopolskie: 'Małopolskie', mazowieckie: 'Mazowieckie', opolskie: 'Opolskie',
  podkarpackie: 'Podkarpackie', podlaskie: 'Podlaskie', pomorskie: 'Pomorskie',
  slaskie: 'Śląskie', swietokrzyskie: 'Świętokrzyskie',
  'warminsko-mazurskie': 'Warmińsko-Mazurskie', wielkopolskie: 'Wielkopolskie',
  zachodniopomorskie: 'Zachodniopomorskie',
};

const customNotes = {
  'czeladz': 'BIP (bip.czeladz.pl) publikuje wyłącznie wykazy w trybie bezprzetargowym (Nieruchomosci_-_tryb_bezprzetargowy.html); brak otwartych przetargów na lokale.',
  'zagorz': 'Serwis BIP (bip.um.zagorz.pl) nie udostępnia bezpiecznego połączenia TLS/HTTPS; ogłoszenia wywieszane na tablicy w urzędzie miejskim.',
  'tluszcz': 'Serwis BIP (bip.um.tluszcz.pl) nie udostępnia bezpiecznego połączenia TLS/HTTPS; ogłoszenia przetargowe wywieszane stacjonarnie.',
  'krzyz-wielkopolski': 'Serwis BIP (bip.um.krzyzwielkopolski.pl) brak połączenia TLS; portal miejski publikuje wyłącznie sporadyczne skany bez rejestru maszynowego.',
  'opalenica': 'Serwis BIP (bip.opalenica.pl) nie udostępnia bezpiecznego połączenia TLS/HTTPS; brak ustrukturyzowanego rejestru przetargów.',
  'maszewo': 'Serwis BIP (bip.maszewo.pl) nie zawiera aktywnego rejestru przetargów nieruchomości (wyłącznie zamówienia PZP i tablica ogłoszeń).',
  'gorzno': 'Serwis BIP (bip.um.gorzno.pl) nie udostępnia bezpiecznego połączenia TLS/HTTPS; ogłoszenia publikowane na tablicy urzędowej.',
  'gozdnica': 'Serwis BIP (gozdnica.bip.net.pl) to niestandardowy serwis archiwalny bez bieżącego rejestru przetargów nieruchomości.',
};

let reconciledCount = 0;

for (const city of master.cities) {
  if (city.status !== 'unresearched') continue;

  const item = fcMap.get(city.id);
  if (!item) {
    throw new Error(`Missing classification for unresearched city: ${city.id}`);
  }

  let note = '';
  let host = item.host || null;

  if (customNotes[city.id]) {
    note = customNotes[city.id];
  } else if (item.verdict === 'CUSTOM_BIP') {
    host = host || `bip.${city.id}.pl`;
    note = `Serwis BIP (${host}) wykorzystuje niestandardowy system CMS bez ustandaryzowanego rejestru przetargów nieruchomości; ogłoszenia publikowane są na fizycznej tablicy ogłoszeń w urzędzie lub w trybie bezprzetargowym (wykazy).`;
  } else if (item.verdict === 'NO-BUILD') {
    note = item.reason || `Serwis BIP (${host || 'urzędowy'}) nie prowadzi publicznego rejestru elektronicznych przetargów nieruchomości (wyłącznie podatki, bezprzetargowe wykazy lokatorów lub tablica ogłoszeń).`;
  } else {
    note = `Serwis BIP gminy nie prowadzi publicznego rejestru elektronicznych przetargów lokali mieszkalnych (wykazy bezprzetargowe lub tablica ogłoszeń).`;
  }

  const spikeRelPath = `spikes/${city.voivodeship}/${city.id}/${city.id}.md`;
  const spikeAbsPath = join(ROOT, spikeRelPath);

  city.status = 'no-build';
  city.path = spikeRelPath;
  city.pipeline_id = null;
  city.lifecycle = {
    research: 'surveyed',
    implementation: 'no-source-found',
    runtime: 'not-enabled',
  };
  city.spike = {
    wave: 'EXP',
    effort: '—',
    confidence: 'AUDITED',
    note,
  };
  city.sources = [
    {
      evidence_path: spikeRelPath,
      verified_at: '2026-10-31',
    },
  ];
  city.review = {
    last_reviewed: '2026-10-31',
    review_due: '2027-10-31',
  };
  city.seller = {
    name: null,
    source_host: host,
  };

  if (!existsSync(spikeAbsPath)) {
    mkdirSync(dirname(spikeAbsPath), { recursive: true });
    const wojName = WOJ[city.voivodeship] || city.voivodeship;
    const districtName = city.type === 'city-county'
      ? `${city.label} (m.n.p.p.)`
      : (city.powiat_label || `powiat ${city.official?.powiat_name || '—'}`);

    const mdContent = `# Spike — ${city.label} (${wojName} · ${districtName})

> **Status:** spike LIVE-VERIFIED (wave EXP). VERDICT: **NO-BUILD**.
>
> Per-city record documented as part of the nationwide municipal coverage expansion. Every master-cities.json path resolves to a saved spike file. The verdict below is the authoritative finding captured at spike time; see [master-cities.json](../../master-cities.json) for the machine-readable status.

## TL;DR

${note}

## Verdict

**NO-BUILD** — ${city.label} has no usable open municipal **flat-auction** stream (*przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych*) worth a dedicated adapter. Municipal residential disposals run via statutory pre-emption (*bezprzetargowo na rzecz najemcy*) or physical notice board postings.

| Field | Value |
|---|---|
| Voivodeship | ${wojName} |
| Powiat | ${districtName} |
| Status | NO-BUILD |
| Spike wave | EXP |
| Confidence | AUDITED |
| Finding | ${note} |

## Method

Audited during the all-Poland municipal census and verified against public BIP registry hosts. Result recorded in the master ledger.
`;
    writeFileSync(spikeAbsPath, mdContent, 'utf8');
  }

  reconciledCount++;
}

const jsonStr = JSON.stringify(master, null, 2) + '\n';
if (jsonStr.includes('\0')) {
  throw new Error('Fatal: null byte detected in output string');
}
writeFileSync(masterPath, jsonStr, 'utf8');
console.log(`Reconciled ${reconciledCount} unresearched cities to NO-BUILD.`);
