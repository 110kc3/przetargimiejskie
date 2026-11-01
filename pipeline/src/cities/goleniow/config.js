export const CITY_ID = 'goleniow';
export const CITY_NAME = 'Goleniów';
export const TERYT = '3204024';
export const BASE_URL = 'https://bip.goleniow.pl';

export const BOARDS = [
  '/artykul/przetargi-miasto-i-gmina',
  '/artykul/przetargi-gpp',
];

export const FETCH_OPTS = {
  timeoutMs: 25000,
  retries: 3,
  retryDelayMs: 1500,
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
};

export const config = {
  id: CITY_ID,
  teryt: TERYT,
  label: CITY_NAME,
  voivodeship: "zachodniopomorskie",
  authority: "Burmistrz Gminy Goleniów",
  host: "bip.goleniow.pl",
  source: "html",
};
