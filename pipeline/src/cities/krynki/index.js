import { makeSmartSiteCity } from '../../core/smartsite-bip.js';

export const krynki = makeSmartSiteCity({
  id: 'krynki',
  teryt: '2011044',
  name: 'Krynki',
  label: 'Krynki',
  voivodeship: 'podlaskie',
  authority: 'Prezydent Miasta Krynki',
  host: 'bip-umkrynki.podlaskie.eu',
  origin: 'https://bip-umkrynki.podlaskie.eu',
});

export default krynki;
