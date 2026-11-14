
export const TG_OBREB_MAP = {
  'tarnowskie gory': '0004',
  'tarnowskie góry': '0004',
  'tarnowskie': '0004',
  'lasowice': '0005',
  'sowice': '0006',
  'repty slaskie': '0007',
  'repty śląskie': '0007',
  'repty': '0007',
  'strzybnica': '0015',
  'bobrowniki slaskie': '0019',
  'bobrowniki śląskie': '0019',
  'bobrowniki': '0019',
  'pniowiec': '0023',
  'rybna': '0033',
  'opatowice': '0034',
};

export function tgObrebCode(raw) {
  if (!raw) return null;
  const s = String(raw)
    .toLowerCase()
    .replace(/^obr[ęe]b\w*\s*/i, '')
    .replace(/\bewidencyjn\w*\b/gi, '')
    .replace(/\barkusz\w*\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return TG_OBREB_MAP[s] || null;
}

export const config = {
  id: 'tarnowskie-gory',
  teryt: '241304_1', // gmina miejska Tarnowskie Góry TERYT (powiat tarnogórski 2413, gmina-type 1)
  label: 'Tarnowskie Góry',
  voivodeship: 'slaskie',
  authority: 'Urząd Miejski w Tarnowskich Górach',
  host: 'bip.tarnowskiegory.pl',
  source: 'html',
  obreby: TG_OBREB_MAP,
  geoportal(plot) {
    if (!plot) return null;
    if (plot.dzialka_id) {
      return `https://mapy.geoportal.gov.pl/imap/?identifyParcel=${encodeURIComponent(plot.dzialka_id)}`;
    }
    const code = tgObrebCode(plot.obreb);
    const nr = plot.dzialka_nr ? plot.dzialka_nr.trim() : null;
    if (code && nr && !nr.includes(',')) {
      const fullId = `241304_1.${code}.${nr}`;
      return `https://mapy.geoportal.gov.pl/imap/?identifyParcel=${encodeURIComponent(fullId)}`;
    }
    return null;
  },
};
