import { makeSmartSiteCity } from '../../core/smartsite-bip.js';

export const nowogrod = makeSmartSiteCity({
  id: 'nowogrod',
  teryt: '2007044',
  name: 'Nowogród',
  label: 'Nowogród',
  voivodeship: 'podlaskie',
  authority: 'Prezydent Miasta Nowogród',
  host: 'bip-umnowogrod.podlaskie.eu',
  origin: 'https://bip-umnowogrod.podlaskie.eu',
});

export default nowogrod;
