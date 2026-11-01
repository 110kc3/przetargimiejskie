import { makeSmartSiteCity } from '../../core/smartsite-bip.js';

export const choroszcz = makeSmartSiteCity({
  id: 'choroszcz',
  teryt: '2002014',
  name: 'Choroszcz',
  label: 'Choroszcz',
  voivodeship: 'podlaskie',
  authority: 'Prezydent Miasta Choroszcz',
  host: 'bip.choroszcz.pl',
  origin: 'https://bip.choroszcz.pl',
});

export default choroszcz;
