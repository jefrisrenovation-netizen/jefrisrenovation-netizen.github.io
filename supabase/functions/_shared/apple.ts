import {Buffer} from "node:buffer";
import {SignedDataVerifier,Environment} from "npm:@apple/app-store-server-library@3.1.0";
import {createClient} from "npm:@supabase/supabase-js@2.117.3";
import {roots} from "./apple-roots.ts";
import {BUNDLE_ID,APP_ID,billingStatus,transactionRecord} from "./billing.mjs";
export const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
export const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers});
export const admin=()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const certificates=roots.map(value=>Buffer.from(value,'base64'));
const production=new SignedDataVerifier(certificates,true,Environment.PRODUCTION,BUNDLE_ID,APP_ID);
const sandbox=new SignedDataVerifier(certificates,true,Environment.SANDBOX,BUNDLE_ID);
export async function verifyTransaction(jws:string){
 try{return await production.verifyAndDecodeTransaction(jws)}
 catch{return await sandbox.verifyAndDecodeTransaction(jws)}
}
export async function verifyNotification(jws:string){
 try{return await production.verifyAndDecodeNotification(jws)}
 catch{return await sandbox.verifyAndDecodeNotification(jws)}
}
export async function recordTransaction(db:any,tx:any,owner:string){
 const record=transactionRecord(tx,owner);
 const {error}=await db.rpc('record_apple_subscription',{record});
 if(error)throw new Error('Cannot save verified purchase');
}
export async function status(db:any,owner:string){
 const enrolled=await db.from('billing_accounts').upsert({owner_id:owner},{onConflict:'owner_id',ignoreDuplicates:true});
 if(enrolled.error)throw new Error('Cannot register account');
 const [a,c,s]=await Promise.all([
  db.from('billing_accounts').select('enrolled_at').eq('owner_id',owner).single(),
  db.from('billing_config').select('launch_at,allow_sandbox').eq('id',true).single(),
  db.from('apple_subscriptions').select('expires_at,revoked_at,environment').eq('owner_id',owner).is('revoked_at',null).order('expires_at',{ascending:false})
 ]);
 if(a.error||c.error||s.error)throw new Error('Cannot check access');
 const entitlement=s.data.find((e:any)=>e.environment==='Production'||c.data.allow_sandbox);
 return billingStatus(a.data,c.data,entitlement);
}
