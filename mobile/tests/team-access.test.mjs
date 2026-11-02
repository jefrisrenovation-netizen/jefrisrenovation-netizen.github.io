import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {webcrypto} from 'node:crypto';
import {username,monthRange,dayInput} from '../../supabase/functions/team-access/validation.ts';
const employee={id:'employee-a',name:'A',active:true};
const member={id:'member-a',owner_id:'company-a',employee_id:employee.id,user_id:'staff-a',username:'staff.a',email:'staff@example.invalid',enabled:true,activated_at:'2026-11-01'};
function handler(options={}){
 const queries=[];let captured;
 class Query{
  constructor(table){this.table=table;this.operations=[];queries.push(this)}
  select(...v){this.operations.push(['select',...v]);return this}eq(...v){this.operations.push(['eq',...v]);return this}is(...v){this.operations.push(['is',...v]);return this}gt(...v){this.operations.push(['gt',...v]);return this}gte(...v){this.operations.push(['gte',...v]);return this}lte(...v){this.operations.push(['lte',...v]);return this}order(...v){this.operations.push(['order',...v]);return this}in(...v){this.operations.push(['in',...v]);return this}or(...v){this.operations.push(['or',...v]);return this}insert(v){this.operations.push(['insert',v]);return this}update(v){this.operations.push(['update',v]);return this}
  result(){let data=this.table==='team_accounts'?(options.member===undefined?member:options.member):this.table==='employees'?employee:this.table==='app_profiles'?{company_name:'Company A',language_code:'fr'}:this.table==='work_sites'?[]:this.table==='team_invites'?(options.invite||null):[];
   if(this.table==='work_days'&&this.operations.some(o=>o[0]==='insert'||o[0]==='update'))data=options.locked?[]:[{id:'day-a'}];
   return {data,error:null};}
  single(){return Promise.resolve(this.result())}maybeSingle(){return Promise.resolve(this.result())}then(ok,bad){return Promise.resolve(this.result()).then(ok,bad)}
 }
 const client={from:table=>new Query(table),rpc:async()=>({data:options.rate!==false,error:null}),auth:{getUser:async()=>options.unauthenticated?{data:{user:null},error:Error('denied')}:{data:{user:{id:options.userId||'staff-a',email:options.email||'staff@example.invalid',email_confirmed_at:'2026-11-01'}},error:null},admin:{getUserById:async()=>({data:{user:{email_confirmed_at:'2026-11-01'}}}),generateLink:async()=>{throw Error('must not generate a link for existing accounts')}}}};
 const context={createClient:()=>client,username,monthRange,dayInput,Request,Response,TextEncoder,Uint8Array,crypto:webcrypto,URL,Date,Deno:{env:{get:()=> 'test'},serve:fn=>{captured=fn}}};
 let code=fs.readFileSync('../supabase/functions/team-access/index.ts','utf8').replace(/^import .*;\n/gm,'');code=stripTypeScriptTypes(code);vm.createContext(context);vm.runInContext(code,context);
 return {queries,call:async(body,authenticated=true)=>{const response=await captured(new Request('https://test.invalid/team-access',{method:'POST',headers:{'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer test-token'}:{})},body:JSON.stringify(body)}));return {status:response.status,data:await response.json()};}};
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
