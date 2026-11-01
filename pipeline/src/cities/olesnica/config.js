export const CITY_ID = 'olesnica';
export const CITY_NAME = 'Oleśnica';
export const TERYT = '0214011';
export const BASE_URL = 'https://www.olesnica.pl';
export const BOARD_URL = 'https://www.olesnica.pl/urzad/ogloszenia-burmistrza';
export const MAX_PAGES = 5;

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
  voivodeship: "dolnoslaskie",
  authority: "Burmistrz Miasta Oleśnicy",
  host: "www.olesnica.pl",
  source: "html",
};
