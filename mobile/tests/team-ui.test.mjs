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
 const rows=f.document.getElementById('rows');assert.equal(rows.querySelectorAll('tr[data-record-id]').length,1);assert.equal(rows.querySelectorAll('input').length,0);assert(rows.textContent.includes('03/11'));assert(rows.textContent.includes('9h00'));
 f.run('window.teamUI.editDay("day1")');assert.equal(f.document.getElementById('ownerDayDate').value,'2026-11-03');assert.equal(f.document.getElementById('ownerDayWorkplace').value,'Forest');
});
test('default hours live in collapsed settings, outside the monthly sheet',()=>{
 const f=fixture();const defaults=f.document.getElementById('employeeDefaults');assert(defaults.closest('#settingsPanel'));assert(defaults.closest('details'));assert(!defaults.closest('details').hasAttribute('open'));assert(!f.document.getElementById('timesheetPanel').querySelector('#defaultEntry'));
});

test('employee entry keeps employer defaults private and starts each new period with no deducted break',async()=>{
 const f=fixture();f.run(`teamState.role='employee';teamState.month='2026-11';teamState.access={company:'Company',employee:{id:'worker',name:'Anderson',default_entry_time:'07:00',default_break_minutes:30}};teamCall=async()=>({days:[],sites:[]});`);
 await f.run('workerPortal()');assert(!f.document.getElementById('workerScheduleEntry'));
 f.run('workerDayDialog()');assert(!f.document.getElementById('workerDialogSchedule'));assert.equal(f.document.getElementById('workerDayEntry').value,'07:00');assert.equal(f.document.getElementById('workerDayPause').value,'0');
 f.document.getElementById('workerDayEntry').value='09:00';f.run('workerDayDialog()');assert.equal(f.document.getElementById('workerDayEntry').value,'07:00');
});

test('workplace filter keeps the chosen records and includes legacy unnamed places without adding a client field',()=>{
 const f=fixture();f.run(`$('employee').value='worker';refreshPersonalReportFilters([{employee_id:'worker',workplace:'Forest'},{employee_id:'worker',workplace:'Uccle'},{employee_id:'worker',workplace:null},{employee_id:'other',workplace:'Private'}],employees);`);
 assert(!f.document.getElementById('reportClient'));assert(!f.document.getElementById('reportWorkplace').textContent.includes('Private'));
 f.run(`window.selected=selectReportDays([{id:1,workplace:'Forest'},{id:2,workplace:'Uccle'},{id:3,workplace:null}],{workplace:JSON.stringify('Forest')});`);assert.equal(f.context.window.selected.length,1);assert.equal(f.context.window.selected[0].id,1);
 f.run(`window.selected=selectReportDays([{id:1,workplace:'Forest'},{id:3,workplace:null}],{workplace:JSON.stringify('')});`);assert.equal(f.context.window.selected[0].id,3);
});
test('worker report exports only their selected workplace and month, including approval status',async()=>{
 const f=fixture();f.run(`teamState.role='employee';teamState.month='2026-11';teamState.access={company:'Company',employee:{id:'worker',name:'Anderson'}};teamCall=async()=>({days:[{id:'a',work_date:'2026-11-01',entry_time:'08:00',exit_time:'17:30',break_minutes:30,workplace:'Forest',approval_status:'approved'},{employee_id:'worker',id:'b',work_date:'2026-11-02',entry_time:'08:00',exit_time:'17:30',break_minutes:30,workplace:'Uccle',approval_status:'pending'}],sites:[]});`);
 await f.run('workerPortal()');f.document.getElementById('workerReportPlace').value=JSON.stringify('Forest');f.run('showWorkerReport()');const source=f.document.getElementById('workerReport');assert.equal(source.dataset.reportMonth,'2026-11');assert(source.textContent.includes('Anderson'));assert(source.textContent.includes('Forest'));assert(!source.textContent.includes('Uccle'));assert(source.textContent.includes('9h00'));assert.equal(source.querySelectorAll('tbody tr').length,1);
});

test('individual workplace report recomputes hours and hourly pay without allocating monthly advances',async()=>{
 const f=fixture();f.run(`$('employee').value='worker';$('reportWorkplace').value=JSON.stringify('Forest');
 const reportDays=[{employee_id:'worker',id:'a',work_date:'2026-11-01',entry_time:'08:00',exit_time:'17:30',break_minutes:30,workplace:'Forest',approval_status:'approved'},{employee_id:'worker',id:'b',work_date:'2026-11-02',entry_time:'08:00',exit_time:'17:30',break_minutes:30,workplace:'Uccle',approval_status:'approved'},{employee_id:'worker',id:'c',work_date:'2026-11-03',entry_time:'08:00',exit_time:'17:30',break_minutes:30,workplace:'Forest',approval_status:'pending'}];
 sb.from=table=>{const q={select(){return q},eq(){return q},gte(){return q},lte(){return q},order(){return Promise.resolve({data:reportDays})},single(){return Promise.resolve({data:employees[0]})},maybeSingle(){return Promise.resolve({data:{employee_id:'worker',payment_mode:'hourly',hourly_rate:20,currency_code:'EUR',advance:500}})}};return q;};`);
 await f.run('showIndividualReport()');const source=f.document.getElementById('individualReport');assert(!source.classList.contains('hidden'));assert.equal(source.querySelectorAll('tbody tr').length,1);assert(source.textContent.includes('Forest'));assert(!source.textContent.includes('Uccle'));assert(source.textContent.includes('9h00'));const summary=f.document.getElementById('individualReportSummary');assert.equal(summary.querySelectorAll('.stat').length,4);assert(summary.textContent.includes('180,00'));assert(!summary.textContent.includes('500,00'));assert(summary.textContent.includes('não são divididos'));
});
test('worker PDF is a real PDF containing only the selected workplace and uses the employee month',async()=>{
 const {jsPDF}=await import('jspdf');const {autoTable}=await import('jspdf-autotable');const {reportFilename}=await import('../src/helpers.mjs');
 const f=fixture();Object.assign(f.context,{jsPDF,autoTable,File,reportFilename});f.context.navigator.canShare=()=>true;f.context.navigator.share=async data=>{f.context.window.sharedPDF=data;};
 const mobile=fs.readFileSync('scripts/mobile-runtime.js','utf8');f.run(mobile.slice(mobile.indexOf('async function exportMobileReport'),mobile.indexOf('async function requestAccountDeletion')));
 f.run(`teamState.role='employee';teamState.month='2026-10';teamState.access={company:'Company',employee:{id:'worker',name:'Anderson'}};teamCall=async()=>({days:[{id:'a',work_date:'2026-10-01',entry_time:'08:00',exit_time:'17:30',break_minutes:30,workplace:'Forest',approval_status:'approved'},{id:'b',work_date:'2026-10-02',entry_time:'08:00',exit_time:'17:30',break_minutes:30,workplace:'Uccle',approval_status:'pending'}],sites:[]});`);
 await f.run('workerPortal()');f.document.getElementById('workerReportPlace').value=JSON.stringify('Forest');await f.run('exportWorkerReport()');
 const file=f.context.window.sharedPDF?.files[0];assert(file,'PDF must reach file sharing');assert.equal(file.name,'suivi-individuel-2026-10.pdf');const content=await file.text();assert(content.startsWith('%PDF-'));assert(content.includes('Forest'));assert(!content.includes('Uccle'));assert(content.includes('9h00'));
});

test('worker payroll shows three approved days, rate, gross, advance and net in the shared PDF',async()=>{
 const {jsPDF}=await import('jspdf');const {autoTable}=await import('jspdf-autotable');const {reportFilename}=await import('../src/helpers.mjs');
 const f=fixture();Object.assign(f.context,{jsPDF,autoTable,File,reportFilename});f.context.navigator.canShare=()=>true;f.context.navigator.share=async data=>{f.context.window.sharedPDF=data};
 const runtime=fs.readFileSync('scripts/mobile-runtime.js','utf8');f.run(runtime.slice(runtime.indexOf('async function exportMobileReport'),runtime.indexOf('async function requestAccountDeletion')));
 f.run(`teamState.role='employee';teamState.access={company:'Company',employee:{id:'worker',name:'Geraldo'}};teamCall=async()=>({days:[3,4,5].map(i=>({id:String(i),work_date:'2026-11-0'+i,entry_time:'08:00',exit_time:'17:30',break_minutes:30,approval_status:'approved'})),sites:[],payment:{payment_mode:'daily',daily_rate:100,advance:50,currency_code:'EUR'},currency:'EUR'});`);
 await f.run('workerPortal()');await f.run('exportWorkerReport()');const stats=[...f.document.querySelectorAll('#workerReport .stat')].map(e=>e.textContent);
 assert(stats.some(s=>s==='3Dias aprovados'));assert(stats.some(s=>s.includes('300,00')&&s.includes('Valor bruto')));assert(stats.some(s=>s.includes('250,00')&&s.includes('Saldo a receber')));
 const pdf=await f.context.window.sharedPDF.files[0].text();for(const value of ['27h00','300,00','250,00','Dias aprovados'])assert(pdf.includes(value),value);
});
test('worker pay excludes pending days, counts half days and never allocates advances to filtered places',async()=>{
 const f=fixture();f.run(`teamState.role='employee';teamState.access={company:'Company',employee:{id:'worker',name:'Worker'}};teamCall=async()=>({days:[{work_date:'2026-11-01',entry_time:'08:00',exit_time:'12:00',break_minutes:0,workplace:'Forest',approval_status:'approved'},{work_date:'2026-11-02',entry_time:'08:00',exit_time:'17:30',break_minutes:30,workplace:'Forest',approval_status:'pending'}],sites:[],payment:{payment_mode:'hourly',hourly_rate:20,advance:10},currency:'EUR'});`);
 await f.run('workerPortal()');f.run('showWorkerReport()');let stats=[...f.document.querySelectorAll('#workerReport .stat')].map(e=>e.textContent);assert(stats.includes('0,5Dias aprovados'));assert(stats.some(s=>s.includes('80,00')&&s.includes('Valor bruto')));assert(stats.some(s=>s.includes('70,00')&&s.includes('Saldo a receber')));
 f.document.getElementById('workerReportPlace').value=JSON.stringify('Forest');f.run('showWorkerReport()');assert(!f.document.querySelector('#workerReport .summary').textContent.includes('Adiantamentos'));assert(!f.document.querySelector('#workerReport .summary').textContent.includes('Saldo a receber'));
 f.run("teamState.payment={payment_mode:'fixed',fixed_salary:2500,advance:10};showWorkerReport()");assert(!f.document.querySelector('#workerReport .summary').textContent.includes('Valor bruto'));
});
test('worker language is reachable without owner settings and translates the report after changing',async()=>{
 const f=fixture();f.run(`teamState.role='employee';teamState.access={company:'Company',employee:{id:'worker',name:'Worker'}};teamCall=async()=>({days:[],sites:[],payment:{payment_mode:'hourly',hourly_rate:20},currency:'EUR'});`);await f.run('workerPortal()');
 const selector=f.document.getElementById('accessLanguage');assert(selector.closest('header'));selector.value='en';selector.onchange();await new Promise(resolve=>setTimeout(resolve,0));f.run('showWorkerReport()');assert.equal(f.document.documentElement.lang,'en');assert(f.document.getElementById('workerReport').textContent.includes('Approved days'));assert(!f.document.getElementById('workerReport').textContent.includes('Dias aprovados'));assert(f.document.getElementById('workerDays').textContent.includes('No days recorded'));
});

test('approved first access chooses language and account type before welcome and login',()=>{
 const f=fixture();assert(f.document.getElementById('approvedIntro').textContent.includes('Escolha seu idioma'));
 f.document.querySelector('[data-intro-type="business"]').onclick();f.document.getElementById('introNext').onclick();assert(f.document.getElementById('approvedIntro').textContent.includes('Bem-vindo'));f.document.getElementById('introLogin').onclick();assert(!f.document.getElementById('loginCard').classList.contains('hidden'));assert.equal(f.document.getElementById('accountType').value,'business');assert(f.document.getElementById('signupForm').closest('details').classList.contains('hidden'));
});

test('employee invite replaces an existing session before resolving membership',async()=>{
 const f=fixture();await new Promise(resolve=>setTimeout(resolve,0));f.run(`sessionStorage.setItem('suivi_employee_session',JSON.stringify({access_token:'worker-token',refresh_token:'worker-refresh'}));sessionStorage.setItem('suivi_expected_employee','test.worker');window.order=[];sb.auth.setSession=async tokens=>{window.order.push('set:'+tokens.access_token);return {data:{}}};sb.auth.getSession=async()=>{window.order.push('get');return {data:{session:{user:{id:'worker-user'}}}}};teamCall=async()=>({role:'employee',username:'test.worker',employee:{id:'worker'}});workerPortal=async()=>{window.order.push('portal')};`);
 await f.run('teamBoot()');assert.equal(f.run('window.order[0]'),'set:worker-token');assert.equal(f.run('window.order.at(-1)'),'portal');assert.equal(f.run("sessionStorage.getItem('suivi_employee_session')"),undefined);
});
test('employee invite never falls through to an empty owner dashboard',async()=>{
 const f=fixture();await new Promise(resolve=>setTimeout(resolve,0));f.run(`sessionStorage.setItem('suivi_expected_employee','test.worker');sb.auth.getSession=async()=>({data:{session:{user:{id:'wrong-user'}}}});teamCall=async()=>({role:'owner'});startLegacy=async()=>{throw Error('owner dashboard must not open')};`);
 await f.run('teamBoot()');assert(f.document.getElementById('app').classList.contains('hidden'));assert(!f.document.getElementById('loginCard').classList.contains('hidden'));
});

test('split shifts share one date and daily total while approved hours drive pay by day',async()=>{
 const f=fixture();f.run(`window.periods=[{id:'a',employee_id:'worker',work_date:'2026-11-05',entry_time:'08:00',exit_time:'11:00',break_minutes:0,workplace:'A',approval_status:'approved'},{id:'b',employee_id:'worker',work_date:'2026-11-05',entry_time:'11:30',exit_time:'13:30',break_minutes:0,workplace:'B',approval_status:'approved'},{id:'c',employee_id:'worker',work_date:'2026-11-05',entry_time:'14:00',exit_time:'16:00',break_minutes:0,workplace:'C',approval_status:'pending'}];$('employee').value='worker';records=window.periods;render();`);
 assert.equal(f.document.querySelectorAll('#rows time').length,1);assert.equal(f.document.querySelector('#rows time').parentNode.getAttribute('rowspan'),'3');assert.match(f.document.querySelector('#rows .day-total').textContent,/7h00/);
 const daily=f.run(`buildCompanyReport(employees,window.periods,[{employee_id:'worker',daily_rate:100}]).rows[0]`);assert.equal(daily.days,1);assert.equal(daily.gross,100);
 const hourly=f.run(`buildCompanyReport(employees,window.periods,[{employee_id:'worker',payment_mode:'hourly',hourly_rate:20}]).rows[0]`);assert.equal(hourly.gross,100);
 assert.equal(f.run(`equivalentWorkDays([{...window.periods[0],exit_time:'10:00'},{...window.periods[1],entry_time:'11:00',exit_time:'12:00'}])`),0.5);
 assert.equal(f.run(`equivalentWorkDays([{...window.periods[0],exit_time:'12:00'}])`),0.5);
 assert.equal(f.run(`equivalentWorkDays([{...window.periods[0],exit_time:'12:01'}])`),1);
 assert.equal(f.run(`equivalentWorkDays([{...window.periods[0],exit_time:'08:00'}])`),0);
 f.run(`teamState.role='employee';teamState.access={company:'Company',employee:{id:'worker',name:'Anderson'}};teamCall=async()=>({days:window.periods,sites:[],payment:{payment_mode:'daily',daily_rate:100}});`);await f.run('workerPortal()');
 assert.equal(f.document.querySelectorAll('#workerDays time').length,1);assert.match(f.document.querySelector('#workerDays .day-total').textContent,/7h00/);assert.equal(f.document.querySelectorAll('#workerDays [data-day]').length,1);
});
test('a second period submits the same date and stays available after reopening the form',async()=>{
 const f=fixture();f.run(`teamState.role='employee';teamState.month='2026-11';teamState.access={company:'Company',employee:{id:'worker',name:'Anderson'}};window.saved=[];teamCall=async(action,body)=>{if(action==='save_my_day'){window.saved.push(body);return {saved:true}}return {days:[],sites:[]}};`);
 await f.run('workerPortal()');
 for(const [entry,exit] of [['08:00','10:00'],['11:00','12:00']]){
 f.run('workerDayDialog()');f.document.getElementById('workerDayDate').value='2026-11-05';f.document.getElementById('workerDayEntry').value=entry;f.document.getElementById('workerDayExit').value=exit;await f.document.getElementById('workerDayForm').onsubmit({preventDefault(){},submitter:{disabled:false}});
 }
 assert.equal(f.context.window.saved.length,2);assert.equal(f.context.window.saved[0].work_date,f.context.window.saved[1].work_date);assert.equal(f.context.window.saved[1].entry_time,'11:00');assert.equal(f.context.window.saved[1].break_minutes,0);
 f.run('workerDayDialog()');assert.equal(f.document.getElementById('workerDayDate').value,'2026-11-05');
});
