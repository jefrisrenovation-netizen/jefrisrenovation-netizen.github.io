import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
const uuid=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
async function locate(params:Record<string,string>){
 const url=new URL('https://geo.api.vlaanderen.be/geolocation/v2/Location');
 url.search=new URLSearchParams(params).toString();
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(8500)});
  if(!response.ok)return null;
  const data=await response.json();
  const place=data.LocationResult?.[0];
  const lat=place?.Location?.Lat_WGS84,lon=place?.Location?.Lon_WGS84;
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||typeof place?.FormattedAddress!=='string')return null;
  return {lat,lon,address:place.FormattedAddress.trim().slice(0,400),type:place.LocationType};
 }catch{return null;}
}
const radians=(degrees:number)=>degrees*Math.PI/180;
function distance(a:{lat:number,lon:number},b:{lat:number,lon:number}){
 const h=Math.sin(radians(b.lat-a.lat)/2)**2+Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(radians(b.lon-a.lon)/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
}
Deno.serve(async(req:Request)=>{
 const receivedAt=new Date().toISOString();
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
 const bearer=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!bearer)return reply(401,{error:'authentication_required'});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const identity=await admin.auth.getUser(bearer);
  if(identity.error||!identity.data.user)return reply(401,{error:'authentication_required'});
  const user=identity.data.user;
  const raw=await req.text();
  if(raw.length>5000)return reply(413,{error:'request_too_large'});
  const body=JSON.parse(raw);
  const action=body?.action;
  if(!['gps_mode','gps_modes','gps_configure','gps_history','gps_record'].includes(action))return reply(400,{error:'check'});
  const rate=await admin.rpc('consume_team_rate_limit',{p_key:'gps:'+user.id+':'+action,p_limit:120});
  if(rate.error)throw rate.error;
  if(!rate.data)return reply(429,{error:'try_later'});
  const membership=await admin.from('team_accounts').select('id,owner_id,employee_id,enabled,activated_at,gps_attendance').eq('user_id',user.id).maybeSingle();
  if(membership.error)throw membership.error;
  const account=membership.data;
  if(action==='gps_mode'){
   return reply(200,{enabled:!!(account?.enabled&&account.activated_at&&account.gps_attendance)});
  }
  if(action==='gps_modes'){
   if(account)return reply(403,{error:'access_denied'});
   const results=await admin.from('team_accounts').select('employee_id').eq('owner_id',user.id).eq('gps_attendance',true);
   if(results.error)throw results.error;
   return reply(200,{employees:results.data.map(row=>row.employee_id)});
  }
  if(action==='gps_configure'){
   if(account||!uuid(body.employee_id)||typeof body.enabled!=='boolean')return reply(403,{error:'access_denied'});
   const result=await admin.from('team_accounts').update({gps_attendance:body.enabled})
    .eq('owner_id',user.id).eq('employee_id',body.employee_id).eq('enabled',true).select('id').maybeSingle();
   if(result.error)throw result.error;
   if(!result.data)return reply(403,{error:'access_denied'});
   return reply(200,{enabled:body.enabled});
  }
  if(!account&&!uuid(body.employee_id))return reply(403,{error:'access_denied'});
   let accountId=account?.id;
   if(account){
    if(!account.activated_at||!account.enabled||!account.gps_attendance)return reply(403,{error:'access_denied'});
    const employee=await admin.from('employees').select('active').eq('id',account.employee_id).eq('owner_id',account.owner_id).single();
    if(employee.error||!employee.data?.active)return reply(403,{error:'access_blocked'});
   }else{
    if(action!=='gps_history')return reply(403,{error:'access_denied'});
    const target=await admin.from('team_accounts').select('id').eq('owner_id',user.id).eq('employee_id',String(body.employee_id)).maybeSingle();
    if(target.error)throw target.error;
    accountId=target.data?.id;
    if(!accountId)return reply(200,{records:[]});
   }
   if(action==='gps_history'){
    const result=await admin.from('gps_attendance').select('kind,recorded_at,address,site_name,accuracy,needs_review').eq('account_id',accountId).order('recorded_at',{ascending:false}).limit(100);
    if(result.error)throw result.error;
    return reply(200,{records:result.data});
   }

   if(!['entry','exit'].includes(body.kind)||typeof body.id!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(body.id)){
    return reply(400,{error:'check'});
   }
   const position=body.position;
   if(position!==null&&(!position||!Number.isFinite(position.lat)||Math.abs(position.lat)>90||
      !Number.isFinite(position.lon)||Math.abs(position.lon)>180||
      !Number.isFinite(position.accuracy)||position.accuracy<0))return reply(400,{error:'check'});
   let site=null;
   if(body.site_id){
    const result=await admin.from('work_sites').select('name,address').eq('id',String(body.site_id))
     .eq('owner_id',account.owner_id).eq('active',true).maybeSingle();
    if(result.error)throw result.error;
    if(!result.data)return reply(400,{error:'check'});
    site=result.data;
   }
   const [observed,expected]=await Promise.all([
    position?locate({latlon:position.lat+','+position.lon}):null,
    position&&site?.address?locate({q:site.address}):null
   ]);
   const address=observed?.address??null;
   const verified=!!(position&&position.accuracy<=100&&observed&&expected&&expected.type?.endsWith("_huisnummer")&&distance(position,expected)<=100);
   const result=await admin.rpc('record_gps_attendance',{
    p_user:user.id,p_id:body.id,p_kind:body.kind,p_time:receivedAt,
    p_lat:position?.lat??null,p_lon:position?.lon??null,p_accuracy:position?.accuracy??null,p_address:address,p_site_name:site?.name??null,p_verified:verified
   });
   if(result.error)throw result.error;
   if(!result.data?.id)return reply(409,{error:'gps_retry'});
   return reply(200,{saved:true});

 }catch(error){
  if(error instanceof SyntaxError)return reply(400,{error:'check'});
  return reply(500,{error:'request_failed'});
 }
});
