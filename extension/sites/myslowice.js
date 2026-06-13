// Mysłowice site adapter — bip.myslowice.pl (FINN eUrząd, server-rendered).
//
// The two category pages /artykul/aktualne-przetargi and
// /artykul/archiwum-przetargow server-render every child announcement link
// (/artykul/ogloszenie-…). Each flat announcement's title carries "… lokalu
// mieszkalnego nr <apt> … przy ul. <Street> <bldg>" — enough to key it via
// window.ZGM_FINN.addressFromTitle (mirrors the pipeline's core/finn-bip.js).
// Announcement pages are themselves /artykul/ slugs, so they're also badged as
// detail pages from the page <h1> title.

(function () {
  if (!window.ZGM_SITES || !window.ZGM_FINN) return;

  const INDEX_PATH = /\/artykul\/(aktualne-przetargi|archiwum-przetargow)\/?$/i;
  const ANN_PATH = /\/artykul\/(ogloszenie|obwieszczenie)/i;

  // A title yields a key only when it's a flat-sale auction AND parses to an
  // address — otherwise no badge (land/garage/rental titles fall through).
  function rawFromTitle(title) {
    if (!window.ZGM_FINN.isFlatAuction(title)) return null;
    return window.ZGM_FINN.addressFromTitle(title);
  }

  window.ZGM_SITES.register({
    city: 'myslowice',
    hostMatches: ['bip.myslowice.pl'],

    isListingIndex: (path) => INDEX_PATH.test(path),
    isDetail: (path) => ANN_PATH.test(path),

    collectCards() {
      const out = [];
      const seen = new Set();
      for (const a of document.querySelectorAll('a[href*="/artykul/"]')) {
        if (!ANN_PATH.test(a.getAttribute('href') || '')) continue;
        const title = (a.textContent || '').replace(/\s+/g, ' ').trim();
        const raw = rawFromTitle(title);
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

    detailAddress() {
      const h1 = document.querySelector('h1');
      const title = ((h1 && h1.textContent) || document.title || '')
        .replace(/\s+/g, ' ')
        .trim();
      const raw = rawFromTitle(title);
      if (!raw) return null;
      const address = window.ZGM_NORMALIZE.parseAddress(raw);
      if (!address) return null;
      return { address, addressRaw: raw };
    },

    injectTarget() {
      return (
        document.querySelector('main') ||
        document.querySelector('#content') ||
        document.querySelector('article') ||
        document.body
      );
    },
  });
})();
