// Polish locative ("w …") city names, shared by the SEO page generator and the
// B2G one-pager generator so the two can't drift apart.
//
// Fallback is a nominative apposition ("— <Label>"), which is grammatically safe
// for any unmapped city — a new city is never mis-declined, it just reads a
// little stiffer until someone adds it here.

export const CITY_LOC = {
  gliwice: 'w Gliwicach', katowice: 'w Katowicach', bytom: 'w Bytomiu', zabrze: 'w Zabrzu',
  sosnowiec: 'w Sosnowcu', rybnik: 'w Rybniku', bielsko: 'w Bielsku-Białej',
  myslowice: 'w Mysłowicach', swietochlowice: 'w Świętochłowicach',
  'tarnowskie-gory': 'w Tarnowskich Górach', raciborz: 'w Raciborzu', cieszyn: 'w Cieszynie',
  'kedzierzyn-kozle': 'w Kędzierzynie-Koźlu', krakow: 'w Krakowie', opole: 'w Opolu',
  legnica: 'w Legnicy', olsztyn: 'w Olsztynie', torun: 'w Toruniu', pabianice: 'w Pabianicach',
  lodz: 'w Łodzi', walbrzych: 'w Wałbrzychu', bialystok: 'w Białymstoku',
  szczecin: 'w Szczecinie', stargard: 'w Stargardzie', chelm: 'w Chełmie',
  braniewo: 'w Braniewie', bochnia: 'w Bochni', 'drawsko-pomorskie': 'w Drawsku Pomorskim',
  chelmno: 'w Chełmnie', bydgoszcz: 'w Bydgoszczy',
  'gorzow-wielkopolski': 'w Gorzowie Wielkopolskim', 'naklo-nad-notecia': 'w Nakle nad Notecią',
  namyslow: 'w Namysłowie', miedzyrzecz: 'w Międzyrzeczu', lubliniec: 'w Lublińcu',
  sandomierz: 'w Sandomierzu', proszowice: 'w Proszowicach', pszczyna: 'w Pszczynie',
  trzebnica: 'w Trzebnicy', 'sroda-wielkopolska': 'w Środzie Wielkopolskiej',
  szczecinek: 'w Szczecinku', zagan: 'w Żaganiu', 'lwowek-slaski': 'w Lwówku Śląskim',
  'zabkowice-slaskie': 'w Ząbkowicach Śląskich', 'jelenia-gora': 'w Jeleniej Górze',
  glubczyce: 'w Głubczycach', 'kamienna-gora': 'w Kamiennej Górze',
  'krosno-odrzanskie': 'w Krośnie Odrzańskim', wabrzezno: 'w Wąbrzeźnie', lebork: 'w Lęborku',
  wroclaw: 'we Wrocławiu', grudziadz: 'w Grudziądzu', plock: 'w Płocku', sopot: 'w Sopocie',
  'biala-podlaska': 'w Białej Podlaskiej', glogow: 'w Głogowie',
};

export const inCity = (city) => CITY_LOC[city.id] || `— ${city.label}`;
