export const CITY_ID = 'gostynin';
export const CITY_NAME = 'Gostynin';
export const TERYT = '1404011';
export const BASE_URL = 'https://umgostynin.bip.org.pl';

export const BOARDS = [
  '/id/4667',
  '/id/2294',
];

export const FETCH_OPTS = {
  insecureTLS: true,
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
  authority: "Burmistrz Miasta Gostynina",
  host: "umgostynin.bip.org.pl",
  source: "html",
};
