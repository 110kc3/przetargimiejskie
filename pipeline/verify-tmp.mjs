// Temp verification of CURRENT (buggy) direct extractors on spaced-digit CMS damage.
function parsePLN(s){ if(!s) return null; let c=String(s).replace(/[\s ]/g,''); c=c.replace(/z[łl].*$/i,''); c=c.replace(/,-+$/,'').replace(/,\d{1,2}$/,''); c=c.replace(/[^\d]/g,''); return c?Number(c):null; }
function priceFromText(text){ const m=/cen[aąęy]\s+wywo[łl]awcz[aąeyj]*[\s\S]{0,140}?([\d][\d.,\s -]*?)\s*z[łl]/i.exec(text||''); return m?parsePLN(m[1]):null; }
const PL_MONTHS={stycznia:1,lutego:2,marca:3,kwietnia:4,maja:5,czerwca:6,lipca:7,sierpnia:8,'września':9,wrzesnia:9,'października':10,pazdziernika:10,listopada:11,grudnia:12};
function auctionDateFromText(text){ if(!text) return null;
  const spelled=/odb[ęe]dzie\s+si[ęe][^0-9]{0,40}?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if(spelled){const mon=PL_MONTHS[spelled[2].toLowerCase()]; if(mon) return `${spelled[3]}-${String(mon).padStart(2,'0')}-${spelled[1].padStart(2,'0')}`;}
  const num=/w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if(num) return `${num[3]}-${num[2].padStart(2,'0')}-${num[1].padStart(2,'0')}`;
  return null;
}
const p1 = 'C ena wywoławcza wynosi 50 .000,- z ł.';
console.log("CURRENT price 'C ena ... 50 .000,- z ł' =>", priceFromText(p1), '(expect 50000)');
const p2 = 'Cena wywoławcza nieruchomości wynosi 215 000,00 z ł.';
console.log("CURRENT price 'z ł' split =>", priceFromText(p2), '(expect 215000)');
const d1 = 'Przetarg odbędzie się w dniu 9 grudnia 202 4 r.';
console.log("CURRENT date 'grudnia 202 4' =>", auctionDateFromText(d1), '(expect 2024-12-09)');
const d2 = 'Przetarg odbędzie się w dniu 0 9.12.202 4 r.';
console.log("CURRENT date '0 9.12.202 4' =>", auctionDateFromText(d2), '(expect 2024-12-09)');
