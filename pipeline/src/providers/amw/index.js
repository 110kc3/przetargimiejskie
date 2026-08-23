import { crawlAmw } from './crawl.js';

export const amwProvider = {
  id: 'amw',
  label: 'Agencja Mienia Wojskowego',
  seller_type: 'state_agency',
  host: 'amw.com.pl',
  source_url: 'https://amw.com.pl/pl/nieruchomosci/przetargi-nieruchomosci',
  minimum_fresh_rows: 5,
  crawl: crawlAmw,
};
