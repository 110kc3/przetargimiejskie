// Bielsko-Biała site adapter — bielsko-biala.pl Giełda Nieruchomości (Drupal).
//
// Each sale offer is a node at /nieruchomosc/<slug> whose "Najważniejsze
// informacje" block is a labelled key-value list incl. "Adres: ul. <street>
// <bldg>/<apt>" and "Rodzaj nieruchomości: lokal mieszkalny". We badge the node
// (detail) pages: read the visible text, confirm it's a flat, then pull the
// Adres value with the same field()-boundary logic the pipeline uses
// (cities/bielsko/parse.js) so badges join the same property keys. The giełda
// index cards don't reliably carry the labelled Adres block, so the index page
// itself is left undecorated — detail pages only. If a label/value renders
// without a colon, the optional-colon match still finds it; on any miss nothing
// is injected (graceful).

(function () {
  if (!window.ZGM_SITES) return;

  const NODE_PATH = /\/nieruchomosc\/[^/]+/i;

  // Mirror cities/bielsko/parse.js LABELS (longest → shortest so a prefix label
  // doesn't end the value early) + field().
  const LABELS = [
    'Data przetargu / rokowań', 'Data przetargu', 'Rodzaj nieruchomości',
    'Forma przetargu', 'Status oferty', 'Wysokość wadium',
    'Powierzchnia użytkowa', 'Powierzchnia', 'Cena wywoławcza', 'Cena',
    'Numer działki', 'Obręb', 'Adres',
  ];
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  const BOUNDARY = LABELS.map(escapeRe).join('|');

  function field(text, label) {
    if (!text) return null;
    const re = new RegExp(
      escapeRe(label) + '\\s*:?\\s*([\\s\\S]*?)\\s*(?=(?:' + BOUNDARY + ')\\s*:?|$)',
      'i',
    );
    const m = re.exec(text);
    return (m && m[1].trim()) || null;
  }
  const isFlat = (rodzaj) => /lokal\w*\s+mieszkaln/i.test(rodzaj || '');

  function detailAddr() {
    const text = ((document.body && document.body.innerText) || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!isFlat(field(text, 'Rodzaj nieruchomości'))) return null;
    const raw = field(text, 'Adres');
    if (!raw) return null;
    const address = window.ZGM_NORMALIZE.parseAddress(raw);
    if (!address) return null;
    return { address, addressRaw: raw };
  }

  window.ZGM_SITES.register({
    city: 'bielsko',
    hostMatches: ['bielsko-biala.pl'],

    isListingIndex: () => false,
    isDetail: (path) => NODE_PATH.test(path),

    collectCards: () => [],
    detailAddress: detailAddr,

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
