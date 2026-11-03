import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {username,monthRange,dayInput,phoneNumber} from './validation.ts';
const BASE='https://jefrisrenovation-netizen.github.io';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
const digest=async(s:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const authClient=()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const raw=await req.text();if(raw.length>10000)return reply(413,{error:'request_too_large'});
  const body=JSON.parse(raw),action=String(body.action||'');
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const limited=await admin.rpc('consume_team_rate_limit',{p_key:await digest(ip+':'+action),p_limit:action==='login'?120:action==='recover'?10:180});
  if(limited.error)throw limited.error;if(!limited.data)return reply(429,{error:'try_later'});
  if(action==='login'){
   const identifier=String(body.username||'').trim(),byPhone=/^[+0-9]/.test(identifier)&&/[+\s()-]/.test(identifier);
   const name=byPhone?phoneNumber(identifier):username(identifier),key=await digest(ip+':login:'+name);
   const rate=await admin.rpc('consume_team_rate_limit',{p_key:key,p_limit:15});if(rate.error)throw rate.error;if(!rate.data)return reply(429,{error:'try_later'});
   let lookup=admin.from('team_accounts').select('email,auth_email,user_id,enabled,activated_at,login_method');lookup=byPhone?lookup.eq('phone',name).eq('login_method','phone'):lookup.eq('username',name);
   const {data:account,error}=await lookup.maybeSingle();if(error)throw error;
   if(!account?.enabled||!account.user_id||!account.activated_at)return reply(401,{error:'invalid_credentials'});
   const result=await authClient().auth.signInWithPassword({email:account.auth_email||account.email,password:String(body.password||'')});
   if(result.error||!result.data.session||result.data.user.id!==account.user_id)return reply(401,{error:'invalid_credentials'});
   return reply(200,{session:result.data.session});
  }
  if(action==='recover'){
   let name;try{name=username(body.username)}catch{return reply(200,{sent:true})}
   const {data:account}=await admin.from('team_accounts').select('email,enabled').eq('username',name).maybeSingle();
   if(account?.enabled&&account.email)await authClient().auth.resetPasswordForEmail(account.email,{redirectTo:BASE+'/preview/'});
   return reply(200,{sent:true});
  }
  const token=typeof body.token==='string'?body.token:'';
  let invitation:any=null,invited:any=null;
  if(['invite_info','resolve_invite','claim_invite','redeem_phone'].includes(action)){
   if(!/^[a-f0-9]{64}$/.test(token))return reply(400,{error:'invalid_invite'});
   const {data,error}=await admin.from('team_invites').select('*').eq('token_hash',await digest(token)).is('used_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();if(error)throw error;
   if(!data)return reply(410,{error:'expired_invite'});invitation=data;
   const member=await admin.from('team_accounts').select('*').eq('id',data.account_id).eq('enabled',true).maybeSingle();if(member.error)throw member.error;invited=member.data;
   if(!invited)return reply(403,{error:'access_blocked'});
  }
  if(action==='redeem_phone'){
   if(invited.login_method!=='phone'||!invited.auth_email?.endsWith('@staff.suivi.invalid'))return reply(403,{error:'access_denied'});
   if((invitation.purpose==='reset'&&!invited.activated_at)||(invitation.purpose!=='reset'&&invited.activated_at))return reply(403,{error:'access_denied'});
   const password=String(body.password||'');if(password.length<8||password.length>128)return reply(400,{error:'invalid_password'});
   const employee=await admin.from('employees').select('active').eq('id',invited.employee_id).eq('owner_id',invited.owner_id).single();if(employee.error||!employee.data?.active)return reply(403,{error:'access_blocked'});
   // Consume atomically BEFORE changing a password: concurrent replays cannot reset it twice.
   const used=await admin.from('team_invites').update({used_at:new Date().toISOString()}).eq('token_hash',invitation.token_hash).is('used_at',null).gt('expires_at',new Date().toISOString()).select('token_hash');
   if(used.error)throw used.error;if(!used.data?.length)return reply(410,{error:'expired_invite'});
   if(invited.user_id){
    const existing=await admin.auth.admin.getUserById(invited.user_id);
    if(existing.error||existing.data.user?.email!==invited.auth_email||existing.data.user?.app_metadata?.team_phone_managed!==true)return reply(409,{error:'account_conflict'});
   }else{
    if(invitation.purpose==='reset')return reply(409,{error:'account_conflict'});
    const created=await admin.auth.admin.createUser({email:invited.auth_email,email_confirm:true,password:crypto.randomUUID()+crypto.randomUUID(),app_metadata:{team_phone_managed:true}});if(created.error||!created.data.user)throw created.error||Error('request_failed');
    invited.user_id=created.data.user.id;
   }
   const activated=await admin.from('team_accounts').update({user_id:invited.user_id,activated_at:new Date().toISOString()}).eq('id',invited.id).eq('enabled',true).select('id');if(activated.error)throw activated.error;if(!activated.data?.length)return reply(403,{error:'access_blocked'});
   await admin.from('team_invites').update({used_at:new Date().toISOString()}).eq('account_id',invited.id).is('used_at',null);
   const changed=await admin.auth.admin.updateUserById(invited.user_id,{password});if(changed.error)throw changed.error;
   const result=await authClient().auth.signInWithPassword({email:invited.auth_email,password});if(result.error||!result.data.session)return reply(400,{error:'request_failed'});
   return reply(200,{session:result.data.session});
  }
  if(action==='resolve_invite'||action==='invite_info'){
   const [employee,company]=await Promise.all([admin.from('employees').select('name,active').eq('id',invited.employee_id).eq('owner_id',invited.owner_id).single(),admin.from('app_profiles').select('company_name').eq('owner_id',invited.owner_id).maybeSingle()]);
   if(employee.error||!employee.data?.active)return reply(403,{error:'access_blocked'});
   let link:string|null=null;
   // Never issue magic links or recovery links for existing accounts: that would grant the inviter access.
   let confirmed=false;
   if(invited.user_id){const existing=await admin.auth.admin.getUserById(invited.user_id);confirmed=!!existing.data.user?.email_confirmed_at;}
   if(action==='resolve_invite'&&invited.login_method!=='phone'&&!confirmed&&!invited.activated_at){
    const redirectTo=body.native===true?'suiviheurespro://login':BASE+'/preview/';
    const generated=await admin.auth.admin.generateLink({type:'invite',email:invited.email,options:{redirectTo}});
    if(!generated.error&&generated.data.user&&generated.data.properties?.action_link){
     if(invited.user_id&&generated.data.user.id!==invited.user_id)return reply(409,{error:'account_conflict'});
     const linked=await admin.from('team_accounts').update({user_id:generated.data.user.id}).eq('id',invited.id).is('activated_at',null);if(linked.error)throw linked.error;
     link=generated.data.properties.action_link;
    }
   }
   return reply(200,{name:employee.data.name,company:company.data?.company_name||'Suivi des heures Pro',username:invited.username,login_method:invited.login_method||'email',purpose:invitation.purpose||'invite',activation_url:link});
  }
  const bearer=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!bearer)return reply(401,{error:'authentication_required'});
  const identity=await admin.auth.getUser(bearer);if(identity.error||!identity.data.user)return reply(401,{error:'authentication_required'});
  const user=identity.data.user;
  const membership=await admin.from('team_accounts').select('*').eq('user_id',user.id).maybeSingle();if(membership.error)throw membership.error;
  const account=membership.data;
  if(action==='claim_invite'){
   if(invited.login_method==='phone')return reply(403,{error:'access_denied'});
   if(!user.email_confirmed_at||user.email?.toLowerCase()!==invited.email)return reply(403,{error:'invite_email_mismatch'});
   if(invited.owner_id===user.id)return reply(400,{error:'cannot_invite_owner'});
   if(invited.user_id&&invited.user_id!==user.id)return reply(409,{error:'account_conflict'});
   const result=await admin.from('team_accounts').update({user_id:user.id,activated_at:new Date().toISOString()}).eq('id',invited.id).eq('enabled',true).or('user_id.is.null,user_id.eq.'+user.id).select('id');
   if(result.error)throw result.error;if(!result.data?.length)return reply(409,{error:'account_conflict'});
   const consumed=await admin.from('team_invites').update({used_at:new Date().toISOString()}).eq('token_hash',invitation.token_hash);if(consumed.error)throw consumed.error;
   return reply(200,{active:true});
  }
  if(action==='access'){
   if(!account)return reply(200,{role:'owner'});
   if(!account.enabled)return reply(200,{role:'blocked'});
   const employee=await admin.from('employees').select('id,name,active,default_entry_time,default_exit_time,default_break_minutes').eq('id',account.employee_id).eq('owner_id',account.owner_id).single();
   if(employee.error)return reply(503,{error:'employee_lookup_failed',code:employee.error.code});
   if(!employee.data?.active)return reply(200,{role:'blocked'});
   const company=await admin.from('app_profiles').select('company_name,language_code').eq('owner_id',account.owner_id).maybeSingle();
   return reply(200,{role:account.activated_at?'employee':'activation',employee:employee.data,company:company.data?.company_name||'Suivi des heures Pro',language:company.data?.language_code||'fr',username:account.username});
  }
  if(account&&!account.enabled)return reply(403,{error:'access_blocked'});
  if(action==='activate'){
   if(!account||account.login_method==='phone'||!user.email_confirmed_at||user.email?.toLowerCase()!==account.email)return reply(403,{error:'authentication_required'});
   const result=await admin.from('team_accounts').update({activated_at:new Date().toISOString()}).eq('id',account.id).eq('enabled',true);if(result.error)throw result.error;
   await admin.from('team_invites').update({used_at:new Date().toISOString()}).eq('account_id',account.id).is('used_at',null);
   return reply(200,{active:true});
  }
  // Employee requests cannot choose another employee or company: both IDs come from the verified membership.
  if(['my_days','save_my_day'].includes(action)){
   if(!account?.activated_at)return reply(403,{error:'access_denied'});
   const employee=await admin.from('employees').select('active').eq('id',account.employee_id).eq('owner_id',account.owner_id).single();
   if(employee.error||!employee.data.active)return reply(403,{error:'access_blocked'});
   if(action==='my_days'){
    const range=monthRange(body.month);
    const [days,sites]=await Promise.all([admin.from('work_days').select('id,work_date,entry_time,exit_time,break_minutes,workplace,notes,approval_status').eq('owner_id',account.owner_id).eq('employee_id',account.employee_id).gte('work_date',range.start).lte('work_date',range.end).order('work_date'),admin.from('work_sites').select('id,name,address').eq('owner_id',account.owner_id).eq('active',true).order('name')]);
    if(days.error||sites.error)throw days.error||sites.error;return reply(200,{days:days.data,sites:sites.data});
   }
   const payload={...dayInput(body),owner_id:account.owner_id,employee_id:account.employee_id,submitted_by:user.id,approval_status:'pending'};
   let result;
   if(body.id){result=await admin.from('work_days').update(payload).eq('id',String(body.id)).eq('owner_id',account.owner_id).eq('employee_id',account.employee_id).in('approval_status',['pending','rejected']).select('id');}
   else result=await admin.from('work_days').insert(payload).select('id');
   if(result.error?.code==='23505')return reply(409,{error:'date_exists'});if(result.error)throw result.error;if(!result.data?.length)return reply(403,{error:'approved_day_locked'});
   return reply(200,{saved:true});
  }
  // All remaining actions belong to owners. Staff never receive payroll or owner-level lists.
  if(account)return reply(403,{error:'owner_required'});
  if(action==='invite'){
   const employee=await admin.from('employees').select('id').eq('id',String(body.employee_id)).eq('owner_id',user.id).eq('active',true).single();if(employee.error)return reply(403,{error:'access_denied'});
   const name=username(body.username),email=String(body.email||'').trim().toLowerCase()||null,method=email?'email':'phone';
   const phone=method==='phone'?phoneNumber(body.phone):String(body.phone||'').trim().slice(0,40);
   if(email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||email===user.email?.toLowerCase()))return reply(400,{error:'invalid_email'});
   const previous=await admin.from('team_accounts').select('*').eq('employee_id',employee.data.id).maybeSingle();if(previous.error)throw previous.error;
   if(previous.data?.owner_id&&previous.data.owner_id!==user.id)return reply(403,{error:'access_denied'});
   if(previous.data?.user_id&&(previous.data.email!==email||(previous.data.login_method||'email')!==method||(method==='phone'&&previous.data.phone!==phone)))return reply(409,{error:'linked_email_locked'});
   const values={owner_id:user.id,employee_id:employee.data.id,username:name,email,phone,login_method:method,auth_email:method==='phone'?(previous.data?.auth_email||crypto.randomUUID()+'@staff.suivi.invalid'):null};
   const member=previous.data?await admin.from('team_accounts').update(values).eq('id',previous.data.id).select('*').single():await admin.from('team_accounts').insert(values).select('*').single();
   if(member.error?.code==='23505')return reply(409,{error:'username_taken'});if(member.error)throw member.error;if(!member.data.enabled)return reply(403,{error:'access_blocked'});
   if(member.data.activated_at&&method==='phone')return reply(409,{error:'use_reset'});
   await admin.from('team_invites').update({used_at:new Date().toISOString()}).eq('account_id',member.data.id).is('used_at',null);
   const bytes=crypto.getRandomValues(new Uint8Array(32)),token=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
   const saved=await admin.from('team_invites').insert({token_hash:await digest(token),account_id:member.data.id});if(saved.error)throw saved.error;
   return reply(200,{url:BASE+'/invite/#invite='+token,username:name,email,phone:values.phone});
  }
  if(action==='reset_phone'){
   const result=await admin.from('team_accounts').select('*').eq('id',String(body.id)).eq('owner_id',user.id).eq('login_method','phone').eq('enabled',true).single();
   if(result.error||!result.data?.user_id||!result.data.activated_at)return reply(403,{error:'access_denied'});
   await admin.from('team_invites').update({used_at:new Date().toISOString()}).eq('account_id',result.data.id).is('used_at',null);
   const token=[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');
   const saved=await admin.from('team_invites').insert({token_hash:await digest(token),account_id:result.data.id,purpose:'reset',expires_at:new Date(Date.now()+3600000).toISOString()});if(saved.error)throw saved.error;
   return reply(200,{url:BASE+'/invite/#invite='+token,username:result.data.username,email:null,phone:result.data.phone});
  }
  if(action==='members'){
   const result=await admin.from('team_accounts').select('id,employee_id,username,email,phone,enabled,activated_at,login_method').eq('owner_id',user.id);if(result.error)throw result.error;return reply(200,{members:result.data});
  }
  if(action==='set_access'){
   if(typeof body.enabled!=='boolean')return reply(400,{error:'invalid_request'});
   const result=await admin.from('team_accounts').update({enabled:body.enabled}).eq('id',String(body.id)).eq('owner_id',user.id).select('id');if(result.error)throw result.error;if(!result.data?.length)return reply(403,{error:'access_denied'});return reply(200,{saved:true});
  }
  if(action==='review_day'){
   if(!['approved','rejected'].includes(body.status))return reply(400,{error:'invalid_request'});
   const result=await admin.from('work_days').update({approval_status:body.status}).eq('id',String(body.id)).eq('owner_id',user.id).eq('approval_status','pending').select('id');if(result.error)throw result.error;if(!result.data?.length)return reply(409,{error:'day_changed'});return reply(200,{saved:true});
  }
  return reply(400,{error:'unknown_action'});
 }catch(error){
  const allowed=['invalid_phone','invalid_password','invalid_username','invalid_month','invalid_date','invalid_time','invalid_break'];
  return reply(400,{error:allowed.includes((error as Error)?.message)?(error as Error).message:'request_failed'});
 }
});
