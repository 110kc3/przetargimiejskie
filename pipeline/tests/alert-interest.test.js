import test from'node:test';import assert from'node:assert/strict';import{validationGate}from'../../scripts/report-alert-interest.mjs';
test('30-day demand gate counts only distinct voluntary received confirmations',()=>{
 const base=Array.from({length:10},(_,i)=>({source:'received_email',voluntary:true,contact_id:'opaque_0'+i,received_at:'2026-11-01T12:00:00Z',willingness_to_pay:i<3}));
 const report=validationGate([...base,...base,{...base[0],contact_id:'a_new_id',source:'page_view'},{...base[0],contact_id:'old_contact',received_at:'2025-01-01'},{...base[0],contact_id:'no_consent',voluntary:false}],'2026-10-19');
 assert.equal(report.confirmed_interested_contacts,10);assert.equal(report.confirmed_willing_to_pay_contacts,3);assert.equal(report.gate_met,true);assert.equal(report.page_views_are_signups,false);assert.equal(report.revenue,'not measured');
 assert.equal(validationGate(base.slice(0,9),'2026-10-19').gate_met,false);
 assert.throws(()=>validationGate([{...base[0],contact_id:'person@example.com'}],'2026-10-19'),/opaque/);
});
