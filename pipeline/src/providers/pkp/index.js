import { crawlPkp } from './crawl.js';

export const pkpProvider = {
  id: 'pkp',
  label: 'PKP S.A.',
  seller_type: 'state_company',
  host: 'www.pkp.pl',
  source_url: 'https://www.pkp.pl/pl/nieruchomosci-przetargi?menu=2',
  minimum_fresh_rows: 50,
  crawl: crawlPkp,
};
