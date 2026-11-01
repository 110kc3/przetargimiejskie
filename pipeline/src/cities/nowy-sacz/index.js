// Nowy Sącz city adapter registration
import { CONFIG } from './config.js';
import { crawlActive, crawlResults } from './crawl.js';

export const nowySacz = {
  ...CONFIG,
  crawl: crawlActive,
  crawlActive,
  crawlResults,
};

export default nowySacz;
