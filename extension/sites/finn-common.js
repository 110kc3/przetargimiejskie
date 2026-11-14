(function () {
  if (typeof window === 'undefined') return;

  function isFlatAuction(title) {
    const t = (title || '').toLowerCase();
    if (!/przetarg/.test(t) || /bezprzetarg/.test(t)) return false;
    if (!/sprzeda/.test(t)) return false;
    if (/\bnajem\b|najmu|dzier[żz]aw|wynajem/.test(t)) return false;
    return /lokal\w*\s+mieszkaln|lokalu\s+mieszkaln/.test(t);
  }

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
