import { makeSmartSiteCity } from '../../core/smartsite-bip.js';

export const tykocin = makeSmartSiteCity({
  id: 'tykocin',
  teryt: '2002124',
  name: 'Tykocin',
  label: 'Tykocin',
  voivodeship: 'podlaskie',
  authority: 'Prezydent Miasta Tykocin',
  host: 'bip-umtykocin.podlaskie.eu',
  origin: 'https://bip-umtykocin.podlaskie.eu',
});

export default tykocin;
