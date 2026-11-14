import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


const PL_MONTHS = {
  stycznia: 1, 'styczeń': 1, styczen: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, 'kwiecień': 4, kwiecien: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, 'sierpień': 8, sierpien: 8,
  'września': 9, 'wrześień': 9, wrzesnia: 9, wrzesien: 9,
  'października': 10, 'październik': 10, pazdziernika: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, 'grudzień': 12, grudzien: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/[.,]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function isSkippableTitle(title) {
  const t = (title || '').toLowerCase();
  if (/\bnajem\b|dzier[zzżź]aw/i.test(t)) return true;
  if (/(?<!nie)ruchomo/i.test(t)) return true;
  if (/nieruchomo\S*\s+gruntow|dzia[lł]k|gruntow/i.test(t) &&
      !/lokal\S*\s+mieszkaln/i.test(t)) return true;
  if (/odwo[lł]ani|uniewa[zżź]ni|sprostowanie/i.test(t)) return true;
  return false;
}

export function isFlatAnnouncementTitle(title) {
  return /lokal\S*\s+mieszkaln/i.test(title || '');
}


export function isResultNotice(text) {
  return /informacj\S*\s+o\s+wynik/i.test(text || '');
}

export function roundFromText(text) {
  const t = (text || '').toLowerCase();
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[aą]t|sz[oó]st)\w*\s+(?:\w+\s+){0,4}?przetarg/i.exec(t);
  if (!m) return /\bprzetarg/i.test(t) ? 1 : null;
  const stem = m[1]
    .replace(/ą/g, 'a').replace(/ó/g, 'o').replace(/ę/g, 'e');
  if (/^pierwsz/.test(stem)) return 1;
  if (/^drug/.test(stem)) return 2;
  if (/^trzeci/.test(stem)) return 3;
  if (/^czwart/.test(stem)) return 4;
  if (/^piat/.test(stem)) return 5;
  if (/^szost/.test(stem)) return 6;
  return 1;
}

export function auctionDateFromText(text) {
  if (!text) return null;
  let m = /przetarg\w*\s+odb[eę]dzie\s+si[eę]\s+(\d{1,2})\s+([\wąćęłńóśżźŃĄĘÓŚŁŻŹĆ]+)\s+(\d{4})/i.exec(text);
  if (!m) {
    m = /odb[eę]dzie\s+si[eę][^.]{0,30}?(\d{1,2})\s+([\wąćęłńóśżźŃĄĘÓŚŁŻŹĆ]+)\s+(\d{4})/i.exec(text);
  }
  if (!m) return null;
  const mo = PL_MONTHS[m[2].toLowerCase()];
  if (!mo) return null;
  return iso(m[3], mo, m[1]);
}

export function startingPriceFromText(text) {
  if (!text) return null;
  const wynosiM = /wynosi\s+([\d][\d\s]*(?:,\d{2})?)\s*z[lł]/i.exec(text);
  if (wynosiM) {
    const val = parsePLN(wynosiM[1]);
    if (val && val >= 1000) return val;
  }
  const labelIdx = text.search(/cena\s+wywo[lł]awcz/i);
  if (labelIdx >= 0) {
    const region = text.slice(labelIdx, labelIdx + 300);
    const afterLabel = region.replace(/^cena\s+wywo[lł]awcz\w*/i, '');
    for (const line of afterLabel.split('\n')) {
      const lm = /([\d][\d ]*(?:,\d{2})?)\s*z[lł]/i.exec(line);
      if (!lm) continue;
      const val = parsePLN(lm[1]);
      if (val && val >= 1000) return val;
    }
  }
  for (const line of text.split('\n')) {
    const lm = /([\d][\d ]*(?:,\d{2})?)\s*z[lł]/i.exec(line);
    if (!lm) continue;
    const val = parsePLN(lm[1]);
    if (val && val >= 1000) return val;
    break;
  }
  return null;
}

export function achievedPriceFromText(text) {
  const m =
    /osi[aą]gni[eę]t\w*\s+w\s+przetargu\s*[:\-–]?\s*([\d][\d\s]*(?:,\d{2})?)\s*z[lł]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function unitAreaFromText(text) {
  if (!text) return null;
  const m =
    /lokal\w*\s+(?:o\s+)?powierzchni\w*\s+u[zżź]ytkow\w*\s+([\d,.\s]+?)\s*m\s*[2²]/i.exec(text) ||
    /powierzchni\w*\s+u[zżź]ytkow\w*\s+([\d,.]+)\s*m\s*[2²](?!\d)/i.exec(text);
  return m ? parseArea(m[1]) : null;
}

export function addressFromPdfText(text) {
  if (!text) return null;

  let m = /Pi[lł]a,\s*(?:ul\.\s*|al\.\s*|os\.\s*|pl\.\s*)?(\w[\wąćęłńóśżźŃ\s.'\\-]+?)\s+(\d+[A-Za-z]?)\/(\d+[A-Za-z]?)/i.exec(text);
  if (m) {
    const raw = `ul. ${m[1].trim()} ${m[2]}/${m[3]}`;
    const addr = parseAddress(raw);
    if (addr) return addr;
  }

  m = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)\s+[\wąćęłńóśżź\s,]*przy\s+(?:ul\.\s*|al\.\s*|os\.\s*|pl\.\s*)?([A-ZŁŚĆĘĄÓŹŻŃ][\wąćęłńóśżź\s.'\\-]+?)\s+(\d+[A-Za-z]?)\s*(?:w\s+Pil|,|$)/i.exec(text);
  if (m) {
    const raw = `ul. ${m[2].trim()} ${m[3]}/${m[1]}`;
    const addr = parseAddress(raw);
    if (addr) return addr;
  }

  return null;
}


export function splitPdfIntoRows(text) {
  if (!text) return [''];
  const ANCHOR_RE = /^[ \t]*Pi[lł]a[,\s]/im;
  const indices = [];
  let match;
  const re = new RegExp(ANCHOR_RE.source, 'gim');
  while ((match = re.exec(text)) !== null) {
    indices.push(match.index);
  }
  if (indices.length === 0) return [text];
  return indices.map((start, i) => text.slice(start, indices[i + 1] ?? text.length));
}


export function parseAnnouncementPdf(text) {
  if (!text) return [];

  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);

  const rows = splitPdfIntoRows(text);
  const results = [];

  for (const rowText of rows) {
    const address = addressFromPdfText(rowText);
    if (!address) continue;

    const kind = classifyKind(rowText.slice(0, 400)) || 'mieszkalny';
    if (kind === 'grunt') continue;

    const area_m2 = unitAreaFromText(rowText);
    const starting_price_pln = startingPriceFromText(rowText);

    results.push({
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw: `ul. ${address.street} ${address.building}${address.apt ? `/${address.apt}` : ''}`,
      address,
      area_m2,
      starting_price_pln,
      auction_date,
      round,
    });
  }

  return results;
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !isResultNotice(text)) return [];

  const t = text.replace(/\r/g, '');
  const notes = [];

  let auction_date = null;
  let dm = /w\s+dniu\s+(\d{1,2})\s+(\w+)\s+(\d{4})\s*r\.?\s+odby[lł]/i.exec(t);
  if (!dm) dm = /(\d{1,2})\s+(\w+)\s+(\d{4})\s*r\.?\s+odby[lł]/i.exec(t);
  if (dm) {
    const mo = PL_MONTHS[dm[2].toLowerCase()];
    if (mo) auction_date = iso(dm[3], mo, dm[1]);
  }
  if (!auction_date) auction_date = fallbackDate ?? null;

  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);

  const negativeStated =
    /wynik(?:iem)?\s+negatywn|nie\s+wy[lł]oniono\s+nabywcy|brak\s+uczestnik|brak\s+ofert/i.test(t);

  const sold = achieved != null;
  const outcome = sold ? 'sold' : 'unsold';
  const unsold_reason = sold ? null : 'unknown';

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  const rows = splitPdfIntoRows(t);
  const records = [];

  for (const rowText of rows) {
    const address = addressFromPdfText(rowText);
    if (!address) {
      if (rows.length === 1) {
        const addrFull = addressFromPdfText(t);
        if (!addrFull) break;
        const area_m2 = unitAreaFromText(t);
        const rowNotes = [...notes];
        if (addrFull.warning) rowNotes.push(addrFull.warning);
        records.push({
          auction_date,
          source_pdf: sourceUrl,
          kind: 'mieszkalny',
          address_raw: `ul. ${addrFull.street} ${addrFull.building}${addrFull.apt ? `/${addrFull.apt}` : ''}`,
          address: addrFull,
          round,
          starting_price_pln,
          final_price_pln: sold ? achieved : null,
          outcome,
          unsold_reason,
          area_m2,
          notes: rowNotes.length ? rowNotes : null,
        });
      }
      break;
    }

    const area_m2 = unitAreaFromText(rowText);
    const rowNotes = [...notes];
    if (address.warning) rowNotes.push(address.warning);

    records.push({
      auction_date,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw: `ul. ${address.street} ${address.building}${address.apt ? `/${address.apt}` : ''}`,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome,
      unsold_reason,
      area_m2,
      notes: rowNotes.length ? rowNotes : null,
    });
  }

  return records;
}
