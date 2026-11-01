export const CITY_ID = 'tarnow';
export const CITY_NAME = 'Tarnów';
export const TERYT = '1263011';
export const BASE_URL = 'https://www.tarnow.pl';
export const HARMONOGRAM_URL = 'https://www.tarnow.pl/Dla-firm-i-inwestorow/Wsparcie-dla-inwestora/Aktualny-harmonogram-sprzedazy-nieruchomosci-nalezacych-do-Gminy-Miasta-Tarnowa';

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
  voivodeship: "malopolskie",
  authority: "Prezydent Miasta Tarnowa",
  host: "www.tarnow.pl",
  source: "html",
};
