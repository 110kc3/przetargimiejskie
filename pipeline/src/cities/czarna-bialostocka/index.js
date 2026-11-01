import { makeSmartSiteCity } from '../../core/smartsite-bip.js';

export const czarnaBialostocka = makeSmartSiteCity({
  id: 'czarna-bialostocka',
  teryt: '2002024',
  name: 'Czarna Białostocka',
  label: 'Czarna Białostocka',
  voivodeship: 'podlaskie',
  authority: 'Prezydent Miasta Czarna Białostocka',
  host: 'bip-umczarnabialostocka.podlaskie.eu',
  origin: 'https://bip-umczarnabialostocka.podlaskie.eu',
});

export default czarnaBialostocka;
