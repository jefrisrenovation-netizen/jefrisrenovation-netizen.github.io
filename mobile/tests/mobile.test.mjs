import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {authTokens,reportFilename} from '../src/helpers.mjs';
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
