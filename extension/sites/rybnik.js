(function () {
  if (!window.ZGM_SITES) return;

  const LIST_PATH = /\/Default\.aspx/i;

  function addressFromLabel(label) {
    if (!label) return null;
    const s = label
      .replace(/^\s*OG[ŁL]OSZENIE\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/_(?=[0-9])/g, '/');
    return s || null;
  }

  window.ZGM_SITES.register({
    city: 'rybnik',
    hostMatches: ['bip.zgm.rybnik.pl'],

    isListingIndex: (path) => LIST_PATH.test(path),
    isDetail: () => false,

    collectCards() {
      const out = [];
      const seen = new Set();
      for (const a of document.querySelectorAll('a[href*="Download.ashx?id="]')) {
        const label = (a.textContent || '').replace(/\s+/g, ' ').trim();
        if (!/^OG[ŁL]OSZENIE\b/i.test(label) || !/\d/.test(label)) continue;
        const raw = addressFromLabel(label);
        if (!raw) continue;
        const address = window.ZGM_NORMALIZE.parseAddress(raw);
        if (!address || seen.has(address.key)) continue;
        seen.add(address.key);
        out.push({
          element: a,
          address,
          addressRaw: raw,
          area_m2: null,
          price_pln: null,
          descTarget: null,
        });
      }
      return out;
    },

    detailAddress: () => null,
    injectTarget: () => document.querySelector('main') || document.body,
  });
})();
