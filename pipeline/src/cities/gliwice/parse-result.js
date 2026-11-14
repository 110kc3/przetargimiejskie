import { parseAddress } from '../../core/normalize.js';


const ROMAN = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10 };

function splitSections(rawText) {
  const text = rawText.replace(/\r/g, '');
  const unsoldRe = /INFORMACJA\s+O\s+(?:WYNIKACH\s+POST[ĘE]POWA[ŃN]\s+DOTYCZ[ĄA]CYCH|WYNIKU\s+POST[ĘE]POWANIA\s+DOTYCZ[ĄA]CEGO)/i;
  const m = unsoldRe.exec(text);
  if (m) {
    return {
      sold: text.slice(0, m.index),
      unsold: text.slice(m.index),
    };
  }
  return { sold: text, unsold: '' };
}

const KIND_RE = /\b(mieszkaln\w*|u[żz]ytkow\w*|gara[żz]\w*)/i;
function classifyKind(s) {
  const m = KIND_RE.exec(s);
  if (!m) return 'unknown';
  const w = m[1].toLowerCase();
  if (w.startsWith('mieszkal')) return 'mieszkalny';
  if (w.startsWith('uzyt') || w.startsWith('użyt')) return 'uzytkowy';
  if (w.startsWith('gara')) return 'garaz';
  return 'unknown';
}

function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = numStr.replace(/[:;]/g, '.').replace(/\s+/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.](\d{2}))?$/.exec(cleaned);
  if (!m) {
    const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
    const n = Number(fallback);
    return Number.isFinite(n) ? n : null;
  }
  const intPart = m[1].replace(/[.,]/g, '');
  return Number(intPart);
}

const PRICE_LINE_START =
  /Cena\s+wywoławcza[^0-9]+([\d.,:;\s]+)\s*z[łl]/i;
const PRICE_LINE_FINAL =
  /Cena[^.]*?(?:osi[ąa]gni[ęe]ta|uzyskan\w*)[^0-9]+([\d.,:;\s]+)\s*z[łl]/i;

const ROUND_RE = /\b(I{1,3}|IV|V|VI|VII|VIII|IX|X)\s+ustny\s+przetarg/i;

const ADDR_FROM_SOLD =
  /przy\s+(?:u[lł]|al|pl|os)\.?\s+([A-ZŻŹĆŁŚĄĘÓŃa-zżźćłśąęóń.\-,;:j ]+?\s+\d+(?:-\d+)?[A-Za-z]?(?:\s*[\/\\]\s*[\dA-Za-z]+)?)/i;
const ADDR_FROM_SOLD_GARAGE =
  /gara[żz]u\s+nr\s+(\d+)[^.]*?w\s+rejonie\s+(?:ul|al|pl|os)\.?\s+([A-ZŻŹĆŁŚĄĘÓŃa-zżźćłśąęóń.\- ]+?)(?=\s+wraz|\s+oraz|,)/i;

const PARA_SPLIT_SOLD =
  /\n(?=\s*(?:w\s+dniu|o\s+godz\.?|w\s+dniu\.?)\s+)/i;

function cleanAddrNoise(s) {
  return s.replace(/[;:]\S*/g, '').replace(/\s+/g, ' ').trim();
}

function parseSoldSection(sold, auctionDate, sourcePdf) {
  if (!sold) return [];
  const paras = sold.split(PARA_SPLIT_SOLD);
  const out = [];
  for (const para of paras) {
    if (!/odby[łl]\s+si[ęe]/.test(para)) continue;
    const kind = classifyKind(para);
    const addrM = ADDR_FROM_SOLD.exec(para);
    let addressRaw = addrM ? cleanAddrNoise(addrM[1]) : '';
    let address = addressRaw ? parseAddress(addressRaw) : null;
    if (/na\s+dzia[łl]/i.test(addressRaw)) {
      const pg =
        /zabudowan\w+\s+gara[żz]em[\s\S]{0,120}?przy\s+(?:ul|al|pl|os)\.?\s+([A-ZŻŹĆŁŚĄĘÓŃa-zżźćłśąęóń.\- ]+?)\s+na\s+dzia[łl]ce\s+nr\s+(\d+)(?:\/(\d+))?/i.exec(para);
      if (pg) {
        const street = pg[1].trim();
        addressRaw = `${street} działka nr ${pg[2]}${pg[3] ? '/' + pg[3] : ''}`;
        address = parseAddress(`${street} 0 garaż nr ${pg[2]}`);
      } else {
        address = null;
      }
    }
    if (!address) {
      const gm = ADDR_FROM_SOLD_GARAGE.exec(para);
      if (gm) {
        addressRaw = `${gm[2].trim()} rejon garaż nr ${gm[1]}`;
        address = parseAddress(`${gm[2].trim()} 0 garaż nr ${gm[1]}`);
      }
    }
    if (!address) {
      const gm2 = /gara[żz]u\s+nr\s+(\d+)[\s\S]+?zlokalizowan\w+\s+w\s+Gliwicach\s+przy\s+(?:ul|al|pl|os)\.?\s+([A-ZŻŹĆŁŚĄĘÓŃa-zżźćłśąęóń.\- ]+?\s+\d+[A-Za-z]?)/i.exec(para);
      if (gm2) {
        addressRaw = `${gm2[2].trim()} garaż nr ${gm2[1]}`;
        address = parseAddress(`${gm2[2].trim()} garaż nr ${gm2[1]}`);
      }
    }
    const startM = PRICE_LINE_START.exec(para);
    const finalM = PRICE_LINE_FINAL.exec(para);
    const startingPrice = startM ? parsePLN(startM[1].trim()) : null;
    const finalPrice = finalM ? parsePLN(finalM[1].trim()) : null;
    const roundM = ROUND_RE.exec(para);
    const round = roundM ? ROMAN[roundM[1].toUpperCase()] ?? null : null;
    let outcome = 'sold';
    let unsoldReason = null;
    if (!finalPrice) {
      outcome = 'no_winner';
    }
    const notes = [];
    if (!addressRaw) notes.push('parse: missing address');
    if (startingPrice === null) notes.push('parse: missing starting price');
    if (address?.warning) notes.push(address.warning);
    out.push({
      auction_date: auctionDate,
      source_pdf: sourcePdf,
      kind,
      address_raw: addressRaw,
      address,
      round,
      ...(round != null ? { round_source: 'explicit' } : {}),
      starting_price_pln: startingPrice,
      final_price_pln: finalPrice,
      outcome,
      unsold_reason: unsoldReason,
      notes,
    });
  }
  return out;
}

const UNSOLD_ITEM_RE =
  /\b(?:ul|al|pl|os)\.\s+([^\n]+?)\s*[-\u2013\u2014\u2212]+\s*(?:sprzeda[żz]\s+([^\n]+?)|((?:lokal\w*\s+(?:mieszkaln\w*|u[żz]ytkow\w*)|gara[żz]\w*)[^\n]*))(?=\n|$)/gi;

const RESIDENTIAL_UNIT_RE =
  /\blokal\w*\s+mieszkaln\w*\s+nr\.?\s+([1-9]\d*[A-Za-z]?)(?!\s*\/)/i;

function expandUnsoldAddressRaws(addressRaw, tail) {
  const baseAddress = parseAddress(addressRaw);
  if (!baseAddress || baseAddress.apt !== null) return [addressRaw];
  const unit = RESIDENTIAL_UNIT_RE.exec(tail);
  return unit ? [`${addressRaw}/${unit[1]}`] : [addressRaw];
}

function parseUnsoldSection(unsold, auctionDate, sourcePdf) {
  if (!unsold) return [];
  const records = [];
  const reasonRe =
    /Komisja\s+przetargowa\s+stwierdzi[łl]a[\s\S]+?(?=\n\s*(?:ul|al|pl|os)\.|\n\s*$|$)/gi;
  let cursor = 0;
  let bucket = [];
  let m;
  while ((m = reasonRe.exec(unsold)) !== null) {
    const before = unsold.slice(cursor, m.index);
    const reason = classifyUnsoldReason(m[0]);
    const items = extractUnsoldItems(before, auctionDate, sourcePdf, reason);
    records.push(...items);
    cursor = m.index + m[0].length;
  }
  const tail = unsold.slice(cursor);
  records.push(...extractUnsoldItems(tail, auctionDate, sourcePdf, 'unknown'));
  return records;
}

function classifyUnsoldReason(reasonPara) {
  const p = reasonPara.toLowerCase();
  if (/odst[ąa]pi[łl]/.test(p)) return 'bidder_withdrew';
  if (/nie\s+stawi(?:[łl]|li)\s+si[ęe]/.test(p)) return 'bidder_noshow';
  if (/nie\s+odnotowano\s+wp[łl]at/.test(p)) return 'no_deposits';
  if (/brak\s+ofert/.test(p)) return 'no_deposits';
  return 'unknown';
}

function extractUnsoldItems(chunk, auctionDate, sourcePdf, reason) {
  const items = [];
  UNSOLD_ITEM_RE.lastIndex = 0;
  let m;
  while ((m = UNSOLD_ITEM_RE.exec(chunk)) !== null) {
    const addressRaw = cleanAddrNoise(m[1]);
    const tail = m[2] ?? m[3];
    const kind = classifyKind(tail);
    const after = chunk.slice(m.index, m.index + 600);
    const priceM = PRICE_LINE_START.exec(after);
    const startingPrice = priceM ? parsePLN(priceM[1].trim()) : null;
    for (const itemAddressRaw of expandUnsoldAddressRaws(addressRaw, tail)) {
      const address = parseAddress(itemAddressRaw);
      const notes = [];
      if (!address) notes.push('parse: address unparsed: ' + itemAddressRaw);
      if (startingPrice === null) notes.push('parse: missing starting price');
      if (address?.warning) notes.push(address.warning);
      items.push({
        auction_date: auctionDate,
        source_pdf: sourcePdf,
        kind,
        address_raw: itemAddressRaw,
        address,
        round: null,
        starting_price_pln: startingPrice,
        final_price_pln: null,
        outcome: 'unsold',
        unsold_reason: reason,
        notes,
      });
    }
  }
  return items;
}

export function parseResultPdf(ocrText, auctionDate, sourcePdf) {
  const { sold, unsold } = splitSections(ocrText);
  const soldRecs = parseSoldSection(sold, auctionDate, sourcePdf);
  const unsoldRecs = parseUnsoldSection(unsold, auctionDate, sourcePdf);
  return [...soldRecs, ...unsoldRecs];
}
