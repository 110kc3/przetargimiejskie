export const CITY_ID = 'piaseczno';
export const CITY_NAME = 'Piaseczno';
export const TERYT = '1418044';
export const BASE_URL = 'https://piaseczno.eu';
export const CATEGORY_URL = 'https://piaseczno.eu/category/nieruchomosci';
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
  voivodeship: "mazowieckie",
  authority: "Burmistrz Miasta i Gminy Piaseczno",
  host: "piaseczno.eu",
  source: "html",
};
