import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {webcrypto} from 'node:crypto';
import {username,monthRange,dayInput,phoneNumber} from '../../supabase/functions/team-access/validation.ts';
const employee={id:'employee-a',name:'A',active:true};
const member={id:'member-a',owner_id:'company-a',employee_id:employee.id,user_id:'staff-a',username:'staff.a',email:'staff@example.invalid',enabled:true,activated_at:'2026-11-01'};
function handler(options={}){
 const queries=[];let captured;
 class Query{
  constructor(table){this.table=table;this.operations=[];queries.push(this)}
  select(...v){this.operations.push(['select',...v]);return this}eq(...v){this.operations.push(['eq',...v]);return this}is(...v){this.operations.push(['is',...v]);return this}gt(...v){this.operations.push(['gt',...v]);return this}gte(...v){this.operations.push(['gte',...v]);return this}lte(...v){this.operations.push(['lte',...v]);return this}order(...v){this.operations.push(['order',...v]);return this}in(...v){this.operations.push(['in',...v]);return this}or(...v){this.operations.push(['or',...v]);return this}insert(v){this.operations.push(['insert',v]);return this}update(v){this.operations.push(['update',v]);return this}
  result(){let data=this.table==='team_accounts'?(options.member===undefined?member:options.member):this.table==='employees'?employee:this.table==='app_profiles'?{company_name:'Company A',language_code:'fr'}:this.table==='work_sites'?[]:this.table==='team_invites'?(options.invite||null):[];
   if(this.table==='team_accounts'&&this.operations.some(o=>o[0]==='update'))data=[{id:'member-a'}];
   if(this.table==='team_invites'&&this.operations.some(o=>o[0]==='update'))data=options.used?[]:[{token_hash:'test'}];
   if(this.table==='work_days'&&this.operations.some(o=>o[0]==='insert'||o[0]==='update'))data=options.locked?[]:[{id:'day-a'}];
   return {data,error:null};}
  single(){return Promise.resolve(this.result())}maybeSingle(){return Promise.resolve(this.result())}then(ok,bad){return Promise.resolve(this.result()).then(ok,bad)}
 }
 const authChanges=[];
 const client={from:table=>new Query(table),rpc:async()=>({data:options.rate!==false,error:null}),auth:{getUser:async()=>options.unauthenticated?{data:{user:null},error:Error('denied')}:{data:{user:{id:options.userId||'staff-a',email:options.email||'staff@example.invalid',email_confirmed_at:'2026-11-01'}},error:null},admin:{getUserById:async()=>({data:{user:{email_confirmed_at:'2026-11-01'}}}),createUser:async()=>({data:{user:{id:'new-staff'}},error:null}),updateUserById:async(id,values)=>{authChanges.push({id,values});return {error:null}},generateLink:async()=>{throw Error('must not generate a link for existing accounts')}}}};
 client.auth.signInWithPassword=async input=>({data:{session:{access_token:'test-access',refresh_token:'test-refresh'}},error:null});
 const context={createClient:()=>client,username,monthRange,dayInput,phoneNumber,Request,Response,TextEncoder,Uint8Array,crypto:webcrypto,URL,Date,Deno:{env:{get:()=> 'test'},serve:fn=>{captured=fn}}};
 let code=fs.readFileSync('../supabase/functions/team-access/index.ts','utf8').replace(/^import .*;\n/gm,'');code=stripTypeScriptTypes(code);vm.createContext(context);vm.runInContext(code,context);
 return {queries,authChanges,call:async(body,authenticated=true)=>{const response=await captured(new Request('https://test.invalid/team-access',{method:'POST',headers:{'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer test-token'}:{})},body:JSON.stringify(body)}));return {status:response.status,data:await response.json()};}};
}
test('username and work day validation reject ambiguous identities and invalid dates',()=>{
 assert.equal(username(' Staff.Name '),'staff.name');for(const value of ['ab','../admin','with space','josé'])assert.throws(()=>username(value));
 assert.equal(monthRange('2028-02').end,'2028-02-29');assert.throws(()=>monthRange('2026-13'));
 assert.throws(()=>dayInput({work_date:'2026-02-31',entry_time:'08:00',exit_time:'17:30',break_minutes:30}));
 assert.throws(()=>dayInput({work_date:'2026-11-01',entry_time:'24:00',exit_time:'17:30',break_minutes:30}));
 assert.throws(()=>dayInput({work_date:'2026-11-01',entry_time:'08:00',exit_time:'17:30',break_minutes:-1}));
});
test('private actions require a verified authenticated identity',async()=>{
 for(const action of ['members','access','save_my_day','invite','review_day']){const api=handler();assert.equal((await api.call({action},false)).status,401);}
 const api=handler({unauthenticated:true});assert.equal((await api.call({action:'members'})).status,401);
});
test('employees cannot request payroll, approve days, invite staff or control accounts',async()=>{
 for(const action of ['members','invite','set_access','review_day','payroll']){const api=handler();const response=await api.call({action,owner_id:'company-b'});assert.equal(response.status,403);assert.equal(response.data.error,'owner_required');assert(!api.queries.some(q=>q.table==='monthly_payments'));}
});
test('employee work-day queries ignore requested company and employee IDs',async()=>{
 const api=handler();assert.equal((await api.call({action:'my_days',month:'2026-11',owner_id:'company-b',employee_id:'employee-b'})).status,200);
 const query=api.queries.find(q=>q.table==='work_days');assert(query.operations.some(o=>o[0]==='eq'&&o[1]==='owner_id'&&o[2]==='company-a'));assert(query.operations.some(o=>o[0]==='eq'&&o[1]==='employee_id'&&o[2]==='employee-a'));
 assert(!query.operations.some(o=>o.includes('company-b')||o.includes('employee-b')));
});
test('employee submissions always belong to the authenticated membership and await approval',async()=>{
 const api=handler();const response=await api.call({action:'save_my_day',work_date:'2026-11-01',entry_time:'08:00',exit_time:'17:30',break_minutes:30,workplace:'Forest',owner_id:'company-b',employee_id:'employee-b',approval_status:'approved'});assert.equal(response.status,200);
 const payload=api.queries.find(q=>q.table==='work_days').operations.find(o=>o[0]==='insert')[1];assert.equal(payload.owner_id,'company-a');assert.equal(payload.employee_id,'employee-a');assert.equal(payload.approval_status,'pending');assert.equal(payload.submitted_by,'staff-a');
});
test('approved days stay locked against employee edits',async()=>{
 const api=handler({locked:true});const response=await api.call({action:'save_my_day',id:'approved-day',work_date:'2026-11-01',entry_time:'08:00',exit_time:'17:30',break_minutes:30});assert.equal(response.status,403);assert.equal(response.data.error,'approved_day_locked');
 const query=api.queries.find(q=>q.table==='work_days');assert(query.operations.some(o=>o[0]==='in'&&o[1]==='approval_status'&&o[2].join(',')==='pending,rejected'));
});
test('blocked employees cannot list or submit records',async()=>{
 for(const action of ['my_days','save_my_day']){const api=handler({member:{...member,enabled:false}});assert.equal((await api.call({action,month:'2026-11'})).status,403);assert(!api.queries.some(q=>q.table==='work_days'));}
});
test('owner approval is constrained to their company and pending days',async()=>{
 const api=handler({member:null,userId:'owner-a'});assert.equal((await api.call({action:'review_day',id:'day-a',status:'approved',owner_id:'company-b'})).status,200);
 const query=api.queries.find(q=>q.table==='work_days');assert(query.operations.some(o=>o[0]==='eq'&&o[1]==='owner_id'&&o[2]==='owner-a'));assert(query.operations.some(o=>o[0]==='eq'&&o[1]==='approval_status'&&o[2]==='pending'));
});
test('existing-account invitations require the recipient’s verified email',async()=>{
 const api=handler({invite:{account_id:member.id,token_hash:'test'},email:'other@example.invalid'});const response=await api.call({action:'claim_invite',token:'a'.repeat(64)});assert.equal(response.status,403);assert.equal(response.data.error,'invite_email_mismatch');assert(!api.queries.some(q=>q.table==='team_accounts'&&q.operations.some(o=>o[0]==='update')));
});
test('rate limiting rejects requests before authentication and database reads',async()=>{
 const api=handler({rate:false});assert.equal((await api.call({action:'access'})).status,429);assert.equal(api.queries.length,0);
});

test('phone validation requires country code and normalizes formatting',()=>{
 assert.equal(phoneNumber('+32 (470) 12-34-56'),'+32470123456');assert.equal(phoneNumber('0032470123456'),'+32470123456');
 for(const v of ['', '0470123456', '+000123456', '+32oops'])assert.throws(()=>phoneNumber(v));
});
test('initial links cannot reset activated accounts; reset links cannot activate pending accounts',async()=>{
 for(const [purpose,activated_at] of [['invite','2026-11-01'],['reset',null]]){
  const api=handler({member:{...member,activated_at,login_method:'phone',auth_email:'test@staff.suivi.invalid'},invite:{purpose,account_id:member.id,token_hash:'test'}});
  const r=await api.call({action:'redeem_phone',token:'a'.repeat(64),password:'long-enough-password'},false);assert.equal(r.status,403);assert.equal(r.data.error,'access_denied');
 }
});
test('atomic token consumption rejects simultaneous password submissions',async()=>{
 const api=handler({used:true,member:{...member,activated_at:null,user_id:null,login_method:'phone',auth_email:'test@staff.suivi.invalid'},invite:{purpose:'invite',account_id:member.id,token_hash:'test'}});
 const r=await api.call({action:'redeem_phone',token:'a'.repeat(64),password:'long-enough-password'},false);assert.equal(r.status,410);assert.equal(r.data.error,'expired_invite');
});
test('employees cannot generate reset links for coworkers',async()=>{
 const r=await handler().call({action:'reset_phone',id:'other-member'});assert.equal(r.status,403);assert.equal(r.data.error,'owner_required');
});

test('employee defaults update only their verified profile and never existing days',async()=>{
 const api=handler();const response=await api.call({action:'save_my_defaults',entry_time:'07:00',exit_time:'17:30',break_minutes:0,owner_id:'company-b',employee_id:'employee-b'});assert.equal(response.status,200);
 const q=api.queries.find(q=>q.table==='employees'&&q.operations.some(o=>o[0]==='update'));
 assert(q.operations.some(o=>o[0]==='eq'&&o[1]==='id'&&o[2]==='employee-a'));assert(q.operations.some(o=>o[0]==='eq'&&o[1]==='owner_id'&&o[2]==='company-a'));assert.equal(q.operations.find(o=>o[0]==='update')[1].default_break_minutes,0);assert(!api.queries.some(q=>q.table==='work_days'));
 assert.equal((await handler().call({action:'save_my_defaults',entry_time:'25:00',exit_time:'17:30',break_minutes:30})).status,400);
 assert.equal((await handler({member:{...member,enabled:false}}).call({action:'save_my_defaults'})).status,403);
});

test('worker financial data is read only for their verified membership and requested month',async()=>{
 const api=handler();const response=await api.call({action:'my_days',month:'2026-11',owner_id:'company-b',employee_id:'employee-b'});assert.equal(response.status,200);
 const q=api.queries.find(q=>q.table==='monthly_payments');assert(q);for(const [field,value] of [['owner_id','company-a'],['employee_id','employee-a'],['month','2026-11-01']])assert(q.operations.some(o=>o[0]==='eq'&&o[1]===field&&o[2]===value));assert(!q.operations.some(o=>o.includes('company-b')||o.includes('employee-b')));
 const blocked=handler({member:{...member,enabled:false}});assert.equal((await blocked.call({action:'my_days',month:'2026-11'})).status,403);assert(!blocked.queries.some(q=>q.table==='monthly_payments'));
});
test('passwordless acceptance cannot use a reset invite, activated identity or replayed token',async()=>{
 for(const [purpose,activated_at] of [['reset',null],['invite','2026-11-01']]){const api=handler({member:{...member,activated_at,login_method:'phone',auth_email:'test@staff.suivi.invalid'},invite:{purpose,account_id:member.id,token_hash:'test'}});assert.equal((await api.call({action:'accept_phone',token:'a'.repeat(64)},false)).status,403);}
 const api=handler({used:true,member:{...member,activated_at:null,user_id:null,login_method:'phone',auth_email:'test@staff.suivi.invalid'},invite:{purpose:'invite',account_id:member.id,token_hash:'test'}});assert.equal((await api.call({action:'accept_phone',token:'a'.repeat(64)},false)).status,410);
});

 test('new managed employee accepts an invite without entering or receiving a password',async()=>{
 const api=handler({member:{...member,activated_at:null,user_id:null,login_method:'phone',auth_email:'new@staff.suivi.invalid'},invite:{purpose:'invite',account_id:member.id,token_hash:'test'}});
 const r=await api.call({action:'accept_phone',token:'a'.repeat(64)},false);assert.equal(r.status,200);assert.equal(r.data.session.access_token,'test-access');assert.equal(api.authChanges.length,1);assert(api.authChanges[0].values.password.length>=64);assert(!('password' in r.data));
 const consumed=api.queries.findIndex(q=>q.table==='team_invites'&&q.operations.some(o=>o[0]==='update'));assert(consumed>=0);
 });
