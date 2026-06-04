// Generates 1280x800 Chrome Web Store promo mockups (SVG -> PNG via ImageMagick)
// that faithfully reproduce the REAL extension UI: colours, fonts, table layout
// and Polish labels are copied 1:1 from extension/popup.css, archive.css,
// styles.css and i18n.js (light theme — the default). Sample data is authentic
// (drawn from data/<city>/active.json).
const fs = require('fs');
const W = 1280, H = 800;

const P = {
  fg:'#1f2937', muted:'#6b7280', border:'#e5e7eb', accent:'#4a6fa5',
  bg:'#ffffff', bgElev:'#f9fafb', tile:'#f7f9fc', rowHover:'#f3f4f6',
  greenBg:'#e6f4ea', greenFg:'#1e6b34', greenBorder:'#b6e1c2',
  amberFg:'#7a5500',
  statBg:'#e8f0fb', statFg:'#1f3a5f', statBorder:'#bcd0ec',
  perm2:'#4a6fa5',
};
const CITY = {
  gliwice:  ['#e8efff','#2a4d8f','#c8d6f0','Gliwice'],
  katowice: ['#fdecec','#8a2a2a','#f0caca','Katowice'],
  bytom:    ['#e7f6ec','#1f6b3a','#c5e6d1','Bytom'],
  zabrze:   ['#fdecd9','#8a531f','#f0d6b0','Zabrze'],
  sosnowiec:['#e2f4f2','#1d6b62','#bfe6e0','Sosnowiec'],
  rybnik:   ['#efe7fb','#5b3a8a','#ddccf0','Rybnik'],
};
const FS = 'DejaVu Sans, sans-serif';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const txt = (x,y,s,o={}) =>
  '<text x="'+x+'" y="'+y+'" font-family="'+FS+'" font-size="'+(o.size||13)+'" '+
  'fill="'+(o.fill||P.fg)+'" font-weight="'+(o.w||400)+'" text-anchor="'+(o.anchor||'start')+'"'+
  (o.ls?' letter-spacing="'+o.ls+'"':'')+'>'+esc(s)+'</text>';
const box = (x,y,w,h,o={}) =>
  '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.r==null?0:o.r)+'" '+
  'fill="'+(o.fill||'none')+'"'+(o.stroke?' stroke="'+o.stroke+'" stroke-width="'+(o.sw||1)+'"':'')+'/>';

function tagW(id){ return CITY[id][3].length*7.0 + 12; }
function tagOnly(x,y,id){
  const c=CITY[id]; const w=tagW(id);
  return box(x,y,w,17,{r:3,fill:c[0],stroke:c[2]})+
    txt(x+6,y+12.5,c[3].toUpperCase(),{size:10,w:600,fill:c[1],ls:0.4});
}
function svg(inner,bg){ return '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">'+
  box(0,0,W,H,{fill:bg||'#e7ebf1'})+inner+'</svg>'; }

/* 1) ON-PAGE INJECTION */
function shotOnPage(){
  let s='';
  s+=box(0,0,W,52,{fill:'#dfe3ea'});
  s+='<circle cx="26" cy="26" r="7" fill="#ff5f57"/><circle cx="50" cy="26" r="7" fill="#febc2e"/><circle cx="74" cy="26" r="7" fill="#28c840"/>';
  s+=box(108,12,820,28,{r:14,fill:'#fff',stroke:'#c7cfdb'});
  s+=txt(126,30,'bip.um.sosnowiec.pl  ›  Sprzedaż lokali mieszkalnych  ›  ogłoszenie',{size:13,fill:'#5b6473'});
  s+=box(1150,12,40,28,{r:6,fill:'#eef2f7',stroke:'#cdd6e2'});
  s+=txt(1170,31,'pm',{size:13,w:800,fill:P.accent,anchor:'middle'});
  s+=box(0,52,W,H-52,{fill:'#ffffff'});
  s+=txt(80,108,'Ogłoszenie o I przetargu ustnym nieograniczonym',{size:24,w:700,fill:'#1a2230'});
  s+=txt(80,138,'Gmina Sosnowiec — sprzedaż lokalu mieszkalnego',{size:15,fill:'#55617a'});
  s+=box(80,158,1120,1,{fill:'#e6eaf0'});
  s+=box(80,186,1120,250,{r:8,fill:'#fbfcfe',stroke:'#e6eaf0'});
  s+=txt(104,224,'ul. Kaliskiej 14A/2',{size:20,w:700,fill:'#1a2230'});
  s+=txt(104,250,'lokal mieszkalny · II piętro · 2 pokoje · pow. użytkowa 48,25 m²',{size:14,fill:'#55617a'});
  s+=txt(104,284,'Cena wywoławcza: ',{size:15,fill:'#33405a'})+
     txt(254,284,'241 250 zł',{size:15,w:700,fill:'#1a2230'})+
     txt(346,284,'  (5 000 zł/m²)',{size:14,w:600,fill:P.perm2});
  s+=txt(104,310,'Termin przetargu: 30.06.2026, godz. 10:00',{size:14,fill:'#55617a'});
  const statTxt='1. przetarg   ·   241 250 zł   ·   48,25 m²   ·   5 000 zł/m²   ·   30.06.2026';
  const statW=statTxt.length*7.2+22;
  s+=box(104,336,statW,30,{r:4,fill:P.statBg,stroke:P.statBorder});
  s+=txt(115,356,statTxt,{size:12.5,w:600,fill:P.statFg});
  const badge='● brak wcześniejszych aukcji';
  const bw=badge.length*7.0+18;
  s+=box(104,374,bw,26,{r:4,fill:P.greenBg,stroke:P.greenBorder});
  s+=txt(114,391.5,badge,{size:12,w:600,fill:P.greenFg});
  s+=box(104,470,1096,1,{fill:'#e6eaf0'});
  s+=txt(80,512,'Dodane przez rozszerzenie wprost na stronie BIP: która to runda, cena, m², zł/m² i termin —',{size:18,w:600,fill:'#1a2230'});
  s+=txt(80,540,'plus znacznik historii (tu zielony: brak wcześniejszych aukcji).',{size:18,w:600,fill:'#1a2230'});
  s+=box(0,H-70,W,70,{fill:'#0f1623'});
  s+=txt(80,H-28,'Historia przetargu doklejona do ogłoszenia — bez otwierania PDF-ów.',{size:18,w:600,fill:'#e7ecf5'});
  return svg(s,'#ffffff');
}

/* 2) POPUP */
function shotPopup(){
  let s='';
  const pw=1080, px=(W-pw)/2, py=58, ph=684;
  s+='<rect x="'+px+'" y="'+py+'" width="'+pw+'" height="'+ph+'" rx="12" fill="#ffffff" stroke="'+P.border+'" filter="url(#sh)"/>';
  const PADX=px+26;
  s+=txt(PADX,py+38,'Aktualne aukcje',{size:18,w:700});
  let bx=px+pw-26;
  const btn=(label,w,opt)=>{opt=opt||{};bx-=w;const r=box(bx,py+18,w,30,{r:4,fill:opt.bg||P.bg,stroke:opt.border||P.border})+txt(bx+w/2,py+38,label,{size:13,w:opt.w||400,fill:opt.fg||P.accent,anchor:'middle'});bx-=8;return r;};
  s+=btn('☕ Wesprzyj',120,{fg:P.amberFg,w:600,border:'#fff4d6'});
  s+=btn('Archiwum',96);
  s+=btn('Odśwież dane',118);
  s+=btn('PL',44,{w:600});
  s+=btn('☀',38);
  s+=txt(PADX,py+70,'79 aktywnych · 614 nieruchomości śledzonych · odświeżono dziś 06:00',{size:12,fill:P.muted});
  const thY=py+104;
  s+=box(PADX,thY+8,pw-52,1,{fill:P.border});
  const cols=[['NIERUCHOMOŚĆ',PADX+40,'start'],['TYP',PADX+360,'start'],['DATY',PADX+470,'start'],['CENA ↕',PADX+690,'end'],['CENA/M²',PADX+810,'end'],['HISTORIA',PADX+900,'start']];
  cols.forEach(c=>{ s+=txt(c[1],thY,c[0],{size:11,w:600,fill:P.muted,ls:0.5,anchor:c[2]}); });
  const rows=[
    ['bytom','Dworcowa 5/18','mieszkalny','18.06.2026','12.06.2026','82 500 zł','1 038 zł/m²',3],
    ['gliwice','Zygmunta Starego 29/4','mieszkalny','24.06.2026','19.06.2026','461 430 zł','5 316 zł/m²',2],
    ['katowice','Mariacka 12/5','mieszkalny','20.06.2026','13.06.2026','318 000 zł','5 196 zł/m²',2],
    ['rybnik','A. Zgrzebnioka 7B/6','mieszkalny','25.06.2026','18.06.2026','180 000 zł','5 143 zł/m²',1],
    ['sosnowiec','Kaliskiej 14A/2','mieszkalny','23.06.2026','16.06.2026','241 250 zł','5 000 zł/m²',1],
    ['zabrze','Wolności 284/3','mieszkalny','19.06.2026','11.06.2026','149 000 zł','2 759 zł/m²',1],
    ['gliwice','Kościuszki 8/2','mieszkalny','30.06.2026','24.06.2026','198 000 zł','4 681 zł/m²',1],
    ['zabrze','3 Maja 17/9','mieszkalny','26.06.2026','19.06.2026','171 000 zł','2 522 zł/m²',2],
  ];
  let ry=thY+20; const RH=68;
  rows.forEach((r,i)=>{
    const id=r[0],addr=r[1],kind=r[2],wad=r[3],ogl=r[4],price=r[5],perm=r[6],round=r[7];
    const top=ry, mid=top+RH/2;
    if(i%2) s+=box(PADX-6,top,pw-40,RH,{fill:P.bgElev});
    s+=txt(PADX+2,mid+6,i<2?'★':'☆',{size:16,fill:i<2?'#e9c95a':'#d1d5db'});
    s+=tagOnly(PADX+34,mid-8.5,id);
    s+=txt(PADX+34+tagW(id)+8,mid+5,addr,{size:13,w:600});
    s+=txt(PADX+360,mid+5,kind,{size:13,fill:P.fg});
    s+=txt(PADX+470,mid-4,'WADIUM',{size:10,fill:P.muted,ls:0.4})+txt(PADX+532,mid-4,wad,{size:12});
    s+=txt(PADX+470,mid+14,'OGLĘDZINY',{size:10,fill:P.muted,ls:0.4})+txt(PADX+532,mid+14,ogl,{size:12});
    s+=txt(PADX+690,mid+5,price,{size:13,w:600,anchor:'end'});
    s+=txt(PADX+810,mid+5,perm,{size:12,w:600,fill:P.perm2,anchor:'end'});
    if(round===1) s+=txt(PADX+900,mid+5,'nowa',{size:13,w:600,fill:P.greenFg});
    else s+=txt(PADX+900,mid+5,round+'. przetarg',{size:13,w:600,fill:P.amberFg});
    s+=box(PADX-6,top+RH,pw-40,1,{fill:P.border});
    ry+=RH;
  });
  const fy=py+ph-22;
  s+=txt(PADX,fy,'dane: publiczne BIP-y miast · 6 miast',{size:11,fill:P.muted});
  s+=txt(px+pw-26,fy,'v1.11.1   repozytorium',{size:11,fill:P.muted,anchor:'end'});
  const defs='<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#1a2230" flood-opacity="0.18"/></filter></defs>';
  return svg(defs+s,'#dde3ec');
}

/* 3) ARCHIVE */
function shotArchive(){
  let s='';
  s+=box(0,0,W,H,{fill:P.bg});
  const M=32;
  s+=txt(M,46,'Archiwum aukcji — przetargimiejskie',{size:22,w:700});
  let bx=W-M;
  const btn=(label,w,opt)=>{opt=opt||{};bx-=w;const r=box(bx,28,w,30,{r:4,fill:P.bg,stroke:P.border})+txt(bx+w/2,48,label,{size:13,fill:opt.fg||P.accent,w:opt.w||400,anchor:'middle'});bx-=8;return r;};
  s+=btn('PL',44,{w:600}); s+=btn('☀',38);
  s+=txt(M,70,'Dane od 2019-03 do 2026-06 · ostatnie odświeżenie: dziś 06:00',{size:12,fill:P.muted});
  const tiles=[
    ['mieszkalny','614','882 rozpatrzonych · 76 sprzedanych (Gliwice)','4 920 zł/m²','mediana wyw.'],
    ['użytkowy','198','141 w archiwum','3 180 zł/m²','mediana wyw.'],
    ['garaż','37','29 w archiwum','1 240 zł/m²','mediana wyw.'],
  ];
  const tw=(W-2*M-2*12)/3; let tx=M; const tyTile=88;
  tiles.forEach(t=>{
    s+=box(tx,tyTile,tw,96,{r:8,fill:P.tile,stroke:P.border});
    s+=txt(tx+16,tyTile+26,t[0],{size:14,w:600});
    s+=txt(tx+16,tyTile+54,t[1],{size:20,w:700})+txt(tx+16+t[1].length*12+8,tyTile+54,'nieruchomości',{size:12,fill:P.muted});
    s+=txt(tx+16,tyTile+74,t[2],{size:11,fill:P.muted});
    s+=txt(tx+tw-16,tyTile+54,t[3],{size:15,w:700,fill:P.accent,anchor:'end'})+txt(tx+tw-16,tyTile+74,t[4],{size:11,fill:P.muted,anchor:'end'});
    tx+=tw+12;
  });
  const fy=200; s+=box(M,fy,W-2*M,56,{r:8,fill:P.tile,stroke:P.border});
  const sel=(x,lab,val,w)=>txt(x,fy+20,lab,{size:11,fill:P.muted,ls:0.4})+box(x,fy+26,w,22,{r:4,fill:P.bg,stroke:P.border})+txt(x+8,fy+41,val,{size:12})+txt(x+w-16,fy+41,'▾',{size:10,fill:P.muted});
  let fx=M+14;
  [['MIASTO','Wszystkie',150],['TYP','mieszkalny',150],['WYNIK','Wszystkie',150],['ROCZNIK','Wszystkie lata',160]].forEach(f=>{s+=sel(fx,f[0],f[1],f[2]);fx+=f[2]+14;});
  s+=txt(fx,fy+20,'SZUKAJ',{size:11,fill:P.muted,ls:0.4})+box(fx,fy+26,200,22,{r:4,fill:P.bg,stroke:P.border})+txt(fx+8,fy+41,'ulica…',{size:12,fill:P.muted});
  s+=txt(W-M-14,fy+41,'882 wyników',{size:12,fill:P.muted,anchor:'end'});
  const ty=288;
  const cols=[['DATA',M],['NIERUCHOMOŚĆ',M+96],['TYP',M+430],['RUNDA',M+520],['POWIERZCHNIA',M+600],['CENA WYWOŁAWCZA',M+730],['FINAL',M+910],['ZŁ/M²',M+1010],['WYNIK',M+1090]];
  s+=box(M,ty+8,W-2*M,1,{fill:P.border});
  cols.forEach(c=>s+=txt(c[1],ty,c[0],{size:11,w:600,fill:P.muted,ls:0.4}));
  const data=[
    ['gliwice','Zygmunta Starego 29/4','mieszkalny','2.','86,79 m²','461 430 zł','—','5 316','w archiwum','12.05.2026',0],
    ['gliwice','Kościuszki 8/2','mieszkalny','1.','42,3 m²','198 000 zł','201 500 zł','4 681','sprzedano','03.03.2026',1],
    ['katowice','Mariacka 12/5','mieszkalny','2.','61,2 m²','318 000 zł','—','5 196','w archiwum','28.04.2026',0],
    ['zabrze','Wolności 284/3','mieszkalny','1.','54,0 m²','149 000 zł','—','2 759','w archiwum','19.05.2026',0],
    ['zabrze','3 Maja 17/9','mieszkalny','2.','67,8 m²','171 000 zł','—','2 522','w archiwum','11.04.2026',0],
    ['bytom','Dworcowa 5/18','mieszkalny','3.','79,5 m²','82 500 zł','—','1 038','w archiwum','22.06.2026',0],
    ['rybnik','A. Zgrzebnioka 7B/6','mieszkalny','1.','35,0 m²','180 000 zł','—','5 143','w archiwum','30.06.2026',0],
    ['sosnowiec','Kaliskiej 14A/2','mieszkalny','1.','48,25 m²','241 250 zł','—','5 000','w archiwum','30.06.2026',0],
    ['gliwice','Barlickiego 3/7','mieszkalny','1.','55,1 m²','233 000 zł','248 000 zł','4 501','sprzedano','17.02.2026',1],
    ['katowice','Warszawska 40/2','mieszkalny','1.','48,9 m²','266 000 zł','—','5 440','w archiwum','05.05.2026',0],
    ['zabrze','Brygadzistów 12/4','mieszkalny','2.','60,5 m²','139 000 zł','—','2 298','w archiwum','29.04.2026',0],
  ];
  let dy=ty+16; const RH=40;
  data.forEach((d,i)=>{
    const id=d[0],addr=d[1],kind=d[2],round=d[3],area=d[4],price=d[5],final=d[6],perm=d[7],out=d[8],date=d[9],sold=d[10];
    const top=dy, mid=top+RH/2+4;
    if(i%2) s+=box(M,top,W-2*M,RH,{fill:P.rowHover});
    const rowFg = sold ? P.greenFg : P.fg;
    s+=txt(M,mid,date,{size:12,fill:sold?P.greenFg:P.muted});
    s+=tagOnly(M+96,mid-13,id);
    s+=txt(M+96+tagW(id)+8,mid,addr,{size:12.5,w:600,fill:rowFg});
    s+=txt(M+430,mid,kind,{size:12,fill:rowFg});
    s+=txt(M+520,mid,round,{size:12,fill:rowFg});
    s+=txt(M+600,mid,area,{size:12,fill:rowFg});
    s+=txt(M+730,mid,price,{size:12,fill:rowFg});
    s+=txt(M+910,mid,final,{size:12,fill:sold?P.greenFg:P.muted});
    s+=txt(M+1010,mid,perm,{size:12,fill:rowFg});
    s+=txt(M+1090,mid,out,{size:12,w:600,fill:sold?P.greenFg:P.muted});
    s+=box(M,top+RH,W-2*M,1,{fill:P.border});
    dy+=RH;
  });
  return svg(s,P.bg);
}

const out=[
  ['01-on-page-chip.svg', shotOnPage()],
  ['02-popup-all-cities.svg', shotPopup()],
  ['03-web-archive.svg', shotArchive()],
];
for(const o of out){ fs.writeFileSync(__dirname+'/'+o[0], o[1]); console.log('wrote',o[0]); }
