(function () {
  if (!window.ZGM_SITES) return;

  const BOARD_PATH = /\/ogloszenia\/tablicaogloszen\/default(?:_arch)?\.aspx/i;
  const DOC_PATH = /\/ogloszenia\/tablicaogloszen\/dokument\.aspx/i;
  const PORTAL_DOC_PATH = /\/Lists\/.*\/DispForm\.aspx/i;

  function addressFromAuctionTitle(title) {
    if (!title) return null;
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
        const href = a.getAttribute('href') || '';
        if (seen.has(href)) continue;
        seen.add(href);
        out.push({
          element: a,
          address,
          addressRaw: addrRaw,
          area_m2: null,
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
