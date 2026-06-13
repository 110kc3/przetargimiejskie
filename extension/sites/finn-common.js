// Shared FINN eUrząd / Polish-auction TITLE parsing for the content-script
// adapters that key off an announcement title or link label (Mysłowice,
// Świętochłowice). Mirrors the address + flat-auction logic in the pipeline's
// core/finn-bip.js (Pattern A) and the per-city isFlat* filters, so the
// extension joins on the SAME property keys the pipeline emits. Keep in
// lockstep with pipeline/src/core/finn-bip.js and cities/<id>/parse.js.
//
// Exposes a single global: window.ZGM_FINN.

(function () {
  if (typeof window === 'undefined') return;

  // przetarg … na sprzedaż … lokal(u) mieszkalny(ego); drops rentals, land and
  // bezprzetargowe tenant sales. Mirrors finn-bip.js isFlatAuction.
  function isFlatAuction(title) {
    const t = (title || '').toLowerCase();
    if (!/przetarg/.test(t) || /bezprzetarg/.test(t)) return false;
    if (!/sprzeda/.test(t)) return false;
    if (/\bnajem\b|najmu|dzier[żz]aw|wynajem/.test(t)) return false;
    return /lokal\w*\s+mieszkaln|lokalu\s+mieszkaln/.test(t);
  }

  // Świętochłowice's index links also carry result notices / intents / wykazy /
  // a KW land-registry annex — keep only live flat-sale announcements. Mirrors
  // cities/swietochlowice/parse.js isFlatAnnouncement.
  function isFlatAnnouncement(title) {
    const t = (title || '').toLowerCase();
    if (/informacj\w*\s+o\b|wynik\w*\s+(?:z\s+)?\w*\s*przetarg|odwo[łl]ani|uniewa[żz]ni|zamiar\s+sprzeda|^\s*wykaz|za[łl][ąa]cznik/.test(t)) {
      return false;
    }
    if (/^\s*(?:kw\b|ksi[eę]g)/.test(t)) return false;
    if (!/przetarg/.test(t)) return false;
    if (!/sprzeda/.test(t)) return false;
    return /lokal\w*\s+mieszkaln|lokalu\s+mieszkaln/.test(t);
  }

  // "… lokalu mieszkalnego nr <apt> … przy ul. <Street> <bldg>[/<apt>]" →
  // raw "<Street> <bldg>[/<apt>]" (caller runs ZGM_NORMALIZE.parseAddress).
  // Mirrors finn-bip.js addressFrom Pattern A plus the apartment-number capture.
  // The street's leading uppercase guard is re-checked after the /i match so a
  // stray "…nr 5 przy czym nabywca…" can't capture "czym nabywca" as a street.
  function addressFromTitle(title) {
    if (!title) return null;
    const src = String(title);
    const apt =
      /lokal\w*\s+mieszkaln\w*\s+(?:o\s+numerze|numer|nr\.?)\s*(\d+[A-Za-z]?)/i.exec(src)?.[1] || null;
    const a =
      /przy\s+(?:ul\.|ulicy|al\.|alei|placu|pl\.|os\.|osiedlu)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)\b/.exec(src);
    if (!a || !/^[A-ZŻŹĆŁŚĄĘÓŃ]/.test(a[1])) return null;
    const street = a[1].replace(/\s+/g, ' ').trim();
    let buildingApt = a[2];
    if (!/\//.test(buildingApt) && apt) buildingApt = `${buildingApt}/${apt}`;
    return `${street} ${buildingApt}`;
  }

  window.ZGM_FINN = { isFlatAuction, isFlatAnnouncement, addressFromTitle };
})();
