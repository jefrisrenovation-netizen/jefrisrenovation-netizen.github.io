import {createClient} from "npm:@supabase/supabase-js@2.117.3";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const reply=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers});
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
  if(req.method!=="POST")return reply(405,"Method not allowed");
  const token=req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return reply(401,"Authentication required");
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await admin.auth.getUser(token);
  if(error||!data.user)return reply(401,"Authentication required");
  let body;
  try{body=await req.json()}catch{return reply(400,"Invalid confirmation")}
  if(typeof body.confirm_email!=="string"||body.confirm_email.trim().toLowerCase()!==data.user.email?.toLowerCase())return reply(400,"Email confirmation does not match");
  // The id comes only from the authenticated user. No request-supplied user id is accepted.
  const signedOut=await admin.auth.admin.signOut(token,"global");
  if(signedOut.error)return reply(503,"Please sign in again and retry");
  // Auth user deletion and database CASCADE run atomically in Postgres.
  const deleted=await admin.auth.admin.deleteUser(data.user.id);
  if(deleted.error)return reply(503,"Deletion failed. Please contact support");
  return reply(200,"Account deleted");
});