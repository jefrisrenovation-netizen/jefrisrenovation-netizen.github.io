import {admin,headers,reply,status,verifyTransaction,recordTransaction} from '../_shared/apple.ts';
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{message:'Method not allowed'});
 const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return reply(401,{message:'Authentication required'});
 const db=admin();const {data,error}=await db.auth.getUser(token);
 if(error||!data.user)return reply(401,{message:'Authentication required'});
 try{
  const body=await req.json();
  let transactionId;
  if(body.jws!==undefined){
   if(typeof body.jws!=='string'||body.jws.length>25000)return reply(400,{message:'Invalid purchase'});
   const tx=await verifyTransaction(body.jws);
   await recordTransaction(db,tx,data.user.id);transactionId=tx.transactionId;
  }
  return reply(200,{...await status(db,data.user.id),transaction_id:transactionId});
 }catch{return reply(400,{message:'Cannot verify access or purchase'});}
});
