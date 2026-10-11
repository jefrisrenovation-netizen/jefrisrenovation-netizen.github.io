import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {authTokens,reportFilename} from '../src/helpers.mjs';
function passwordLogin(signIn){
 const runtime=fs.readFileSync('scripts/mobile-runtime.js','utf8');
 const fn=runtime.slice(runtime.indexOf('async function loginWithPassword'),runtime.indexOf('const passwordAccess='));
 const elements={email:{value:' reviewer@example.com '},loginPassword:{value:' secret '},passwordLoginButton:{disabled:false}};
 const messages=[];let starts=0;
 const context={$:id=>elements[id],sb:{auth:{signInWithPassword:signIn}},setLogin:message=>messages.push(message),start:async()=>{starts++;}};
 vm.createContext(context);vm.runInContext(fn,context);
 return {run:context.loginWithPassword,elements,messages,starts:()=>starts};
}
test('password login authenticates with Supabase and clears the password after success',async()=>{
 let credentials;
 const login=passwordLogin(async value=>{credentials=value;return {error:null};});
 await login.run();
 assert.equal(credentials.email,'reviewer@example.com');assert.equal(credentials.password,' secret ');
 assert.equal(login.starts(),1);assert.equal(login.elements.loginPassword.value,'');
 assert.equal(login.elements.passwordLoginButton.disabled,false);
});
test('failed password login never starts an authenticated session',async()=>{
 for(const signIn of [async()=>({error:{message:'invalid'}}),async()=>{throw new Error('offline')}]){
  const login=passwordLogin(signIn);await login.run();
  assert.equal(login.starts(),0);assert.equal(login.elements.passwordLoginButton.disabled,false);
  assert.match(login.messages.at(-1),/Connexion impossible/);
 }
});
test('password login rejects empty credentials and ignores repeated submissions',async()=>{
 let calls=0;let finish;
 const login=passwordLogin(()=>{calls++;return new Promise(resolve=>{finish=resolve;});});
 login.elements.loginPassword.value='';await login.run();assert.equal(calls,0);
 login.elements.loginPassword.value='secret';const pending=login.run();
 await login.run();assert.equal(calls,1);
 finish({error:null});await pending;assert.equal(login.starts(),1);
});
test('only our application login links are accepted',()=>{
 assert.deepEqual(authTokens('https://jefrisrenovation-netizen.github.io/#access_token=a&refresh_token=b'),{access_token:'a',refresh_token:'b'});
 assert.deepEqual(authTokens('suiviheurespro://login#access_token=a&refresh_token=b'),{access_token:'a',refresh_token:'b'});
 for(const url of ['javascript:alert(1)','https://evil.test/#access_token=a&refresh_token=b','https://jefrisrenovation-netizen.github.io.evil.test/#access_token=a&refresh_token=b','https://jefrisrenovation-netizen.github.io/privacy.html#access_token=a&refresh_token=b','https://jefrisrenovation-netizen.github.io/#access_token=a'])assert.equal(authTokens(url),null);
});
test('PDF filenames cannot escape the private cache directory',()=>{
 assert.equal(reportFilename('print-company','2026-10'),'suivi-equipe-2026-10.pdf');assert.throws(()=>reportFilename('print-company','../../secret'));
});
function calculations(){
 const source=fs.readFileSync('source.html','utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
 const el={value:'fr',addEventListener(){}};
 const fake={auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}};
 const context={supabase:{createClient:()=>fake},document:{getElementById:()=>el},navigator:{},window:{},setTimeout,console};
 vm.createContext(context);vm.runInContext(source+'\nthis.api={calculateGross,buildCompanyReport,monthEnd};',context);
 return {context,api:context.api,el};
}
test('payments deduct advances per employee without cancelling other balances',()=>{
 const {api}=calculations();
 const staff=[{id:'a',name:'A'},{id:'b',name:'B'}];
 const days=[{employee_id:'a',entry_time:'08:00',exit_time:'17:30',break_minutes:30},{employee_id:'b',entry_time:'08:00',exit_time:'17:30',break_minutes:30}];
 const result=api.buildCompanyReport(staff,days,[{employee_id:'a',payment_mode:'daily',daily_rate:100,advance:150},{employee_id:'b',payment_mode:'hourly',hourly_rate:20,advance:0}]);
 assert.equal(result.rows[0].balance,-50);assert.equal(result.rows[1].gross,180);assert.equal(result.due,180);assert.equal(result.balance,130);
 assert.equal(api.calculateGross(540,1,{payment_mode:'fixed',fixed_salary:2500}),2500);
});
test('all days of long and leap-year months remain available',()=>{
 const {api,context}=calculations();
 context.document.getElementById=id=>({value:id==='year'?'2026':'10'});assert.equal(api.monthEnd(),'2026-10-31');
 context.document.getElementById=id=>({value:id==='year'?'2028':'02'});assert.equal(api.monthEnd(),'2028-02-29');
});
test('new profiles do not inherit the owner’s company name',()=>{
 const source=fs.readFileSync('source.html','utf8');assert.ok(source.includes('account_type:"individual",company_name:""'));
});
