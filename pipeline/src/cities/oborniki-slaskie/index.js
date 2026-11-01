import { makeMadkomCity } from '../../core/madkom-bip.js';

export const obornikiSlaskie = makeMadkomCity({
  id: 'oborniki-slaskie',
  teryt: '0220014',
  label: 'Oborniki Śląskie',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Oborniki Śląskie',
  host: 'bip.oborniki-slaskie.pl',
  origin: 'https://bip.oborniki-slaskie.pl',
  context: 'default',
});

export default obornikiSlaskie;
