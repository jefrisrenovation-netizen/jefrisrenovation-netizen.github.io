import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {parseHTML} from 'linkedom';
function fixture(){
 const source=fs.readFileSync('source.html','utf8');const {document,window,HTMLElement}=parseHTML(source);
 Object.defineProperty(Object.getPrototypeOf(document.createElement('select')),'value',{get(){return this._testValue??this.querySelector('option')?.getAttribute('value')??''},set(v){this._testValue=String(v)},configurable:true});
 HTMLElement.prototype.scrollIntoView=function(){};HTMLElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLElement.prototype.close=function(){this.removeAttribute('open')};
 for(const el of document.querySelectorAll('select')){let value=el.querySelector('option')?.getAttribute('value')||'';Object.defineProperty(el,'value',{get:()=>value,set:v=>{value=String(v)},configurable:true});Object.defineProperty(el,'options',{get:()=>el.querySelectorAll('option'),configurable:true});}
 const store=new Map();const noopAuth={getSession:async()=>({data:{session:null}}),onAuthStateChange(){}};
 const context={document,window,navigator:{language:'pt-BR',userAgent:'Test'},location:{hash:'',reload(){}},sessionStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},supabase:{createClient:()=>({auth:noopAuth})},console,setTimeout,fetch:async()=>{throw Error('Unexpected network access')},alert(){},confirm:()=>false,prompt:()=>null};
 vm.createContext(context);const main=source.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
 const mobile=fs.readFileSync('scripts/mobile-runtime.js','utf8');const auth=mobile.slice(0,mobile.indexOf('async function handleAuthLink'));const deletion=mobile.slice(mobile.indexOf('async function requestAccountDeletion'));
 vm.runInContext(main+'\n'+auth+'\n'+deletion+'\n'+fs.readFileSync('scripts/team-runtime.js','utf8'),context);
 vm.runInContext('setupSelectors();$("year").value="2026";$("month").value="11";$("languageCode").value="pt-BR";user={id:"owner",email:"owner@example.invalid"};employees=[{id:"worker",name:"Test Employee",active:true}];profile={company_name:"Test Company"};teamState.role="owner";setupOwnerUI();',context);
 return {context,document,run:code=>vm.runInContext(code,context)};
}
test('owner navigation opens overview, team, sites and reports without losing existing timesheet',()=>{
 const f=fixture();assert(f.document.getElementById('dashboard'));assert.equal(f.document.getElementById('mainNav').querySelectorAll('button').length,5);
 f.run('showPane("team")');assert(!f.document.getElementById('timesheetPanel').classList.contains('hidden'));assert(!f.document.getElementById('accessPanel').classList.contains('hidden'));assert(f.document.getElementById('dashboard').classList.contains('hidden'));
 f.run('showPane("sites")');assert(!f.document.getElementById('sitesPanel').classList.contains('hidden'));assert(f.document.getElementById('accessPanel').classList.contains('hidden'));
 f.run('showPane("reports")');assert(!f.document.getElementById('reportActions').classList.contains('hidden'));assert(f.document.getElementById('timesheetPanel').classList.contains('hidden'));
});
test('new day form contains worker, date, start, end, break and editable workplace together',()=>{
 const f=fixture();f.run('teamState.sites=[{id:"site",name:"Forest",address:"Bruxelles"}];ownerDayDialog()');
 for(const id of ['ownerDayEmployee','ownerDayDate','ownerDayEntry','ownerDayExit','ownerDayPause','ownerDaySite','ownerDayWorkplace'])assert(f.document.getElementById(id));
 f.document.getElementById('ownerDaySite').value='Forest — Bruxelles';f.document.getElementById('ownerDaySite').onchange();assert.equal(f.document.getElementById('ownerDayWorkplace').value,'Forest — Bruxelles');
});
test('employee portal hides employer controls and keeps personal account deletion accessible',async()=>{
 const f=fixture();f.run('teamState.role="employee";teamState.access={company:"Test Company",employee:{id:"worker",name:"Test Employee"}};teamCall=async()=>({days:[{id:"day",work_date:"2026-11-01",entry_time:"08:00",exit_time:"17:30",break_minutes:30,workplace:"Forest",approval_status:"approved"}],sites:[]});');
 await f.run('workerPortal()');assert(f.document.getElementById('app').classList.contains('hidden'));assert(f.document.getElementById('workerDays').textContent.includes('Forest'));assert.equal(f.document.querySelectorAll('#workerDays [data-day]').length,0);assert(f.document.getElementById('workerDelete'));
});
test('invite username pattern accepts supported usernames in modern and older browsers',()=>{
 const f=fixture();const input=f.document.getElementById('inviteUsername');
 for(const flag of ['u','v']){
  const pattern=new RegExp('^(?:'+input.pattern+')$',flag);
  for(const value of ['testefuncionario','teste_funcionario','teste.funcionario','teste-funcionario'])assert(pattern.test(value),value);
  for(const value of ['teste funcionario','ab','@teste','funcionário'])assert(!pattern.test(value),value);
 }
});

test('email is optional and phone becomes required without email',()=>{
 const f=fixture();const email=f.document.getElementById('inviteEmail'),phone=f.document.getElementById('invitePhone');assert.equal(email.required,false);assert.equal(phone.required,true);
 email.value='worker@example.invalid';email.oninput();assert.equal(phone.required,false);email.value='';email.oninput();assert.equal(phone.required,true);
});
test('reset links can be shared without an email address',()=>{
 const f=fixture();f.run('showTeamInvitation({username:"worker.test",email:null,phone:"+32470123456",url:"https://example.invalid/invite/",reset:true})');
 assert(f.document.getElementById('shareEmail').classList.contains('hidden'));assert(f.document.getElementById('shareWhatsApp').getAttribute('href').startsWith('https://wa.me/32470123456?text='));assert(decodeURIComponent(f.document.getElementById('shareWhatsApp').getAttribute('href')).includes('nova senha'));
});

test('saved owner days are compact rows and editing opens a separate form',()=>{
 const f=fixture();f.run('$("employee").value="worker";records=[{id:"day1",employee_id:"worker",work_date:"2026-11-03",entry_time:"08:00",exit_time:"17:30",break_minutes:30,workplace:"Forest"}];render()');
 const rows=f.document.getElementById('rows');assert.equal(rows.querySelectorAll('tr').length,1);assert.equal(rows.querySelectorAll('input').length,0);assert(rows.textContent.includes('03/11'));assert(rows.textContent.includes('9h00'));
 f.run('window.teamUI.editDay("day1")');assert.equal(f.document.getElementById('ownerDayDate').value,'2026-11-03');assert.equal(f.document.getElementById('ownerDayWorkplace').value,'Forest');
});
test('default hours live in collapsed settings, outside the monthly sheet',()=>{
 const f=fixture();const defaults=f.document.getElementById('employeeDefaults');assert(defaults.closest('#settingsPanel'));assert(defaults.closest('details'));assert(!defaults.closest('details').hasAttribute('open'));assert(!f.document.getElementById('timesheetPanel').querySelector('#defaultEntry'));
});
