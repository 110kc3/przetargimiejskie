// Bytom site adapter (v2). Covers BOTH surfaces a Bytom user browses:
//
//   1) www.bytom.pl/bip/zbycie-nieruchomosci-bytom/…  — the city BIP sales
//      list (now the pipeline's primary source). Server-rendered; each row is
//      a <li class="aktualnosc__item"> with a title link to a per-property
//      page (…/idn:N) and a description stating the round. Detail pages
//      (…/idn:N) are also badged via the page title.
//   2) i-biip.um.bytom.pl/katalog-nieruchomosci-do-zbycia.html — the catalog
//      (kept as a price/area source; still worth badging if the user opens it).
//
// content.js stays generic; this adapter supplies the DOM specifics. Addresses
// are normalized with ZGM_NORMALIZE.parseAddress so badges join the
// pipeline-emitted Bytom property keys. Flats + commercial only; land skipped.

(function () {
  if (!window.ZGM_SITES) return;

  const BIP_LIST_PATH = /\/bip\/zbycie-nieruchomosci-bytom\//i;
  const BIP_DETAIL_PATH = /\/idn:\d+/i;
  const CATALOG_PATH = /\/katalog-nieruchomosci-do-zbycia\.html$/i;

  function kindFromText(txt) {
    const t = (txt || '').toLowerCase();
    if (/niemieszkaln/.test(t)) return 'uzytkowy';
    if (/mieszkaln/.test(t)) return 'mieszkalny';
    return null;
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
  function fieldAfter(text, label, stop) {
    return new RegExp(label + '\\s*:?\\s*([\\s\\S]*?)\\s*(?:' + stop + ')\\s*:', 'i')
      .exec(text)?.[1]?.trim() || null;
  }

  const isBipList = () => BIP_LIST_PATH.test(location.pathname) && !BIP_DETAIL_PATH.test(location.pathname);
  const isCatalog = () => CATALOG_PATH.test(location.pathname);
  const isBipDetail = () => BIP_DETAIL_PATH.test(location.pathname);

  // BIP list rows: <li class="aktualnosc__item"> with a title link + desc.
  function collectBipCards() {
    const out = [];
    const seen = new Set();
    for (const li of document.querySelectorAll('li.aktualnosc__item')) {
      const a = li.querySelector('a[href*="/idn:"]');
      if (!a) continue;
      const addrRaw = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (!addrRaw || /\bdz\.?\s*\d|działk/i.test(addrRaw)) continue;
      const desc = (li.querySelector('.aktualnosci__tresc')?.textContent || '');
      if (!kindFromText(desc)) continue; // skip land / garages / leases
      const address = window.ZGM_NORMALIZE.parseAddress(addrRaw);
      if (!address || seen.has(address.key)) continue;
      seen.add(address.key);
      out.push({ element: a, address, addressRaw: addrRaw, area_m2: null, price_pln: null, descTarget: li });
    }
    return out;
  }

  // i-BIIP catalog blocks: labelled ADRES/TYP/…/POWIERZCHNIA/CENA fields.
  function collectCatalogCards() {
    const out = [];
    const seen = new Set();
    for (const a of document.querySelectorAll('a[href*="sitplan.um.bytom.pl"]')) {
      let el = a;
      let found = false;
      for (let i = 0; i < 6 && el.parentElement; i++) {
        el = el.parentElement;
        const t = el.textContent || '';
        if (/ADRES\s*:?/i.test(t) && /TYP\s*:?/i.test(t)) { found = true; break; }
      }
      // No labelled ADRES/TYP block within 6 levels: `el` is now some generic
      // wrapper (possibly containing EVERY listing). Badging it would attach
      // the first listing's address to the whole container — skip instead.
      if (!found) continue;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!kindFromText(fieldAfter(text, 'TYP', 'ETAP'))) continue;
      const addrRaw = fieldAfter(text, 'ADRES', 'TYP');
      if (!addrRaw || /\bdz\.?\s*\d/i.test(addrRaw)) continue;
      const address = window.ZGM_NORMALIZE.parseAddress(addrRaw);
      if (!address || seen.has(address.key)) continue;
      seen.add(address.key);
      out.push({
        element: el,
        address,
        addressRaw: addrRaw,
        area_m2: parseArea(/POWIERZCHNIA\s*:?\s*([\d.,]+)/i.exec(text)?.[1]),
        price_pln: parsePLN(/CENA\s+WYWO[ŁL]AWCZA\s*:?\s*([\d .,]+)/i.exec(text)?.[1]),
        descTarget: el,
      });
    }
    return out;
  }

  window.ZGM_SITES.register({
    city: 'bytom',
    hostMatches: ['bytom.pl', 'i-biip.um.bytom.pl'],

    isListingIndex: () => isBipList() || isCatalog(),
    isDetail: () => isBipDetail(),

    collectCards() {
      if (isCatalog()) return collectCatalogCards();
      if (isBipList()) return collectBipCards();
      return [];
    },

    // BIP per-property page: address is the announcement title. Try the
    // announcement-specific containers first, then the page <h1> (which may be
    // a site banner, not the title), then document.title — split on common
    // separators AND taken whole (not every title uses "|"). Use the FIRST
    // candidate that parses to a real flat address, so a banner h1 no longer
    // shadows a usable document.title.
    detailAddress() {
      const cands = [];
      for (const sel of ['.aktualnosc__tytul', '.tytul', 'h1']) {
        const txt = document.querySelector(sel)?.textContent;
        if (txt) cands.push(txt);
      }
      if (document.title) {
        cands.push(document.title.split(/[|–—]/)[0]);
        cands.push(document.title);
      }
      for (const cand of cands) {
        const raw = cand.replace(/\s+/g, ' ').trim();
        if (!raw || /\bdz\.?\s*\d|działk/i.test(raw)) continue;
        const address = window.ZGM_NORMALIZE.parseAddress(raw);
        if (address) return { address, addressRaw: raw };
      }
      return null;
    },

    injectTarget() {
      return (
        document.querySelector('article') ||
        document.querySelector('main') ||
        document.querySelector('#content') ||
        document.body
      );
    },
  });
})();
