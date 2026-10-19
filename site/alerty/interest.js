(function(){
 const KEY='auction-alert-interest:draft';
 const form=document.getElementById('interest-form');
 if(form)form.addEventListener('submit',event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const fields=new FormData(form);const values=Object.fromEntries(['city','kind','criteria','frequency','payment'].map(key=>[key,String(fields.get(key)||'').trim()]));
  const payment={yes:'Tak, rozważę płatną wersję. To deklaracja zainteresowania, nie zamówienie.',no:'Interesuje mnie tylko wersja bezpłatna.',unknown:'Jeszcze nie wiem.'};
  const body=`Dobrowolnie zgłaszam zainteresowanie planowanymi alertami o przetargach.\n\nObszar: ${values.city}\nRodzaj: ${values.kind}\nKryteria: ${values.criteria||'Nie podano'}\nCzęstotliwość: ${values.frequency}\nGotowość do zapłaty: ${payment[values.payment]||payment.unknown}\n\nProszę o odpowiedź dotyczącą tego zgłoszenia. Nie zapisuję się do newslettera i nie składam zamówienia.\n\nŹródło: formularz zainteresowania alertami przetargimiejskie.pl`;
  try{sessionStorage.setItem(KEY,body);location.assign('/alerty/zainteresowanie/');}catch{document.getElementById('form-status').textContent='Nie udało się przygotować szkicu w tej karcie. Napisz bezpośrednio na kontakt@przetargimiejskie.pl.';}
 });
 const draft=document.getElementById('email-draft');if(draft){
  let body;try{body=sessionStorage.getItem(KEY);}catch{}
  if(body){draft.href='mailto:kontakt@przetargimiejskie.pl?subject='+encodeURIComponent('Zainteresowanie alertami o przetargach')+'&body='+encodeURIComponent(body);document.getElementById('draft-preview').textContent=body;sessionStorage.removeItem(KEY);}
 }
})();
