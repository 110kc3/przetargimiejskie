(function () {
  if (!window.ZGM_SITES || !window.ZGM_FINN) return;

  const LIST_PATH = /\/bipkod\/29287911/i;

  window.ZGM_SITES.register({
    city: 'swietochlowice',
    hostMatches: ['bip.swietochlowice.pl'],

    isListingIndex: (path) => LIST_PATH.test(path),
    isDetail: () => false,

    collectCards() {
      const out = [];
      const seen = new Set();
      for (const a of document.querySelectorAll('a[href*="/res/serwisy/pliki/"]')) {
        const title = (a.textContent || '').replace(/\s+/g, ' ').trim();
        if (!window.ZGM_FINN.isFlatAnnouncement(title)) continue;
        const raw = window.ZGM_FINN.addressFromTitle(title);
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
