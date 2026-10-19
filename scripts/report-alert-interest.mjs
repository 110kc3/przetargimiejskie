// Read an owner-supplied, private register of actually received voluntary e-mails.
// Never infer signups or people from page views, requests or mailto clicks.
import{readFileSync}from'node:fs';import{pathToFileURL}from'node:url';
export function validationGate(entries,start){
 const begin=Date.parse(start),end=begin+30*864e5;if(!Number.isFinite(begin))throw Error('A real deployment/start date is required');
 const contacts=new Map();
 for(const row of entries){
  const date=Date.parse(row.received_at);
  if(row.source!=='received_email'||row.voluntary!==true||!Number.isFinite(date)||date<begin||date>=end)continue;
  if(!/^[a-zA-Z0-9_-]{8,128}$/.test(row.contact_id||''))throw Error('Use stable opaque contact ids, never e-mail addresses');
  contacts.set(row.contact_id,(contacts.get(row.contact_id)||false)||row.willingness_to_pay===true);
 }
 const interested=contacts.size,willing=[...contacts.values()].filter(Boolean).length;
 return{window_start:new Date(begin).toISOString(),window_end:new Date(end).toISOString(),confirmed_interested_contacts:interested,confirmed_willing_to_pay_contacts:willing,gate_met:interested>=10&&willing>=3,revenue:'not measured',page_views_are_signups:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const[file,start]=process.argv.slice(2);if(!file||!start)throw Error('Usage: node scripts/report-alert-interest.mjs PRIVATE_REGISTER.json REAL_START_DATE');
 console.log(JSON.stringify(validationGate(JSON.parse(readFileSync(file,'utf8')),start),null,2));
}
