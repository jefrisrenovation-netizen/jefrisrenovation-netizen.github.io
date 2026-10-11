import {admin,reply,verifyNotification,verifyTransaction,recordTransaction} from '../_shared/apple.ts';
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return reply(405,{message:'Method not allowed'});
 try{
  const body=await req.json();
  if(typeof body.signedPayload!=='string'||body.signedPayload.length>100000)return reply(400,{message:'Invalid notification'});
  const event=await verifyNotification(body.signedPayload);
  if(event.notificationType==='TEST')return reply(200,{received:true});
  if(event.data?.signedTransactionInfo){
   const tx=await verifyTransaction(event.data.signedTransactionInfo);
   if(!tx.appAccountToken)return reply(400,{message:'Missing account token'});
   await recordTransaction(admin(),tx,tx.appAccountToken);
  }
  return reply(200,{received:true});
 }catch{return reply(400,{message:'Notification could not be verified'});}
});
