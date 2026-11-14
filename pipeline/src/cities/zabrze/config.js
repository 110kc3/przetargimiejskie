export const ZABRZE_OBREB_MAP = {
  'bielszowice': '0001',
  'biskupice': '0002',
  'grzybowice': '0003',
  'konczyce': '0004',
  'kończyce': '0004',
  'makoszowy': '0005',
  'mikulczyce': '0006',
  'pawlow': '0007',
  'pawłów': '0007',
  'rokitnica': '0008',
  'sosnica': '0009',
  'sośnica': '0009',
  'zaborze poludniowe': '0010',
  'zaborze południowe': '0010',
  'zaborze': '0011',
  'zabrze': '0012',
  'helenka': '0013',
  'maciejow': '0014',
  'maciejów': '0014',
};

export function zabrzeObrebCode(raw) {
  if (!raw) return null;
  const s = String(raw)
    .toLowerCase()
    .replace(/^obr[ęe]b\w*\s*/i, '')
    .replace(/\bewidencyjn\w*\b/gi, '')
    .replace(/\barkusz\w*\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return ZABRZE_OBREB_MAP[s] || null;
}

export const config = {
  id: 'zabrze',
  teryt: '247801_1',
  obreby: ZABRZE_OBREB_MAP,
  label: 'Zabrze',
  voivodeship: "slaskie",
  authority: 'Urząd Miejski w Zabrzu',
  host: 'bip.miastozabrze.pl',
  source: 'html',
  geoportal(plot) {
    if (!plot) return null;
    if (plot.dzialka_id) {
      return `https://mapy.geoportal.gov.pl/imap/?identifyParcel=${encodeURIComponent(plot.dzialka_id)}`;
    }
    const code = zabrzeObrebCode(plot.obreb);
    const nr = plot.dzialka_nr ? plot.dzialka_nr.trim() : null;
    if (code && nr && !nr.includes(',')) {
      const fullId = `247801_1.${code}.${nr}`;
      return `https://mapy.geoportal.gov.pl/imap/?identifyParcel=${encodeURIComponent(fullId)}`;
    }
    return null;
  },
};
