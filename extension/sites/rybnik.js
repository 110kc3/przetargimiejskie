// Rybnik site adapter — bip.zgm.rybnik.pl (server-rendered ASP.NET BIP).
//
// ZGM Rybnik (the municipal housing manager) publishes each flat auction as an
// "OGŁOSZENIE <address> [rtf]" download link on /Default.aspx?Page=214 (older
// batches hang off &Archive=<id>). The address is in the link LABEL;
// price/area/date/round live inside the RTF (read by the pipeline, not us).
// There is no HTML detail page — the "detail" is the RTF download — so this is
// a listing-index-only adapter. Mirrors pipeline/src/cities/rybnik/parse.js
// addressFromLabel so badges join the pipeline-emitted Rybnik property keys.

(function () {
  if (!window.ZGM_SITES) return;

  // The board lives at /Default.aspx; the Page=214 / &Archive=<id> selectors are
  // query params (not in pathname). Gate on the path and let collectCards filter
  // to the OGŁOSZENIE links — a non-board Default.aspx just yields no cards.
  const LIST_PATH = /\/Default\.aspx/i;

  // "OGŁOSZENIE A. Zgrzebnioka 7b_6" → "A. Zgrzebnioka 7b/6". ZGM joins the
  // building & apartment with an underscore.
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
          area_m2: null,   // figures live in the RTF, not on the board
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
