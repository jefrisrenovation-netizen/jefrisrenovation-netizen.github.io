const Subscription=registerPlugin('Subscription');
let subscriptionAccess=null;
let subscriptionOwner=null;
let subscriptionProduct=null;
const subscriptionCard=document.createElement('section');
subscriptionCard.className='card no-print';
subscriptionCard.innerHTML=`<h2>Abonnement</h2><p id="subscriptionStatus" role="status">Vérification de l’accès…</p>
<p>Suivi des heures, gestion des employés et rapports. Vos données restent consultables et exportables après la fin de l’accès.</p>
<button id="subscribeButton" class="danger" disabled>S’abonner</button>
<button id="restoreSubscription" style="margin-top:8px">Restaurer les achats</button>
<p id="subscriptionTerms" class="muted"></p>
<p><a href="https://apps.apple.com/account/subscriptions" target="_blank" rel="noopener">Gérer ou annuler l’abonnement</a></p>
<p><a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener">Conditions d’utilisation</a> · <a href="https://jefrisrenovation-netizen.github.io/privacy.html" target="_blank" rel="noopener">Confidentialité</a></p>`;
$('app').prepend(subscriptionCard);
function renderSubscription(){
 const access=subscriptionOwner===user?.id?subscriptionAccess:null;
 const date=access?.access_until?new Date(access.access_until).toLocaleDateString('fr-BE'):'';
 const labels={prelaunch:'Accès gratuit avant le lancement.',promotion:'Promotion de lancement : accès gratuit jusqu’au '+date+'.',trial:'Essai gratuit jusqu’au '+date+'. Aucun paiement automatique sans votre accord.',subscribed:'Abonnement actif jusqu’au '+date+'.',expired:'Votre accès gratuit est terminé. Abonnez-vous pour ajouter ou modifier des données.'};
 $('subscriptionStatus').textContent=labels[access?.phase]||'Accès non vérifié. Reconnectez-vous à Internet pour modifier vos données.';
 const available=Capacitor.getPlatform()==='ios'&&subscriptionProduct;
 const offer=access&&['expired','trial'].includes(access.phase);
 $('subscribeButton').classList.toggle('hidden',!offer);
 $('subscribeButton').disabled=!available;
 $('subscribeButton').textContent=available?'S’abonner — '+subscriptionProduct.price+' / mois':'Abonnement indisponible pour le moment';
 $('subscriptionTerms').textContent=available&&offer?'Abonnement mensuel à '+subscriptionProduct.price+'. Paiement via votre compte Apple après confirmation. Renouvellement automatique chaque mois, sauf annulation au moins 24 heures avant la fin de la période. Gérez ou annulez dans les réglages de votre compte Apple.':'';
 $('restoreSubscription').classList.toggle('hidden',Capacitor.getPlatform()!=='ios');
}
const billing=subscriptionController({store:Subscription,owner:()=>user?.id,
 invoke:async body=>{const {data,error}=await sb.functions.invoke('subscription-access',{body});if(error)throw error;return data;},
 onStatus:data=>{subscriptionAccess=data;subscriptionOwner=user?.id;renderSubscription();}});
async function refreshSubscription(){
 subscriptionAccess=null;subscriptionOwner=null;renderSubscription();
 try{
  await billing.refresh();
  if(Capacitor.getPlatform()==='ios'){
   try{subscriptionProduct=await Subscription.product();renderSubscription();}catch{}
   try{const {receipts}=await Subscription.transactions();await billing.receipts(receipts||[]);}catch{ /* unfinished purchases remain available for retry */ }
  }
 }catch{renderSubscription();}
}
async function subscriptionAction(action){
 $('subscribeButton').disabled=true;$('restoreSubscription').disabled=true;
 try{
  const result=await billing[action]();
  if(result.status==='pending')$('subscriptionStatus').textContent='Achat en attente de validation par Apple.';
  if(result.status==='restored'&&subscriptionAccess?.phase!=='subscribed')$('subscriptionStatus').textContent='Aucun abonnement actif associé à ce compte. Utilisez le compte de l’achat initial.';
 }catch{$('subscriptionStatus').textContent='Achat ou restauration non confirmé. Réessayez avec le compte utilisé lors de l’achat.';}
 finally{$('subscribeButton').disabled=!subscriptionProduct;$('restoreSubscription').disabled=false;}
}
$('subscribeButton').onclick=()=>subscriptionAction('purchase');
$('restoreSubscription').onclick=()=>subscriptionAction('restore');
if(Capacitor.getPlatform()==='ios'){
 Subscription.addListener('transaction',async({jws})=>{if(user){try{await billing.submit(jws);}catch{}}});
 App.addListener('appStateChange',({isActive})=>{if(isActive&&user)refreshSubscription();});
}
// Reports, settings, sign-out and account deletion remain available. Every edit also has a server RLS gate.
for(const name of ['addEmployee','addRow','upd','del','deleteEmployee','savePayment','saveEmployeeDefaults']){
 const original={addEmployee,addRow,upd,del,deleteEmployee,savePayment,saveEmployeeDefaults}[name];
 const guarded=async(...args)=>{
  try{await billing.refresh();}catch{setStatus('Vérification de l’accès impossible. Réessayez en ligne.',false);return;}
  if(subscriptionOwner!==user?.id||!subscriptionAccess?.can_write){renderSubscription();subscriptionCard.scrollIntoView({behavior:'smooth'});await loadRecords();return;}
  return original(...args);
 };
 if(name==='addEmployee')addEmployee=guarded;
 if(name==='addRow')addRow=guarded;
 if(name==='upd')upd=guarded;
 if(name==='del')del=guarded;
 if(name==='deleteEmployee')deleteEmployee=guarded;
 if(name==='savePayment')savePayment=guarded;
 if(name==='saveEmployeeDefaults')saveEmployeeDefaults=guarded;
}
