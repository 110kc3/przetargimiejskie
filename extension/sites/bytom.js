// Bytom site adapter — i-BIIP "Katalog nieruchomości do zbycia".
//
//   https://i-biip.um.bytom.pl/katalog-nieruchomosci-do-zbycia.html
//
// Unlike Gliwice (per-listing pages) and Katowice (a BIP board of links), Bytom
// publishes every active sale auction on ONE server-rendered catalog page as a
// repeated block of labelled fields:
//
//   ADRES: pl. Akademicki 11/12   TYP: lokal mieszkalny
//   ETAP SPRZEDAŻY: III Przetarg  TERMIN PRZETARGU: 2026-06-15
//   CENA WYWOŁAWCZA: 97000        POWIERZCHNIA: 76.14   LINK: …doc
//
// So there is no separate "detail page" to badge — the catalog IS the index.
// Each record carries a geoportal link (https://sitplan.um.bytom.pl/…) which we
// use as the per-record anchor; from its container we read the ADRES/TYP/area/
// price text. The address shape ("<street> <bldg>/<apt>") is what
// ZGM_NORMALIZE.parseAddress already keys on, so badges join against the
// pipeline-emitted Bytom property keys.
//
// Mirrors pipeline/src/cities/bytom/crawl.js — same field labels, same
// flats+commercial-only filter, same land-parcel skip.

(function () {
  if (!window.ZGM_SITES) return;

  const CATALOG_PATH = /\/katalog-nieruchomosci-do-zbycia\.html$/i;

  function fieldAfter(text, label, stop) {
    const re = new RegExp(
      label + '\\s*:?\\s*([\\s\\S]*?)\\s*(?:' + stop + ')\\s*:',
      'i',
    );
    return re.exec(text)?.[1]?.trim() || null;
  }

  function kindFromTyp(typ) {
    const t = (typ || '').toLowerCase();
    if (t.includes('mieszkaln')) return 'mieszkalny';
    if (t.includes('użytkow') || t.includes('uzytkow')) return 'uzytkowy';
    return null; // grunt… → skip
  }

  function parseArea(s) {
    if (!s) return null;
    const n = Number(s.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  function parsePLN(s) {
    if (!s) return null;
    const d = s.replace(/[^\d]/g, '');
    return d ? Number(d) : null;
  }

  // Climb to the smallest sensible block that contains the whole record (i.e.
  // includes both the "ADRES:" and "TYP:" labels). Falls back to the anchor's
  // parent if no labelled container is found.
  function recordContainer(anchor) {
    let el = anchor;
    for (let i = 0; i < 6 && el && el.parentElement; i++) {
      el = el.parentElement;
      const t = el.textContent || '';
      if (/ADRES\s*:?/i.test(t) && /TYP\s*:?/i.test(t)) return el;
    }
    return anchor.parentElement || anchor;
  }

  window.ZGM_SITES.register({
    city: 'bytom',
    hostMatches: ['i-biip.um.bytom.pl'],

    isListingIndex: () => CATALOG_PATH.test(location.pathname),
    isDetail: () => false, // detail links are .doc downloads, not pages

    collectCards() {
      const out = [];
      const seen = new Set();
      // One geoportal link per record — present for flats, commercial and land.
      const anchors = document.querySelectorAll(
        'a[href*="sitplan.um.bytom.pl"]',
      );
      for (const a of anchors) {
        const container = recordContainer(a);
        const text = (container.textContent || '').replace(/\s+/g, ' ').trim();

        const typ = fieldAfter(text, 'TYP', 'ETAP');
        const kind = kindFromTyp(typ);
        if (!kind) continue; // skip land parcels

        const addrRaw = fieldAfter(text, 'ADRES', 'TYP');
        if (!addrRaw || /\bdz\.?\s*\d/i.test(addrRaw)) continue;
        const address = window.ZGM_NORMALIZE.parseAddress(addrRaw);
        if (!address) continue;

        if (seen.has(address.key)) continue;
        seen.add(address.key);

        const areaM2 = parseArea(
          /POWIERZCHNIA\s*:?\s*([\d.,]+)/i.exec(text)?.[1],
        );
        const pricePln = parsePLN(
          /CENA\s+WYWO[ŁL]AWCZA\s*:?\s*([\d .,]+)/i.exec(text)?.[1],
        );

        out.push({
          element: container,
          address,
          addressRaw: addrRaw,
          area_m2: areaM2,
          price_pln: pricePln,
          descTarget: container,
        });
      }
      return out;
    },

    detailAddress() {
      return null; // no HTML detail page
    },

    injectTarget() {
      // The catalog is the only page; no per-listing sidebar host. Return the
      // main content area so content.js's generic injection has a target if it
      // ever runs in index mode here.
      return (
        document.querySelector('main') ||
        document.querySelector('#content') ||
        document.body
      );
    },
  });
})();
