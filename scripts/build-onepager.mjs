#!/usr/bin/env node
// Fixed-scope B2G report generator.
//
// The historical filename is retained so existing runbooks do not break, but
// this no longer builds a sales "one-pager" or pricing advice. It emits a
// source-linked HTML/PDF report and CSV ledger for one explicit property class
// and inclusive date range.
//
//   node scripts/build-onepager.mjs \
//     --kind mieszkalny --from 2024-08-01 --to 2026-07-31 gliwice
//
// A public, accessible example can be written directly into the static site:
//
//   node scripts/build-onepager.mjs \
//     --kind mieszkalny --from 2024-08-01 --to 2026-07-31 \
//     --output-dir site/dla-samorzadow/przyklad-gliwice --web-example gliwice

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  analyseB2G,
  MUNICIPAL_EXCLUDED_OWNER_TYPES,
} from './lib/b2g-analysis.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');
const formatInt = (value) => Number(value).toLocaleString('pl-PL');
const formatNumber = (value, digits = 1) => value == null
  ? '—'
  : Number(value).toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const formatMoney = (value) => value == null
  ? '—'
  : `${Number(value).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} zł`;
const formatDate = (iso) => iso
  ? new Intl.DateTimeFormat('pl-PL', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(`${iso}T00:00:00Z`))
  : '—';

const KIND_LABELS = {
  mieszkalny: 'lokale mieszkalne',
  uzytkowy: 'lokale użytkowe',
  garaz: 'garaże',
  zabudowana: 'nieruchomości zabudowane',
  grunt: 'grunty',
};

// Manual HTTP verification belongs to the immutable public snapshot, not the
// deterministic analysis or its readiness gate. Municipal pages can disappear
// after publication; recording that fact is more honest than silently dropping
// the historical URL or pretending a syntactically valid link is still live.
const PUBLIC_SOURCE_VERIFICATION = Object.freeze({
  gliwice: {
    checkedAt: '2026-08-11',
    recordedUrls: 43,
    httpOkUrls: 41,
    uniqueOutcomeSourceUrls: 38,
    outcomeSourceUrlsHttpOk: 38,
    unavailableSupplementaryUrls: [
      {
        status: 404,
        url: 'https://bip.gliwice.eu/sprzedaz-przetarg-29062026-ul-krolewskiej-tamy-552-ul-krolewskiej-tamy-532-ul-plebiscytowa-4-9-ul-poniatowskiego-113-lokale-mieszkalne-ul-zwyciestwa-457-lokal-uzytkowy-ul-kozielska-13-garaz-nr-1',
      },
      {
        status: 404,
        url: 'https://bip.gliwice.eu/sprzedaz-przetarg-6072026-ul-ignacego-daszynskiego-6510-ul-zwyciestwa-116c-ul-karola-libelta-101-ul-swietojanska-393-ul-rybnicka-2519-ul-rybitwy-1317-lokale-mieszkalne-ul-chorzowska-4012-lokal-uzytkowy',
      },
    ],
  },
});

function safeHttpHref(value) {
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : '#';
  } catch {
    return '#';
  }
}

function slug(value) {
  return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseOptionValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${option} requires a value`);
  return value;
}

export function parseArgs(argv) {
  const options = { cityIds: [], outputDir: null, webExample: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--kind') options.assetClass = parseOptionValue(argv, index++, arg);
    else if (arg === '--from') options.from = parseOptionValue(argv, index++, arg);
    else if (arg === '--to') options.to = parseOptionValue(argv, index++, arg);
    else if (arg === '--output-dir') options.outputDir = parseOptionValue(argv, index++, arg);
    else if (arg === '--web-example') options.webExample = true;
    else if (arg.startsWith('--')) throw new Error(`unknown option: ${arg}`);
    else options.cityIds.push(arg);
  }
  if (!options.assetClass || !options.from || !options.to || !options.cityIds.length) {
    throw new Error('usage: node scripts/build-onepager.mjs --kind <kind> --from YYYY-MM-DD --to YYYY-MM-DD [--output-dir DIR --web-example] <city-id> [...]');
  }
  if (options.outputDir && options.cityIds.length !== 1) {
    throw new Error('--output-dir requires exactly one city');
  }
  if (options.webExample && !options.outputDir) {
    throw new Error('--web-example requires --output-dir');
  }
  return options;
}

function addressText(event) {
  const parts = [event.address.street, event.address.building].filter(Boolean);
  const base = parts.join(' ');
  if (event.address.apt) return `${base}/${event.address.apt}`;
  if (event.address.parcel) return `${base}${base ? ' · ' : ''}dz. ${event.address.parcel}`;
  return base || event.propertyKey;
}

function outcomeLabel(outcome) {
  if (outcome === 'sold') return 'sprzedano';
  if (outcome === 'unsold') return 'bez nabywcy';
  return 'brak opublikowanego wyniku';
}

function reasonLabel(reason) {
  const labels = {
    no_deposits: 'brak wpłaconych wadiów',
    bidder_noshow: 'oferent/oferenci nie stawili się',
    bidder_withdrew: 'wycofanie lub rezygnacja oferenta',
    no_participants: 'brak uczestników lub nabywcy',
    unclassified: 'kod nieznormalizowany',
    unknown: 'brak opublikowanego powodu',
  };
  return labels[reason] ?? reason ?? '';
}

function spreadsheetSafe(value) {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value) {
  const text = spreadsheetSafe(value).replaceAll('"', '""');
  return `"${text}"`;
}

export function renderCsv(analysis) {
  const headers = [
    'schema', 'fingerprint_danych', 'zakres_od', 'zakres_do', 'rodzaj', 'wykluczone_typy_wlasciciela',
    'klucz_nieruchomosci', 'ulica', 'budynek', 'lokal_lub_dzialka', 'data',
    'sekwencja_w_okresie', 'wynik', 'surowe_wyniki', 'status_dowodu_wyniku',
    'liczba_polaczonych_wierszy', 'cena_wywolawcza_pln', 'ceny_wywolawcze_w_zrodlach_pln',
    'cena_osiagnieta_pln', 'ceny_osiagniete_w_zrodlach_pln', 'powod_braku_nabywcy',
    'znormalizowane_powody_braku_nabywcy', 'surowe_kody_powodu', 'typ_wlasciciela', 'raportowana_runda',
    'raportowane_rundy_w_zrodlach', 'status_pola_runda', 'zrodlo_wyniku',
    'glowne_zrodlo', 'wszystkie_zrodla',
  ];
  const rows = analysis.events.map((event) => [
    analysis.schemaVersion,
    analysis.inputFingerprint,
    analysis.scope.from,
    analysis.scope.to,
    analysis.scope.assetClass,
    analysis.scope.excludedOwnerTypes.join(' | '),
    event.propertyKey,
    event.address.street ?? '',
    event.address.building ?? '',
    event.address.apt ?? event.address.parcel ?? '',
    event.date,
    event.observedSequence,
    outcomeLabel(event.outcome),
    event.rawOutcomes.join(' | '),
    event.outcomeEvidenceValues.join(' | '),
    event.observedRawRows,
    event.publishedStartingPricePln ?? '',
    event.publishedStartingPriceValuesPln.join(' | '),
    event.publishedFinalPricePln ?? '',
    event.publishedFinalPriceValuesPln.join(' | '),
    reasonLabel(event.unsoldReasonCategory),
    event.unsoldReasonCategories.map(reasonLabel).join(' | '),
    event.unsoldReasons.join(' | '),
    event.ownerType ?? '',
    event.reportedRound ?? '',
    event.reportedRoundValues.join(' | '),
    event.reportedRoundEvidence,
    event.outcomeSourceUrl ?? '',
    event.sourceUrl ?? '',
    event.sourceUrls.join(' | '),
  ]);
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`;
}

function yearTable(analysis) {
  return analysis.byYear.map((year) => `<tr>
    <th scope="row">${esc(year.year)}</th>
    <td>${year.counts.sold}</td>
    <td>${year.counts.unsold}</td>
    <td>${year.counts.unknown}</td>
    <td>${year.counts.decided}</td>
    <td>${formatNumber(year.sellThroughAmongDecided.percentage)}%</td>
  </tr>`).join('');
}

const SOURCE_SAMPLE_LIMIT = 8;

function sourceRows(analysis, limit = SOURCE_SAMPLE_LIMIT) {
  return [...analysis.events].sort((left, right) => right.date.localeCompare(left.date)
    || left.propertyKey.localeCompare(right.propertyKey)).slice(0, limit).map((event) => {
    const href = safeHttpHref(event.sourceUrl);
    const source = href === '#'
      ? '<span>brak linku</span>'
      : `<a href="${esc(href)}">dokument źródłowy</a>`;
    return `<tr>
      <td>${esc(event.date)}</td>
      <td>${esc(addressText(event))}</td>
      <td>${esc(outcomeLabel(event.outcome))}</td>
      <td>${formatMoney(event.publishedStartingPricePln)}</td>
      <td>${source}</td>
    </tr>`;
  }).join('');
}

function readinessRows(analysis) {
  const checks = analysis.readiness.checks;
  const row = (label, value, passed) => `<tr><th scope="row">${esc(label)}</th><td>${esc(value)}</td><td>${passed ? 'spełnione' : 'niespełnione'}</td></tr>`;
  return [
    row('Opublikowane wyniki rozstrzygnięte', `${checks.decidedSample.actual} (minimum ${checks.decidedSample.minimum})`, checks.decidedSample.passed),
    row('Równowaga wyników', `${checks.soldAndUnsoldBalance.sold} sprzedaży / ${checks.soldAndUnsoldBalance.unsold} bez nabywcy`, checks.soldAndUnsoldBalance.passed),
    row('Źródło potwierdzające rozstrzygnięty wynik', `${formatNumber(checks.decidedSourceCoverage.percentage)}%`, checks.decidedSourceCoverage.passed),
    row('Nieznany wynik wśród obserwowanych zdarzeń', `${formatNumber(checks.unknownOutcomeShare.percentage)}% (maks. ${formatNumber(checks.unknownOutcomeShare.maximumPercentage)}%)`, checks.unknownOutcomeShare.passed),
  ].join('');
}

export function renderReportHtml({
  city, meta, analysis, csvName, pdfName, analysisName = null,
  publicExample = false, sourceVerification = null,
}) {
  const counts = analysis.outcomes.counts;
  const gap = analysis.elapsedAfterExplicitlyUnsold.summaryDays;
  const priceChange = analysis.publishedStartingPriceChangesAfterExplicitlyUnsold.summaryPercentage;
  const noDeposit = analysis.noDeposit;
  const kindLabel = KIND_LABELS[analysis.scope.assetClass] ?? analysis.scope.assetClass;
  const dataTimestamp = meta.generated_at || 'nie podano';
  const shortFingerprint = analysis.inputFingerprint.replace('sha256:', '').slice(0, 16);
  const boundary = 'Opracowanie przedstawia historyczne informacje opublikowane przez wskazane źródła. Nie stanowi wyceny nieruchomości, operatu szacunkowego, rekomendacji cenowej, audytu prawnego ani doradztwa inwestycyjnego.';
  const excludedOwnerEvents = analysis.selection.excludedOwnerType;
  const excludedOwnerPhrase = excludedOwnerEvents === 1
    ? '1 zdarzenie oznaczone'
    : `${excludedOwnerEvents} zdarzeń oznaczonych`;
  const ownershipExclusion = analysis.scope.excludedOwnerTypes.includes('state_treasury')
    ? `<li>Z zakresu jednostki wyłączono ${excludedOwnerPhrase} w danych jako własność Skarbu Państwa.</li>`
    : '';
  const sourceVerificationNote = sourceVerification
    ? `<li>Ręczna kontrola dostępności ${formatDate(sourceVerification.checkedAt)}: ${sourceVerification.outcomeSourceUrlsHttpOk}/${sourceVerification.uniqueOutcomeSourceUrls} unikalnych adresów dokumentów potwierdzających rozstrzygnięcia odpowiedziało HTTP 200. ${sourceVerification.unavailableSupplementaryUrls.length} dodatkowe historyczne adresy stron BIP odpowiedziały 404; pozostają w rejestrze jako ślad publikacji obok działających źródeł.</li>`
    : '';

  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>Karta wyników — ${esc(city.label)} — ${esc(kindLabel)}</title>
<meta name="description" content="Źródłowa karta historycznych wyników przetargów: ${esc(city.label)}, ${esc(kindLabel)}, ${esc(analysis.scope.from)}–${esc(analysis.scope.to)}." />
${publicExample ? `<link rel="canonical" href="https://przetargimiejskie.pl/dla-samorzadow/przyklad-${esc(city.id)}/" />
<meta property="og:title" content="Karta wyników — ${esc(city.label)} — ${esc(kindLabel)}" />
<meta property="og:description" content="Źródłowa karta historycznych wyników: jawny zakres, mianowniki, braki i rejestr dokumentów." />
<meta property="og:type" content="article" />
<meta property="og:url" content="https://przetargimiejskie.pl/dla-samorzadow/przyklad-${esc(city.id)}/" />
<meta property="og:image" content="https://przetargimiejskie.pl/og-image.png" />` : ''}
<style>
:root{color-scheme:light;--ink:#172536;--navy:#173a5e;--muted:#59697a;--line:#ccd6df;--soft:#f2f5f8;--green:#247d53;--red:#a33b35;--amber:#9a6512;--blue:#2f6fad}
*{box-sizing:border-box}
body{margin:0;background:#e9eef3;color:var(--ink);font:15px/1.55 "Liberation Sans","DejaVu Sans",Arial,sans-serif;font-variant-numeric:tabular-nums}
a{color:#175e9c;text-underline-offset:2px}
a:focus-visible{outline:3px solid #d38a16;outline-offset:3px}
.shell{max-width:1040px;margin:28px auto;background:#fff;box-shadow:0 8px 34px rgba(23,58,94,.13)}
.report-head{padding:34px 42px 28px;background:var(--navy);color:#fff}
.report-head .eyebrow{margin:0 0 8px;color:#bfd5e8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.12em}
.report-head h1{margin:0;font-size:31px;line-height:1.15}
.report-head .scope{margin:10px 0 0;color:#d8e4ef}
.downloads{display:flex;gap:10px;flex-wrap:wrap;padding:14px 42px;background:#e8f0f7;border-bottom:1px solid var(--line)}
.downloads a{display:inline-flex;min-height:42px;align-items:center;padding:8px 13px;border:1px solid #9db4c8;border-radius:6px;background:#fff;font-weight:700;text-decoration:none}
main{padding:30px 42px 42px}
.intro{margin:0 0 22px;color:var(--muted);max-width:82ch}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0 30px}
.kpi{border:1px solid var(--line);border-top:4px solid var(--blue);border-radius:6px;padding:16px;background:#fff}
.kpi.sold{border-top-color:var(--green)}.kpi.unsold{border-top-color:var(--red)}.kpi.unknown{border-top-color:var(--amber)}
.kpi strong{display:block;font-size:27px;line-height:1.1;color:var(--navy)}
.kpi span{display:block;margin-top:6px;color:var(--muted);font-size:12px}
section{margin-top:30px}
h2{margin:0 0 6px;color:var(--navy);font-size:21px}
h3{margin:18px 0 6px;color:var(--navy);font-size:16px}
.section-note{margin:0 0 13px;color:var(--muted);font-size:13px}
.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:6px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:9px 11px;border-bottom:1px solid var(--line);vertical-align:top}
thead th{background:var(--soft);color:#425365;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
tbody tr:last-child th,tbody tr:last-child td{border-bottom:0}
.metric-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.metric{border:1px solid var(--line);border-radius:6px;padding:16px;background:var(--soft)}
.metric strong{display:block;color:var(--navy);font-size:20px}
.metric span{color:var(--muted);font-size:12px}
.method{padding-left:20px}.method li{margin:7px 0}
.boundary{padding:17px 19px;border:1px solid #d6b675;border-left:5px solid var(--amber);background:#fff9ec;border-radius:5px}
.boundary h2{font-size:18px}.boundary p{margin:0}
.meta{margin-top:28px;padding:14px 16px;background:var(--soft);border-radius:5px;color:var(--muted);font-size:11px;overflow-wrap:anywhere}
.report-foot{padding:18px 42px 24px;border-top:1px solid var(--line);color:var(--muted);font-size:11px}
@media(max-width:760px){.shell{margin:0;box-shadow:none}.report-head,.downloads,main,.report-foot{padding-left:20px;padding-right:20px}.kpis,.metric-grid{grid-template-columns:1fr 1fr}}
@media(max-width:480px){.kpis,.metric-grid{grid-template-columns:1fr}.report-head h1{font-size:26px}}
@media print{
  @page{size:A4;margin:13mm}
  body{background:#fff;font-size:10pt;print-color-adjust:exact;-webkit-print-color-adjust:exact}
  .shell{max-width:none;margin:0;box-shadow:none}.downloads{display:none}
  .report-head{padding:20px 24px}.report-head h1{font-size:23px}main{padding:20px 24px}.report-foot{padding:12px 24px;border-top:0}
  .kpis{margin:14px 0 20px}.kpi{padding:10px}.kpi strong{font-size:20px}
  section{margin-top:20px}h2{break-after:avoid-page}.section-note{break-after:avoid-page}
  .table-wrap,.kpis,.metric-grid,.boundary,.meta{break-inside:avoid}
  section[aria-labelledby="quality-title"]{break-inside:avoid-page}
  section[aria-labelledby="sources-title"] .table-wrap{break-inside:auto}
  section[aria-labelledby="method-title"]{break-inside:avoid-page}
  thead{display:table-header-group}tr{break-inside:avoid-page}
  a{color:var(--ink);text-decoration:none}
}
</style>
</head>
<body>
<article class="shell">
  <header class="report-head">
    <p class="eyebrow">${publicExample ? 'Publiczny przykład · ' : ''}Karta wyników zbywania mienia</p>
    <h1>${esc(city.label)} · ${esc(kindLabel)}</h1>
    <p class="scope">Okres zamknięty: ${formatDate(analysis.scope.from)}–${formatDate(analysis.scope.to)} · publiczne adresy źródłowe: ${analysis.provenance.uniqueSourceUrlCount}</p>
  </header>
  <nav class="downloads" aria-label="Pliki karty">
    <a href="./${esc(pdfName)}">Pobierz PDF</a>
    <a href="./${esc(csvName)}">Pobierz pełny rejestr CSV</a>
    ${analysisName ? `<a href="./${esc(analysisName)}">Pobierz utrwaloną analizę JSON</a>` : ''}
    <a href="/dla-samorzadow/">Zakres produktu</a>
  </nav>
  <main>
    <p class="intro">Podsumowanie obejmuje wyłącznie zdarzenia opublikowane dla wskazanego rodzaju nieruchomości, okresu i zakresu właściciela. Wynik nieznany pozostaje oddzielną kategorią i nie jest zaliczany do postępowań bez nabywcy.</p>

    <section aria-labelledby="summary-title">
      <h2 id="summary-title">Zakres i wyniki</h2>
      <div class="kpis">
        <div class="kpi"><strong>${counts.total}</strong><span>zaobserwowanych zdarzeń w okresie</span></div>
        <div class="kpi sold"><strong>${counts.sold} / ${counts.decided}</strong><span>sprzedaży wśród ${counts.decided} opublikowanych wyników (${formatNumber(analysis.outcomes.sellThroughAmongDecided.percentage)}%)</span></div>
        <div class="kpi unsold"><strong>${counts.unsold} / ${counts.decided}</strong><span>wyników bez nabywcy wśród ${counts.decided} rozstrzygniętych (${formatNumber(analysis.outcomes.unsoldShareAmongDecided.percentage)}%)</span></div>
        <div class="kpi unknown"><strong>${counts.unknown} / ${counts.total}</strong><span>zdarzeń bez opublikowanego wyniku (${formatNumber(analysis.outcomes.unknownShareAmongObserved.percentage)}%)</span></div>
      </div>
      <div class="table-wrap"><table>
        <caption class="section-note">Wyniki według roku; udział sprzedaży liczony wyłącznie wśród wyników sprzedano/bez nabywcy.</caption>
        <thead><tr><th scope="col">Rok</th><th scope="col">Sprzedano</th><th scope="col">Bez nabywcy</th><th scope="col">Wynik nieznany</th><th scope="col">Mianownik</th><th scope="col">Udział sprzedaży</th></tr></thead>
        <tbody>${yearTable(analysis)}</tbody>
      </table></div>
    </section>

    <section aria-labelledby="sequence-title">
      <h2 id="sequence-title">Zaobserwowane sekwencje</h2>
      <p class="section-note">Sekwencja oznacza kolejność odrębnych dat znalezionych w źródłach w granicach raportu. Pole „runda” może być źródłowe albo wyprowadzone z historii i nie służy do liczenia tych wskaźników.</p>
      <div class="metric-grid">
        <div class="metric"><strong>${analysis.repeatedAttempts.propertiesWithMultipleObservedAttempts} / ${analysis.repeatedAttempts.propertiesWithObservedAttempts}</strong><span>nieruchomości z więcej niż jednym zaobserwowanym terminem</span></div>
        <div class="metric"><strong>${gap.sampleSize ? `${formatNumber(gap.median, 0)} dni` : 'brak próby'}</strong><span>mediana czasu od opublikowanego wyniku bez nabywcy do następnego zaobserwowanego terminu (n=${gap.sampleSize})</span></div>
        <div class="metric"><strong>${priceChange.sampleSize ? `${formatNumber(priceChange.median)}%` : 'brak próby'}</strong><span>mediana zmiany opublikowanej ceny wywoławczej przy następnym zaobserwowanym terminie po wyniku bez nabywcy (n=${priceChange.sampleSize})</span></div>
        <div class="metric"><strong>${noDeposit.explicitlyUnsoldWithNoDeposits} / ${noDeposit.explicitlyUnsoldObservedAttempts}</strong><span>wyników bez nabywcy, w których źródło wskazało brak wpłaconych wadiów; pokrycie znormalizowanych powodów ${formatNumber(noDeposit.normalizedReasonCoverageAmongExplicitlyUnsold.percentage)}%</span></div>
      </div>
    </section>

    <section aria-labelledby="quality-title">
      <h2 id="quality-title">Automatyczna kontrola gotowości danych</h2>
      <p class="section-note">Status tej karty: <strong>${analysis.readiness.ready ? 'progi automatycznej kontroli spełnione' : 'nie wszystkie progi automatycznej kontroli są spełnione'}</strong>. Kontrola nie zastępuje sprawdzenia dokumentów źródłowych.</p>
      <div class="table-wrap"><table>
        <thead><tr><th scope="col">Kontrola</th><th scope="col">Wynik</th><th scope="col">Status</th></tr></thead>
        <tbody>${readinessRows(analysis)}</tbody>
      </table></div>
    </section>

    <section aria-labelledby="sources-title">
      <h2 id="sources-title">Przykładowe pozycje źródłowe</h2>
      <p class="section-note">Poniżej ${SOURCE_SAMPLE_LIMIT} najnowszych pozycji. Pełne ${counts.total} wierszy, wszystkie dostępne linki i pola kontroli znajdują się w rejestrze CSV.</p>
      <div class="table-wrap"><table>
        <thead><tr><th scope="col">Data</th><th scope="col">Nieruchomość</th><th scope="col">Wynik</th><th scope="col">Cena wywoławcza</th><th scope="col">Źródło</th></tr></thead>
        <tbody>${sourceRows(analysis)}</tbody>
      </table></div>
    </section>

    <section aria-labelledby="method-title">
      <h2 id="method-title">Metodologia i ograniczenia</h2>
      <ul class="method">
        <li>Jedna nieruchomość i data tworzą jedno zaobserwowane zdarzenie; duplikaty z tej samej daty są składane zachowawczo.</li>
        <li>Tylko wyniki oznaczone jako oparte na opublikowanym rozstrzygnięciu są klasyfikowane jako sprzedaż/bez nabywcy. Wynik wywnioskowany wyłącznie z późniejszej rundy, wpis aktywny, archiwalny lub brak wyniku pozostaje nieznany.</li>
        <li>Odstęp czasowy jest liczony wyłącznie od zdarzenia z opublikowanym wynikiem bez nabywcy do następnej odrębnej daty dla tej samej nieruchomości.</li>
        <li>Zmiana ceny opisuje dwie opublikowane ceny wywoławcze; nie jest wyceną, stratą ani dowodem przyczyny wyniku.</li>
        <li>Łączenie zdarzeń opiera się na znormalizowanym adresie. Różne historyczne zapisy tej samej ulicy mogą rozdzielić jedną nieruchomość, dlatego wskaźniki sekwencji są zachowawczą dolną granicą.</li>
        ${ownershipExclusion}
        ${sourceVerificationNote}
        <li>W razie rozbieżności wiążą dokumenty źródłowe jednostki. Rejestr może służyć do wskazania pozycji wymagających weryfikacji.</li>
      </ul>
    </section>

    <section class="boundary" aria-labelledby="boundary-title">
      <h2 id="boundary-title">Granica opracowania</h2>
      <p>${esc(boundary)}</p>
    </section>

    <div class="meta">
      Dane jednostki: ${esc(dataTimestamp)} · zakres obserwowany: ${esc(analysis.scope.observedFrom)}–${esc(analysis.scope.observedTo)} · źródła unikalne: ${analysis.provenance.uniqueSourceUrlCount}<br />
      Schemat analizy: ${analysis.schemaVersion} · fingerprint: ${esc(analysis.inputFingerprint)} · skrót do cytowania: ${esc(shortFingerprint)}
    </div>
  </main>
  <footer class="report-foot">przetargimiejskie.pl · kontakt@przetargimiejskie.pl · niezależne opracowanie publicznie dostępnych informacji</footer>
</article>
</body>
</html>`;
}

function outputNames(cityId, assetClass, from, to, webExample) {
  if (webExample) return {
    html: 'index.html', pdf: 'karta-wynikow.pdf', csv: 'rejestr-zrodel.csv', analysis: 'analiza-zrodlowa.json',
  };
  const stem = `karta-wynikow-${slug(cityId)}-${slug(assetClass)}-${from}-${to}`;
  return { html: `${stem}.html`, pdf: `${stem}.pdf`, csv: `${stem}.csv`, analysis: `${stem}.json` };
}

export async function buildReports(options) {
  const index = readJson(join(ROOT, 'data', 'index.json'));
  const playwrightPath = join(ROOT, 'pipeline', 'node_modules', 'playwright', 'index.mjs');
  if (!existsSync(playwrightPath)) throw new Error(`playwright not found at ${playwrightPath}; run npm install in pipeline/`);
  const { chromium } = await import(pathToFileURL(playwrightPath).href);
  const browser = await chromium.launch();
  const outputs = [];
  try {
    for (const cityId of options.cityIds) {
      const city = (index.cities || []).find((candidate) => candidate.id === cityId);
      if (!city) throw new Error(`${cityId}: not found in data/index.json`);
      const propertiesPath = join(ROOT, 'data', cityId, 'properties.json');
      const metaPath = join(ROOT, 'data', cityId, 'meta.json');
      if (!existsSync(propertiesPath) || !existsSync(metaPath)) throw new Error(`${cityId}: missing properties.json or meta.json`);
      const properties = readJson(propertiesPath).properties || [];
      const meta = readJson(metaPath);
      const analysis = analyseB2G(properties, {
        assetClass: options.assetClass,
        from: options.from,
        to: options.to,
        excludedOwnerTypes: MUNICIPAL_EXCLUDED_OWNER_TYPES,
      });
      if (!analysis.readiness.ready) {
        throw new Error(`${cityId}: B2G readiness failed: ${analysis.readiness.reasons.join(' ')}`);
      }

      const outputDir = options.outputDir ? resolve(ROOT, options.outputDir) : join(ROOT, 'outreach', cityId);
      mkdirSync(outputDir, { recursive: true });
      const names = outputNames(cityId, options.assetClass, options.from, options.to, options.webExample);
      const sourceVerification = options.webExample
        ? PUBLIC_SOURCE_VERIFICATION[cityId] ?? null
        : null;
      if (sourceVerification) {
        const unavailable = new Set(sourceVerification.unavailableSupplementaryUrls.map(({ url }) => url));
        const outcomeSources = new Set(analysis.events.flatMap((event) => event.outcomeSourceUrls));
        if (
          sourceVerification.recordedUrls !== analysis.provenance.uniqueSourceUrlCount
          || sourceVerification.httpOkUrls !== sourceVerification.recordedUrls - unavailable.size
          || sourceVerification.uniqueOutcomeSourceUrls !== outcomeSources.size
          || sourceVerification.outcomeSourceUrlsHttpOk !== outcomeSources.size
          || [...unavailable].some((url) => !analysis.provenance.uniqueSourceUrls.includes(url))
        ) {
          throw new Error(`${cityId}: frozen source-verification metadata no longer matches the analysis`);
        }
      }
      const html = renderReportHtml({
        city,
        meta,
        analysis,
        csvName: names.csv,
        pdfName: names.pdf,
        analysisName: names.analysis,
        publicExample: options.webExample,
        sourceVerification,
      });
      writeFileSync(join(outputDir, names.html), html);
      writeFileSync(join(outputDir, names.csv), renderCsv(analysis));
      writeFileSync(join(outputDir, names.analysis), `${JSON.stringify({
        reportSchemaVersion: 1,
        city: { id: city.id, label: city.label, authority: city.authority ?? null },
        dataGeneratedAt: meta.generated_at ?? null,
        sourceVerification,
        analysis,
      }, null, 2)}\n`);

      const page = await browser.newPage();
      try {
        await page.goto(pathToFileURL(join(outputDir, names.html)).href, { waitUntil: 'load' });
        await page.pdf({
          path: join(outputDir, names.pdf),
          format: 'A4',
          printBackground: true,
          tagged: true,
          outline: true,
        });
      } finally {
        await page.close();
      }
      outputs.push({ cityId, outputDir, names, analysis });
    }
  } finally {
    await browser.close();
  }
  return outputs;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outputs = await buildReports(options);
  for (const output of outputs) {
    const counts = output.analysis.outcomes.counts;
    console.error(`${output.cityId}: ${counts.sold} sold / ${counts.unsold} unsold / ${counts.unknown} unknown -> ${output.outputDir}`);
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
