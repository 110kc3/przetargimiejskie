export const CITY_ID = 'zyrardow';
export const CITY_NAME = 'Żyrardów';
export const TERYT = '1438011';
export const BASE_URL = 'https://www.bip.zyrardow.pl';
export const MENU_ROOT_ID = 4914;

export const FETCH_OPTS = {
  timeoutMs: 25000,
  retries: 3,
  retryDelayMs: 1500,
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
};

export const config = {
  id: CITY_ID,
  teryt: TERYT,
  label: CITY_NAME,
  voivodeship: "mazowieckie",
  authority: "Prezydent Miasta Żyrardowa",
  host: "bip.zyrardow.pl",
  source: "html",
};
