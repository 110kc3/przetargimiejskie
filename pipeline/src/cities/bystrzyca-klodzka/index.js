import { makeSystemDoBipCity } from '../../core/systemdobip.js';

export const bystrzycaKlodzka = makeSystemDoBipCity({
  id: 'bystrzyca-klodzka',
  teryt: '0208064',
  label: 'Bystrzyca Kłodzka',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Bystrzyca Kłodzka',
  host: 'bip.bystrzycaklodzka.pl',
  origin: 'https://bip.bystrzycaklodzka.pl',
  boardId: 361,
});

export default bystrzycaKlodzka;
