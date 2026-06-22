// Generates the 5 Chrome Web Store promo mockups (1280x800 SVG -> PNG).
// Dark theme, faithful to the real extension UI: colours/labels copied from
// extension/popup.css, archive.css, styles.css, i18n.js; sample data drawn from
// data/<city>/*.json. Covers the current feature set: 9 cities, houses (dom) &
// land (działka) via the Rodzaj filter, deal score (zł/m² vs city median),
// Google-Maps/geoportal links, and the Raporty (reports) page.
//
//   node make.js            # writes 01..05 *.svg
//   then render to PNG (cairosvg / ImageMagick) at 1280x800.
const fs = require('fs');
const W = 1280, H = 800;

const C = {
  bg:'#0f1623', panel:'#0c121d', card:'#1a2335', cardHd:'#141d2e', border:'#2a3650',
  fg:'#e7ecf5', muted:'#9fb0c9', faint:'#6b7a93', line:'#212c42',
  accent:'#7ea6e6', teal:'#9bd1c9', blueBadgeBg:'#24406b', blueBadgeFg:'#bcd3f5',
  good:'#6cc497', goodBg:'#16352a', goodBorder:'#235440',
  bad:'#e6a36b',
  soldBg:'#16352a', soldFg:'#7ed3a3', archBadgeBg:'#27324a', archBadgeFg:'#aab8d0',
  rowAlt:'#161f30', kpi:'#141d2c', tile:'#141c2b', input:'#121a28',
};
const CITY = {
  gliwice:'#2f5396', katowice:'#9c3030', bytom:'#23713f', zabrze:'#8f5a24',
  sosnowiec:'#1f746a', rybnik:'#63408f', bielsko:'#a23271', myslowice:'#246798',
  swietochlowice:'#65741f',
};
const LBL = { gliwice:'Gliwice', katowice:'Katowice', bytom:'Bytom', zabrze:'Zabrze',
  sosnowiec:'Sosnowiec', rybnik:'Rybnik', bielsko:'Bielsko-Biała',
  myslowice:'Mysłowice', swietochlowice:'Świętochłowice' };

const FS = 'DejaVu Sans, sans-serif';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const txt = (x,y,s,o={}) =>
  `<text x="${x}" y="${y}" font-family="${FS}" font-size="${o.size||13}" fill="${o.fill||C.fg}" `+
  `font-weight="${o.w||400}" text-anchor="${o.anchor||'start'}"`+(o.ls?` letter-spacing="${o.ls}"`:'')+
  (o.op?` opacity="${o.op}"`:'')+`>${esc(s)}</text>`;
const box = (x,y,w,h,o={}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r==null?0:o.r}" fill="${o.fill||'none'}"`+
  (o.stroke?` stroke="${o.stroke}" stroke-width="${o.sw||1}"`:'')+(o.op?` opacity="${o.op}"`:'')+'/>';
const svg = inner => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`+
  box(0,0,W,H,{fill:C.bg})+inner+'</svg>';

// approx text width at given size (DejaVu Sans average advance)
const tw = (s,size=13) => String(s).length*(size*0.55);
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g,' ');

// solid saturated city pill with a white dot
function tag(x,y,id,size=12){
  const label=LBL[id], w=tw(label,size)+26, h=size+10;
  return box(x,y,w,h,{r:h/2,fill:CITY[id]})+
    `<circle cx="${x+12}" cy="${y+h/2}" r="3.5" fill="#fff" opacity="0.9"/>`+
    txt(x+20,y+h/2+size*0.36,label,{size,w:600,fill:'#f3f6fb'});
}
const tagW=(id,size=12)=>tw(LBL[id],size)+26;

// deal-score badge: below = good (green ▼), above = bad (amber ▲)
function deal(x,y,pct,below,anchor='start'){
  const s=(below?'▼ ':'▲ ')+pct+(below?'% poniżej':'% powyżej');
  return txt(x,y,s,{size:11.5,w:600,fill:below?C.good:C.bad,anchor});
}

/* ============================================================ 1) ON-PAGE CHIP */
function shotChip(){
  let s='';
  // browser chrome
  s+=box(0,0,W,56,{fill:'#dfe3ea'});
  s+='<circle cx="26" cy="28" r="7" fill="#ff5f57"/><circle cx="50" cy="28" r="7" fill="#febc2e"/><circle cx="74" cy="28" r="7" fill="#28c840"/>';
  s+=box(110,14,760,28,{r:14,fill:'#fff',stroke:'#c7cfdb'});
  s+=txt(128,33,'bip.um.sosnowiec.pl  ›  sprzedaż lokali  ›  przetarg ustny nieograniczony',{size:13,fill:'#5b6473'});
  // faux BIP page (muted)
  s+=txt(64,118,'Ogłoszenie o I przetargu ustnym nieograniczonym',{size:26,w:700,fill:'#3a4150'});
  s+=txt(64,152,'na sprzedaż lokalu mieszkalnego stanowiącego własność Gminy Sosnowiec',{size:16,fill:'#39414f'});
  s+=box(64,176,1152,1,{fill:'#212a38'});
  s+=txt(64,232,'ul. Kaliskiej 14A/2',{size:22,w:700,fill:'#39414f'});
  s+=txt(64,262,'lokal mieszkalny, II piętro, 2 pokoje',{size:15,fill:'#39414f'});
  for(let i=0;i<5;i++) s+=box(64,300+i*26,720,12,{r:6,fill:'#1b2434'});
  // injected card
  const cx=836,cy=196,cw=380,ch=290;
  s+=box(cx,cy,cw,ch,{r:14,fill:C.card,stroke:C.border});
  s+=box(cx,cy,cw,46,{r:14,fill:C.cardHd});
  s+=box(cx,cy+32,cw,14,{fill:C.cardHd});
  s+=tag(cx+16,cy+10,'sosnowiec',13);
  s+=txt(cx+cw-16,cy+30,'przetargimiejskie',{size:12,fill:C.muted,anchor:'end'});
  s+=box(cx+16,cy+62,150,32,{r:8,fill:C.blueBadgeBg});
  s+=txt(cx+30,cy+84,'● 1. przetarg',{size:15,w:600,fill:C.blueBadgeFg});
  s+=txt(cx+cw-16,cy+84,'nowa',{size:14,fill:C.teal,anchor:'end'});
  const gy=cy+118;
  const cell=(gx,gyy,lab,val,vfill)=>txt(gx,gyy,lab,{size:12,fill:C.muted})+txt(gx,gyy+26,val,{size:20,w:700,fill:vfill||C.fg});
  s+=cell(cx+18,gy,'cena wywoławcza','241 250 zł');
  s+=cell(cx+210,gy,'powierzchnia','48,25 m²');
  s+=cell(cx+18,gy+68,'cena za m²','5 000 zł/m²',C.teal);
  s+=cell(cx+210,gy+68,'termin','30.06.2026');
  // NEW: deal-score row
  s+=box(cx+16,cy+ch-44,cw-32,30,{r:8,fill:C.goodBg,stroke:C.goodBorder});
  s+=txt(cx+30,cy+ch-24,'▼ 14% poniżej mediany',{size:13,w:600,fill:C.good});
  s+=txt(cx+cw-30,cy+ch-24,'mediana 5 800 zł/m²',{size:11.5,fill:C.muted,anchor:'end'});
  // caption band
  s+=box(0,H-92,W,92,{fill:C.panel});
  s+=txt(64,H-50,'Widzisz od razu: runda, cena, m², zł/m², termin — i czy to okazja względem mediany miasta.',{size:20,w:600,fill:C.fg});
  s+=txt(64,H-26,'Wszystko doklejone wprost do ogłoszenia BIP — bez otwierania PDF-ów.',{size:14,fill:C.muted});
  return svg(s);
}

/* ================================================================= 2) POPUP */
function shotPopup(){
  let s='';
  const pw=1130, px=(W-pw)/2, py=54, ph=694;
  s+=`<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="14" fill="${C.card}" stroke="${C.border}" filter="url(#sh)"/>`;
  const PADX=px+30, RIGHT=px+pw-30;
  s+=txt(PADX,py+40,'Aktualne aukcje',{size:19,w:700});
  s+=txt(RIGHT,py+40,'przetargi miejskie · v1.30.1',{size:13,fill:C.muted,anchor:'end'});
  // control row: tabs + Rodzaj filter
  const ty=py+62;
  const tab=(x,label,active)=>box(x,ty,tw(label,13)+28,30,{r:15,fill:active?C.blueBadgeBg:'none',stroke:active?'none':C.border})+
    txt(x+(tw(label,13)+28)/2,ty+20,label,{size:13,w:active?700:400,fill:active?C.blueBadgeFg:C.muted,anchor:'middle'});
  let tx=PADX;
  [['Wszystkie',1],['Obserwowane',0],['Aktualne',0]].forEach(t=>{ s+=tab(tx,t[0],t[1]); tx+=tw(t[0],13)+28+10; });
  // Rodzaj dropdown pill (right)
  const rw=190; const rx=RIGHT-rw;
  s+=box(rx,ty,rw,30,{r:8,fill:C.input,stroke:C.border});
  s+=txt(rx+12,ty+20,'Rodzaj: wszystkie',{size:13,fill:C.fg});
  s+=txt(rx+rw-16,ty+20,'▾',{size:11,fill:C.muted,anchor:'end'});
  s+=txt(rx-14,ty+20,'☀',{size:14,fill:C.muted,anchor:'end'});
  s+=txt(rx-44,ty+20,'PL',{size:13,w:600,fill:C.muted,anchor:'end'});
  // subtitle
  s+=txt(PADX,ty+54,'79 aktywnych · 9 miast · 614 nieruchomości w historii · odświeżono dziś 06:00',{size:12,fill:C.muted});
  // table header
  const COL={addr:PADX+34,typ:PADX+402,price:PADX+640,m2:PADX+790,hist:PADX+830,map:PADX+1000};
  const thY=ty+92;
  s+=txt(PADX,thY,'NIERUCHOMOŚĆ',{size:11,w:600,fill:C.faint,ls:0.5});
  s+=txt(COL.typ,thY,'TYP',{size:11,w:600,fill:C.faint,ls:0.5});
  s+=txt(COL.price,thY,'CENA',{size:11,w:600,fill:C.faint,ls:0.5,anchor:'end'});
  s+=txt(COL.m2,thY,'ZŁ/M²',{size:11,w:600,fill:C.faint,ls:0.5,anchor:'end'});
  s+=txt(COL.hist,thY,'HISTORIA',{size:11,w:600,fill:C.faint,ls:0.5});
  s+=txt(COL.map+18,thY,'MAPA',{size:11,w:600,fill:C.faint,ls:0.5,anchor:'end'});
  s+=box(PADX,thY+9,pw-60,1,{fill:C.line});
  // rows: [city, addr, kind, price, m2, perm2, dealPct, below, round]
  const rows=[
    ['gliwice','Zygmunta Starego 29/4','mieszkalny','461 430 zł','86,79 m²','5 316',8,false,2],
    ['bielsko','Jana Sobieskiego 140','dom','299 000 zł','56 m²',null,null,null,3],
    ['katowice','Mariacka 12/5','mieszkalny','318 000 zł','61,2 m²','5 196',5,true,2],
    ['bytom','Św. Cyryla i Metodego','działka','wycena wkrótce','12 821 m²',null,null,null,1],
    ['sosnowiec','Kaliskiej 14A/2','mieszkalny','241 250 zł','48,25 m²','5 000',14,true,1],
    ['zabrze','3 Maja 17/9','mieszkalny','171 000 zł','67,8 m²','2 522',3,false,2],
    ['swietochlowice','Bytomska 4 (garaż 12)','garaż','18 000 zł','16 m²',null,null,null,1],
  ];
  let ry=thY+22; const RH=64;
  rows.forEach((r,i)=>{
    const [id,addr,kind,price,m2,perm,dpct,below,round]=r;
    const top=ry, mid=top+RH/2;
    if(i%2) s+=box(PADX-8,top,pw-44,RH,{r:6,fill:C.rowAlt});
    s+=txt(PADX,mid+6,i<2?'★':'☆',{size:15,fill:i<2?'#e9c95a':'#3c4760'});
    s+=tag(PADX+22,mid-11,id);
    s+=txt(PADX+22,mid+22,addr,{size:13.5,w:600});
    const kc = kind==='dom'?C.good : kind==='działka'?'#d8b06a' : kind==='garaż'?C.muted : C.fg;
    s+=txt(COL.typ,mid+2,kind,{size:13,w:600,fill:kc});
    s+=txt(COL.price,mid+2,price,{size:13.5,w:700,anchor:'end',fill: price.includes('wkrótce')?C.muted:C.fg});
    s+=txt(COL.typ,mid+22,m2,{size:11.5,fill:C.muted});
    if(perm){ s+=txt(COL.m2,mid+2,perm,{size:13,w:600,fill:C.accent,anchor:'end'});
      if(dpct!=null) s+=deal(COL.m2,mid+22,dpct,below,'end'); }
    else s+=txt(COL.m2,mid+2,'—',{size:13,fill:C.faint,anchor:'end'});
    if(round===1) s+=txt(COL.hist,mid+2,'nowa',{size:13,w:600,fill:C.teal});
    else s+=txt(COL.hist,mid+2,round+'. przetarg',{size:13,w:600,fill:'#e0b07a'});
    s+=txt(COL.map+18,mid+2,'Mapa ↗',{size:12.5,w:600,fill:C.accent,anchor:'end'});
    s+=box(PADX-8,top+RH,pw-44,1,{fill:C.line});
    ry+=RH;
  });
  const fy=py+ph-20;
  s+=txt(PADX,fy,'dane: publiczne BIP-y miast · 9 miast Górnego Śląska',{size:11,fill:C.faint});
  s+=txt(RIGHT,fy,'nic nie opuszcza Twojego komputera · repozytorium',{size:11,fill:C.faint,anchor:'end'});
  const defs='<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="22" flood-color="#000" flood-opacity="0.45"/></filter></defs>';
  return svg(defs+s);
}

/* =============================================================== 3) ARCHIVE */
function shotArchive(){
  let s=''; const M=32;
  s+=txt(M,48,'Archiwum przetargów',{size:24,w:700});
  s+=txt(M,74,'Wszystkie dotychczasowe miejskie przetargi — mieszkania, domy i działki · Górny Śląsk',{size:14,fill:C.muted});
  s+=txt(W-M,48,'9 miast · PL ☀',{size:13,fill:C.muted,anchor:'end'});
  // filter pills
  const fy=96;
  const fpill=(x,lab,val,w)=>box(x,fy,w,32,{r:8,fill:C.input,stroke:C.border})+
    txt(x+12,fy+21,lab+': ',{size:12,fill:C.muted})+txt(x+12+tw(lab+': ',12),fy+21,val,{size:12,w:600,fill:C.fg})+
    txt(x+w-14,fy+21,'▾',{size:10,fill:C.muted,anchor:'end'});
  let fx=M;
  [['Miasto','wszystkie',180],['Rodzaj','wszystkie',180],['Wynik','wszystkie',170],['Rocznik','wszystkie',180]].forEach(f=>{s+=fpill(fx,f[0],f[1],f[2]);fx+=f[2]+12;});
  s+=box(W-M-250,fy,250,32,{r:8,fill:C.input,stroke:C.border})+txt(W-M-238,fy+21,'⌕  szukaj po ulicy…',{size:12.5,fill:C.faint});
  // KPI cards (incl houses & land)
  const ky=150, kh=80, kw=(W-2*M-3*14)/4; let kx=M;
  const kpi=(big,sub,bf)=>{ const r=box(kx,ky,kw,kh,{r:10,fill:C.kpi,stroke:C.border})+
    txt(kx+18,ky+38,big,{size:26,w:700,fill:bf||C.fg})+txt(kx+18,ky+62,sub,{size:12,fill:C.muted}); kx+=kw+14; return r; };
  s+=kpi('1 240','rozpatrzonych przetargów');
  s+=kpi('76','sprzedanych (Gliwice)',C.good);
  s+=kpi('318','domów i działek',C.teal);
  s+=kpi('4 920 zł/m²','mediana ceny wyw.',C.accent);
  // table
  const ty=268;
  const cols=[['MIASTO',M],['ADRES',M+118],['TYP',M+430],['RUNDA',M+520],['POW.',M+600],['CENA WYW.',M+700],['ZŁ/M²',M+850],['DZIAŁKA',M+930],['WYNIK',M+1030]];
  cols.forEach(c=>s+=txt(c[1],ty,c[0],{size:11,w:600,fill:C.faint,ls:0.4}));
  s+=box(M,ty+9,W-2*M,1,{fill:C.line});
  // [city, addr, kind, round, area, price, perm2, dzialka, outcome, sold]
  const data=[
    ['gliwice','Zygmunta Starego 29/4','mieszkalny','2.','86,79','461 430 zł','5 316','—','sprzedano',1],
    ['bielsko','Jana Sobieskiego 140','dom','3.','56,0','299 000 zł','5 339','—','w archiwum',0],
    ['gliwice','Łabędzka — Stare Gliwice','działka','1.','7 918','wycena wkrótce','—','mapa ↗','w archiwum',0],
    ['katowice','Mariacka 12/5','mieszkalny','2.','61,2','318 000 zł','5 196','—','w archiwum',0],
    ['bytom','Św. Cyryla i Metodego','działka','1.','12 821','wycena wkrótce','—','mapa ↗','w archiwum',0],
    ['zabrze','Wolności 284/3','mieszkalny','1.','54,0','149 000 zł','2 759','—','w archiwum',0],
    ['rybnik','Rajska — Boguszowice','działka','1.','3 780','wycena wkrótce','—','mapa ↗','w archiwum',0],
    ['sosnowiec','Kaliskiej 14A/2','mieszkalny','1.','48,25','241 250 zł','5 000','—','w archiwum',0],
    ['myslowice','Powstańców 9/3','mieszkalny','2.','45,1','198 500 zł','4 401','—','w archiwum',0],
    ['gliwice','Barlickiego 3/7','mieszkalny','1.','55,1','233 000 zł','4 230','—','sprzedano',1],
  ];
  let dy=ty+18; const RH=42;
  data.forEach((d,i)=>{
    const [id,addr,kind,round,area,price,perm,dz,out,sold]=d;
    const top=dy, mid=top+RH/2+4;
    if(i%2) s+=box(M,top,W-2*M,RH,{fill:C.rowAlt});
    s+=tag(M,mid-12,id);
    s+=txt(M+118,mid,addr,{size:12.5,w:600});
    const kc=kind==='dom'?C.good:kind==='działka'?'#d8b06a':C.fg;
    s+=txt(M+430,mid,kind,{size:12,w:kind==='mieszkalny'?400:600,fill:kc});
    s+=txt(M+520,mid,round,{size:12,fill:C.muted});
    s+=txt(M+600,mid,area,{size:12,fill:C.fg});
    s+=txt(M+700,mid,price,{size:12,fill:price.includes('wkrótce')?C.faint:C.fg});
    s+=txt(M+850,mid,perm,{size:12,fill:perm==='—'?C.faint:C.accent});
    s+=txt(M+930,mid,dz,{size:12,w:600,fill:dz==='—'?C.faint:C.accent});
    if(sold){ s+=box(M+1030,mid-13,86,20,{r:10,fill:C.soldBg});s+=txt(M+1073,mid+1,'sprzedano',{size:11,w:600,fill:C.soldFg,anchor:'middle'}); }
    else { s+=box(M+1030,mid-13,92,20,{r:10,fill:C.archBadgeBg});s+=txt(M+1076,mid+1,'w archiwum',{size:11,w:600,fill:C.archBadgeFg,anchor:'middle'}); }
    s+=box(M,top+RH,W-2*M,1,{fill:C.line});
    dy+=RH;
  });
  return svg(s);
}

/* ==================================================== 4) HOUSES & LAND / RODZAJ */
function shotHousesLand(){
  let s=''; const M=40;
  s+=txt(M,52,'Domy i działki — nie tylko mieszkania',{size:25,w:700});
  s+=txt(M,80,'Jeden filtr Rodzaj przełącza między mieszkaniami, domami, działkami, lokalami i garażami.',{size:14,fill:C.muted});
  // open Rodzaj dropdown
  const dx=M, dy=108, dw=240;
  s+=box(dx,dy,dw,34,{r:8,fill:C.input,stroke:C.accent,sw:1.5});
  s+=txt(dx+14,dy+22,'Rodzaj: działki',{size:13.5,w:600,fill:C.fg});
  s+=txt(dx+dw-16,dy+22,'▾',{size:11,fill:C.accent,anchor:'end'});
  const opts=[['Mieszkania',0],['Domy',0],['Działki',1],['Lokale użytkowe',0],['Garaże',0]];
  const oy=dy+40;
  s+=box(dx,oy,dw,opts.length*34+8,{r:8,fill:C.card,stroke:C.border});
  opts.forEach((o,i)=>{ const y=oy+8+i*34;
    if(o[1]) s+=box(dx+6,y,dw-12,30,{r:6,fill:C.blueBadgeBg});
    s+=txt(dx+18,y+20,o[0],{size:13,w:o[1]?700:400,fill:o[1]?C.blueBadgeFg:C.fg});
    if(o[1]) s+=txt(dx+dw-18,y+20,'✓',{size:13,fill:C.blueBadgeFg,anchor:'end'});
  });
  // right: explanatory tiles
  const tilesX=dx+dw+28;
  const tile=(x,y,w,h,head,body,accent)=>box(x,y,w,h,{r:10,fill:C.tile,stroke:C.border})+
    txt(x+16,y+28,head,{size:15,w:700,fill:accent||C.fg})+txt(x+16,y+52,body,{size:12.5,fill:C.muted});
  const tW=(W-tilesX-M-2*14)/3;
  s+=tile(tilesX,dy,tW,84,'Domy / zabudowane','budynki + pow. zabudowy',C.good);
  s+=tile(tilesX+tW+14,dy,tW,84,'Działki / grunty','area, obręb, nr parceli','#d8b06a');
  s+=tile(tilesX+2*(tW+14),dy,tW,84,'Geoportal','link do mapy każdej działki',C.accent);
  s+=txt(tilesX,dy+118,'Działki i domy mają własną kolumnę powierzchni i odnośnik do mapy parceli —',{size:13,fill:C.muted});
  s+=txt(tilesX,dy+138,'a ceny wywoławcze pojawiają się, gdy gmina ogłosi przetarg („wycena wkrótce” do tego czasu).',{size:13,fill:C.muted});
  // table of houses + land
  const ty=360;
  const cols=[['MIASTO',M],['ADRES / OBRĘB',M+118],['TYP',M+470],['POWIERZCHNIA',M+560],['CENA WYWOŁAWCZA',M+730],['MAPA',M+960]];
  cols.forEach(c=>s+=txt(c[1],ty,c[0],{size:11,w:600,fill:C.faint,ls:0.4}));
  s+=box(M,ty+9,W-2*M,1,{fill:C.line});
  // [city, addr, kind, area, price, sub]
  const data=[
    ['bielsko','Jana Sobieskiego 140','dom','56 m²','299 000 zł','dom · pow. użytkowa'],
    ['sosnowiec','Targowa 12','dom','1 920 m²','8 867 000 zł','nieruchomość zabudowana'],
    ['gliwice','Łabędzka — Stare Gliwice','działka','7 918 m²','wycena wkrótce','grunt niezabudowany'],
    ['bytom','Św. Cyryla i Metodego','działka','12 821 m²','wycena wkrótce','grunt · 3 parcele'],
    ['zabrze','Henryka Sienkiewicza','działka','715 m²','wycena wkrótce','grunt · obręb Zabrze'],
    ['rybnik','Rajska — Boguszowice','działka','3 780 m²','wycena wkrótce','grunt niezabudowany'],
  ];
  let dyy=ty+20; const RH=58;
  data.forEach((d,i)=>{
    const [id,addr,kind,area,price,sub]=d;
    const top=dyy, mid=top+RH/2;
    if(i%2) s+=box(M,top,W-2*M,RH,{r:6,fill:C.rowAlt});
    s+=tag(M,mid-11,id);
    s+=txt(M+118,mid-2,addr,{size:13.5,w:600});
    s+=txt(M+118,mid+18,sub,{size:11.5,fill:C.faint});
    const kc=kind==='dom'?C.good:'#d8b06a';
    s+=box(M+470,mid-12,tw(kind,12)+18,22,{r:11,fill:kind==='dom'?C.goodBg:'#352a14',stroke:kind==='dom'?C.goodBorder:'#5a4422'});
    s+=txt(M+470+(tw(kind,12)+18)/2,mid+3,kind,{size:12,w:700,fill:kc,anchor:'middle'});
    s+=txt(M+560,mid+3,area,{size:13.5,w:600});
    s+=txt(M+730,mid+3,price,{size:13.5,w:price.includes('wkrótce')?400:700,fill:price.includes('wkrótce')?C.faint:C.fg});
    s+=box(M+960,mid-13,108,26,{r:6,fill:'#16233a',stroke:'#274063'});
    s+=txt(M+960+54,mid+4,'mapa działki ↗',{size:11.5,w:600,fill:C.accent,anchor:'middle'});
    s+=box(M,top+RH,W-2*M,1,{fill:C.line});
    dyy+=RH;
  });
  return svg(s);
}

/* ================================================================ 5) RAPORTY */
function shotRaporty(){
  let s=''; const M=36;
  s+=txt(M,48,'Raporty rynku',{size:25,w:700});
  s+=txt(M,74,'Skuteczność sprzedaży, mediany zł/m² i okazje po obniżce — Górny Śląsk',{size:14,fill:C.muted});
  // filters + export
  const fy=96;
  const fpill=(x,lab,val,w)=>box(x,fy,w,32,{r:8,fill:C.input,stroke:C.border})+
    txt(x+12,fy+21,lab+': ',{size:12,fill:C.muted})+txt(x+12+tw(lab+': ',12),fy+21,val,{size:12,w:600,fill:C.fg})+
    txt(x+w-14,fy+21,'▾',{size:10,fill:C.muted,anchor:'end'});
  let fx=M;
  [['Miasto','wszystkie',170],['Rodzaj','mieszkania',180],['Okres','12 miesięcy',170]].forEach(f=>{s+=fpill(fx,f[0],f[1],f[2]);fx+=f[2]+12;});
  s+=box(W-M-150,fy,70,32,{r:8,fill:C.input,stroke:C.border})+txt(W-M-150+35,fy+21,'⤓ CSV',{size:12,fill:C.accent,anchor:'middle'});
  s+=box(W-M-74,fy,74,32,{r:8,fill:C.blueBadgeBg})+txt(W-M-37,fy+21,'⤓ PDF',{size:12,w:600,fill:C.blueBadgeFg,anchor:'middle'});
  // KPI row
  const ky=148, kh=78, kw=(W-2*M-3*14)/4; let kx=M;
  const kpi=(big,sub,bf)=>{ const r=box(kx,ky,kw,kh,{r:10,fill:C.kpi,stroke:C.border})+
    txt(kx+18,ky+38,big,{size:25,w:700,fill:bf||C.fg})+txt(kx+18,ky+61,sub,{size:12,fill:C.muted}); kx+=kw+14; return r; };
  s+=kpi('76','mieszkań sprzedanych',C.good);
  s+=kpi('+3,8%','mediana ceny końcowej vs wyw.',C.teal);
  s+=kpi('4 920 zł/m²','mediana ceny uzyskanej',C.accent);
  s+=kpi('31','okazji po obniżce','#d8b06a');
  // LEFT: medians zł/m² by city (the deal-score basis)
  const sy=252;
  s+=txt(M,sy,'Mediany zł/m² — mieszkania sprzedane',{size:16,w:700});
  s+=txt(M,sy+20,'Podstawa „deal score" w rozszerzeniu',{size:12,fill:C.muted});
  const bx=M, bw=560, byTop=sy+40;
  const meds=[['katowice',5400],['bielsko',5100],['gliwice',4920],['rybnik',4100],['sosnowiec',3800],['myslowice',3200],['zabrze',2600],['swietochlowice',2100],['bytom',1900]];
  const maxV=5600; const barH=30, gap=12;
  meds.forEach((m,i)=>{
    const y=byTop+i*(barH+gap);
    s+=tag(bx,y+ (barH-22)/2,m[0]);
    const bxStart=bx+150, bwMax=bw-150;
    s+=box(bxStart,y,bwMax,barH,{r:5,fill:'#101826'});
    const w=Math.round(bwMax*m[1]/maxV);
    s+=box(bxStart,y,w,barH,{r:5,fill:CITY[m[0]]});
    s+=txt(bxStart+w-10,y+barH/2+5,fmt(m[1])+' zł/m²',{size:12.5,w:700,fill:'#0d1420',anchor:'end'});
  });
  // RIGHT: Tablica okazji (deals after price drop)
  const rxX=620, rw=W-M-rxX;
  s+=txt(rxX,sy,'Tablica okazji — aktualne aukcje po obniżce',{size:16,w:700});
  s+=txt(rxX,sy+20,'Spadek ceny wywoławczej względem 1. podejścia',{size:12,fill:C.muted});
  const oy=sy+40;
  s+=box(rxX,oy,rw,432,{r:10,fill:C.kpi,stroke:C.border});
  const oc=[['NIERUCHOMOŚĆ',rxX+16],['TERAZ',rxX+rw-200],['1. RUNDA',rxX+rw-110],['SPADEK',rxX+rw-16]];
  oc.forEach((c,i)=>s+=txt(c[1],oy+26,c[0],{size:10.5,w:600,fill:C.faint,ls:0.4,anchor:i>=2||i===1?'end':'start'}));
  s+=box(rxX+12,oy+36,rw-24,1,{fill:C.line});
  // [city, addr, now, first, dropPct]
  const deals=[
    ['bytom','Dworcowa 5/18','82 500','110 000','25'],
    ['zabrze','3 Maja 17/9','171 000','205 000','17'],
    ['sosnowiec','Targowa 12','8 867 000','9 986 000','11'],
    ['gliwice','Kościuszki 8/2','198 000','220 000','10'],
    ['rybnik','Zgrzebnioka 7B/6','180 000','198 000','9'],
    ['katowice','Warszawska 40/2','266 000','285 000','7'],
    ['myslowice','Powstańców 9/3','198 500','209 000','5'],
  ];
  let oyy=oy+50; const RH=52;
  deals.forEach((d,i)=>{
    const [id,addr,now,first,drop]=d; const mid=oyy+RH/2;
    if(i%2) s+=box(rxX+8,oyy,rw-16,RH,{r:6,fill:C.rowAlt});
    s+=tag(rxX+16,mid-22,id,11);
    s+=txt(rxX+16,mid+16,addr,{size:12.5,w:600});
    s+=txt(rxX+rw-200,mid+4,now+' zł',{size:12.5,w:700,anchor:'end'});
    s+=txt(rxX+rw-110,mid+4,first+' zł',{size:12,fill:C.faint,anchor:'end'});
    const big=+drop>=25;
    s+=box(rxX+rw-76,mid-12,60,24,{r:12,fill:big?C.goodBg:'#22304a'});
    s+=txt(rxX+rw-46,mid+4,'−'+drop+'%',{size:12,w:700,fill:big?C.good:C.accent,anchor:'middle'});
    oyy+=RH;
  });
  s+=txt(M,H-22,'przetargimiejskie.pl/raporty · dane z publicznych BIP-ów · aktualizacja codziennie',{size:11.5,fill:C.faint});
  return svg(s);
}

const out=[
  ['01-on-page-chip.svg', shotChip()],
  ['02-popup-all-cities.svg', shotPopup()],
  ['03-web-archive.svg', shotArchive()],
  ['04-houses-land.svg', shotHousesLand()],
  ['05-raporty.svg', shotRaporty()],
];
for(const [name,data] of out){ fs.writeFileSync(__dirname+'/'+name, data); console.log('wrote',name); }
