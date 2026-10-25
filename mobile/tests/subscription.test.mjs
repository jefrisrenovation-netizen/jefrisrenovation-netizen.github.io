import test from 'node:test';
import assert from 'node:assert/strict';
import {billingStatus,transactionRecord,PRODUCT_ID,BUNDLE_ID} from '../../supabase/functions/_shared/billing.mjs';
const account={enrolled_at:'2027-01-15T12:00:00Z'};
const config={launch_at:'2026-10-31T12:00:00Z'};
test('promotion starts only with a configured launch and spans three calendar months',()=>{
 assert.equal(billingStatus(account,{launch_at:null},null).phase,'prelaunch');
 assert.equal(billingStatus(account,config,null,Date.parse('2027-01-31T11:59:59Z')).phase,'promotion');
 const result=billingStatus(account,config,null,Date.parse('2027-01-31T12:00:00Z'));
 assert.equal(result.phase,'trial');assert.equal(result.access_until,'2027-02-20T12:00:00.000Z');
});
test('late accounts get twenty days and expiry is exclusive',()=>{
 const late={enrolled_at:'2027-03-01T00:00:00Z'};
 assert.equal(billingStatus(late,config,null,Date.parse('2027-03-20T23:59:59Z')).can_write,true);
 assert.equal(billingStatus(late,config,null,Date.parse('2027-03-21T00:00:00Z')).can_write,false);
});
test('expired or revoked purchases cannot unlock edits',()=>{
 const now=Date.parse('2027-04-01T00:00:00Z');
 const valid={expires_at:'2027-05-01T00:00:00Z',revoked_at:null};
 assert.equal(billingStatus(account,config,valid,now).phase,'subscribed');
 assert.equal(billingStatus(account,config,{...valid,revoked_at:'2027-03-30T00:00:00Z'},now).can_write,false);
 assert.equal(billingStatus(account,config,{...valid,expires_at:'2027-04-01T00:00:00Z'},now).can_write,false);
});
test('verified transaction still must match product, bundle and signed account token',()=>{
 const tx={productId:PRODUCT_ID,bundleId:BUNDLE_ID,appAccountToken:'ABC',originalTransactionId:'1',transactionId:'2',expiresDate:1800000000000,signedDate:1700000000000,environment:'Production'};
 assert.equal(transactionRecord(tx,'abc').transaction_id,'2');
 for(const patch of [{appAccountToken:'other'},{productId:'other'},{bundleId:'other'},{expiresDate:null},{environment:'Xcode'}])assert.throws(()=>transactionRecord({...tx,...patch},'abc'));
});
import {subscriptionController} from '../src/subscriptions.mjs';
function controller(overrides={}){
 let current='account-a';const finished=[],statuses=[];
 const store={purchase:async()=>({status:'purchased',jws:'signed'}),restore:async()=>({receipts:['signed']}),finish:async x=>finished.push(x)};
 const billing=subscriptionController({store,owner:()=>current,invoke:async body=>body.jws?{transaction_id:'42',can_write:true,phase:'subscribed'}:{can_write:false,phase:'expired'},onStatus:s=>statuses.push(s),...overrides});
 return {billing,store,finished,statuses,switchOwner:()=>current='account-b'};
}
test('Apple purchase is finished only after server verification succeeds',async()=>{
 const good=controller();await good.billing.purchase();assert.equal(good.finished[0].transactionId,'42');
 const bad=controller({invoke:async()=>{throw new Error('offline')}});
 await assert.rejects(bad.billing.purchase());assert.equal(bad.finished.length,0);
});
test('cancelled and pending purchases grant no access and can be retried',async()=>{
 for(const status of ['cancelled','pending']){
  const c=controller();c.store.purchase=async()=>({status});
  assert.equal((await c.billing.purchase()).status,status);assert.equal(c.finished.length,0);assert.equal(c.statuses.length,0);
 }
});
test('switching account while purchase is pending never assigns it to the new account',async()=>{
 const c=controller();c.store.purchase=async()=>{c.switchOwner();return {status:'purchased',jws:'signed'}};
 await assert.rejects(c.billing.purchase(),/Account changed/);assert.equal(c.finished.length,0);
});
test('restoration validates signed purchases and does not manufacture access without receipts',async()=>{
 const c=controller();await c.billing.restore();assert.equal(c.finished.length,1);
 const empty=controller();empty.store.restore=async()=>({receipts:[]});await empty.billing.restore();assert.equal(empty.finished.length,0);assert.equal(empty.statuses[0].can_write,false);
});
