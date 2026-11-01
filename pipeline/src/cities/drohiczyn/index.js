import { makeSmartSiteCity } from '../../core/smartsite-bip.js';

export const drohiczyn = makeSmartSiteCity({
  id: 'drohiczyn',
  teryt: '2010024',
  name: 'Drohiczyn',
  label: 'Drohiczyn',
  voivodeship: 'podlaskie',
  authority: 'Prezydent Miasta Drohiczyn',
  host: 'bip-umdrohiczyn.podlaskie.eu',
  origin: 'https://bip-umdrohiczyn.podlaskie.eu',
});

export default drohiczyn;
