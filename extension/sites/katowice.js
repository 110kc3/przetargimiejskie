// Katowice site adapter — bip.katowice.eu (SharePoint-based city BIP).
//
// Listing-index page is the city BIP's "Tablica ogłoszeń" board
//   /ogloszenia/tablicaogloszen/default.aspx?idt=468&menu=679
// (and the parallel archive view default_arch.aspx). It's server-rendered, so
// plain DOM traversal works — each entry is an <a href="…dokument.aspx?idr=N">
// link whose text is the auction title, e.g.
//   "Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego przy
//    ul. Koszalińskiej 36a/5".
// We extract "Koszalińskiej 36a/5" from "przy ul. …" — same shape parse.js
// uses on the pipeline side (see pipeline/src/cities/katowice/parse.js).
//
// Detail pages are /ogloszenia/tablicaogloszen/dokument.aspx?idr=N. The
// individual document body is JavaScript-rendered (SPIKE-WAVE1.md), but
// document.title is already populated at content-script run-time with the same
// auction title — sufficient for the address lookup.

(function () {
  if (!window.ZGM_SITES) return;

  const BOARD_PATH = /\/ogloszenia\/tablicaogloszen\/default(?:_arch)?\.aspx/i;
  const DOC_PATH = /\/ogloszenia\/tablicaogloszen\/dokument\.aspx/i;
  // The city portal (katowice.eu) surfaces the same announcements via
  // SharePoint list-item pages — archive `detail_url`s point here. The body is
  // JS-rendered like bip.katowice.eu, but document.title carries the auction
  // title, so the title-based detailAddress works for these too.
  const PORTAL_DOC_PATH = /\/Lists\/.*\/DispForm\.aspx/i;

  // "Przetarg … przy ul. <street> <bldg>[/<apt>] [(suffix)]" → "<street> <bldg>[/<apt>]".
  // Mirrors addressFromTitle() in pipeline/src/cities/katowice/parse.js so the
  // join key matches the pipeline-emitted property keys.
  function addressFromAuctionTitle(title) {
    if (!title) return null;
    // Capture street + building[/apt] and STOP. Capturing to end-of-title
    // pulled trailing words ("… przy ul. Gliwickiej 50 w Katowicach",
    // "… – II przetarg") into the street, parseAddress failed, and the card
    // was silently skipped. Mirrors addressFromTitle() in
    // pipeline/src/cities/katowice/parse.js.
    const m =
      /przy\s+(?:ul|al|pl|os)\.?\s*([A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?\s+\d+(?:-\d+)?[A-Za-z]?(?:\s*\/\s*\d+[A-Za-z]?)?)/i.exec(title);
    return m ? m[1].trim() : null;
  }

  function isSaleAuctionTitle(title) {
    return /przetarg\w*\s+ustn\w+\s+nieograniczon\w+\s+na\s+sprzeda[żz]/i.test(
      title || '',
    );
  }

  window.ZGM_SITES.register({
    city: 'katowice',
    hostMatches: ['bip.katowice.eu', 'katowice.eu'],

    isListingIndex: () => BOARD_PATH.test(location.pathname),
    isDetail: () =>
      DOC_PATH.test(location.pathname) || PORTAL_DOC_PATH.test(location.pathname),

    collectCards() {
      const out = [];
      // Every board entry that points at a document.aspx?idr=N is a candidate;
      // we filter to sale-auction titles ("Przetarg ustny nieograniczony na
      // sprzedaż …") so we don't badge planning notices / wykazy.
      const links = document.querySelectorAll(
        'a[href*="dokument.aspx?idr="]',
      );
      const seen = new Set();
      for (const a of links) {
        const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text || !isSaleAuctionTitle(text)) continue;
        const addrRaw = addressFromAuctionTitle(text);
        if (!addrRaw) continue;
        const address = window.ZGM_NORMALIZE.parseAddress(addrRaw);
        if (!address) continue;
        // De-dupe by href — the BIP renders the same link twice in some skins.
        const href = a.getAttribute('href') || '';
        if (seen.has(href)) continue;
        seen.add(href);
        out.push({
          element: a,
          address,
          addressRaw: addrRaw,
          area_m2: null,    // board surface has no area / price columns
          price_pln: null,
          descTarget: null,
        });
      }
      return out;
    },

    detailAddress() {
      const title = (document.title || '').replace(/\s+/g, ' ').trim();
      const addrRaw = addressFromAuctionTitle(title);
      if (!addrRaw) return null;
      const address = window.ZGM_NORMALIZE.parseAddress(addrRaw);
      if (!address) return null;
      return { address, addressRaw: addrRaw };
    },

    injectTarget() {
      // BIP's SharePoint chrome wraps document content in a few common
      // containers; fall back through the most stable to the most generic.
      return (
        document.querySelector('#contentArea') ||
        document.querySelector('.dokument') ||
        document.querySelector('#main') ||
        document.querySelector('main') ||
        document.body
      );
    },
  });
})();
