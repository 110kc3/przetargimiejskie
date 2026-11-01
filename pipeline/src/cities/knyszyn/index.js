import { makeSmartSiteCity } from '../../core/smartsite-bip.js';

export const knyszyn = makeSmartSiteCity({
  id: 'knyszyn',
  teryt: '2008044',
  name: 'Knyszyn',
  label: 'Knyszyn',
  voivodeship: 'podlaskie',
  authority: 'Prezydent Miasta Knyszyn',
  host: 'bip-umknyszyn.podlaskie.eu',
  origin: 'https://bip-umknyszyn.podlaskie.eu',
});

export default knyszyn;
