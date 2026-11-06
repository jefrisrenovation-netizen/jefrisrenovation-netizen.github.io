// The shipped application bundle stays on-device; only account data goes to Supabase.
async function loginWithPassword(){
  const button=$('passwordLoginButton');
  if(button.disabled)return;
  const email=$('email').value.trim();
  const password=$('loginPassword').value;
  if(!email||!password){setLogin(tr('Saisissez votre e-mail et votre mot de passe.'));return;}
  button.disabled=true;
  setLogin(tr('Connexion en cours…'),true);
  try{
    let error;
    if(email.includes('@'))({error}=await sb.auth.signInWithPassword({email,password}));
    else {try{const result=await teamCall('login',{username:email,password});({error}=await sb.auth.setSession(result.session));}catch{error={message:'invalid_credentials'};}}
    if(error){setLogin(tr('Connexion impossible. Vérifiez vos identifiants.'));return;}
    if(typeof saveAccessPreference==='function')saveAccessPreference('suivi_identifier',email);
    $('loginPassword').value='';
    await start();
  }catch{setLogin(tr('Connexion impossible. Vérifiez votre connexion Internet et réessayez.'));}
  finally{button.disabled=false;}
}
const passwordAccess=document.createElement('details');
passwordAccess.style.marginTop='16px';
const passwordSummary=document.createElement('summary');
passwordSummary.dataset.text='Se connecter avec un mot de passe';passwordSummary.textContent=tr(passwordSummary.dataset.text);
const passwordForm=document.createElement('form');
const passwordLabel=document.createElement('label');
passwordLabel.htmlFor='loginPassword';passwordLabel.dataset.text='Mot de passe';passwordLabel.textContent=tr(passwordLabel.dataset.text);
passwordLabel.style.marginTop='12px';
const passwordInput=document.createElement('input');
passwordInput.id='loginPassword';passwordInput.type='password';
passwordInput.autocomplete='current-password';passwordInput.required=true;
const passwordButton=document.createElement('button');
passwordButton.id='passwordLoginButton';passwordButton.type='submit';
passwordButton.dataset.text='Se connecter';passwordButton.textContent=tr(passwordButton.dataset.text);passwordButton.style.marginTop='8px';
passwordForm.append(passwordLabel,passwordInput,passwordButton);
passwordForm.onsubmit=event=>{event.preventDefault();loginWithPassword();};
passwordAccess.append(passwordSummary,passwordForm);
$('loginCard').insertBefore(passwordAccess,$('loginCard').querySelector('button'));
async function registerWithPassword(){
  const button=$('passwordSignupButton');
  if(button.disabled)return;
  const email=$('email').value.trim(),password=$('signupPassword').value;
  if(!email||!email.includes('@')||!$('email').checkValidity()){setLogin(tr('Digite seu e-mail.'));return;}
  if(password.length<8||password!==$('signupConfirmation').value){setLogin(tr('Les mots de passe doivent être identiques et contenir au moins 8 caractères.'));return;}
  button.disabled=true;
  setLogin(tr('Création du compte…'),true);
  try{
    const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:'https://jefrisrenovation-netizen.github.io/'}});
    if(error){setLogin(error.message);return;}
    $('signupPassword').value='';$('signupConfirmation').value='';
    if(data?.session)await start();
    else setLogin(tr('Confirmez votre e-mail pour activer votre compte, puis connectez-vous avec votre mot de passe.'),true);
  }catch{setLogin(tr('Connexion impossible. Vérifiez votre connexion Internet et réessayez.'));}
  finally{button.disabled=false;}
}
const signup=document.createElement('details');signup.style.marginTop='16px';
signup.innerHTML='<summary data-text="Créer un compte">Créer un compte</summary><form id="signupForm"><label for="signupPassword" data-text="Mot de passe">Mot de passe</label><input id="signupPassword" type="password" autocomplete="new-password" minlength="8" required><label for="signupConfirmation" data-text="Confirmer le mot de passe">Confirmer le mot de passe</label><input id="signupConfirmation" type="password" autocomplete="new-password" minlength="8" required><button id="passwordSignupButton" type="submit" data-text="Créer un compte">Créer un compte</button></form>';
$('loginCard').append(signup);$('signupForm').onsubmit=e=>{e.preventDefault();registerWithPassword();};
let inviteInProgress=false;
async function handleAuthLink(url){
  let incoming;
  try{incoming=new URL(url);}catch{return;}
  const isWebInvite=incoming.origin==='https://jefrisrenovation-netizen.github.io'&&incoming.pathname==='/invite/';
  const isLegacyInvite=incoming.protocol==='suiviheurespro:'&&incoming.hostname==='invite';
  const params=new URLSearchParams(incoming.hash.slice(1));
  if(isWebInvite||isLegacyInvite){
    if(inviteInProgress)return;
    inviteInProgress=true;
    try{
      await handleTeamInvite(isWebInvite?params.get('invite'):incoming.searchParams.get('token'));
    }catch(error){
      $('loginCard').classList.remove('hidden');
      setLogin(error.code?error.message:tt('failed'));
    }finally{
      inviteInProgress=false;
    }
    return;
  }
  const tokens=authTokens(url);
  if(!tokens)return;
  if(params.get('type')==='recovery')sessionStorage.setItem('suivi_recovery','1');
  if(params.get('type')==='invite')sessionStorage.setItem('suivi_new_invite','1');
  const {error}=await sb.auth.setSession(tokens);
  if(error){setLogin(tr('Ce lien a expiré. Demandez un nouveau lien.'));return;}
  await start();
}
if(Capacitor.isNativePlatform()){
  App.addListener('appUrlOpen',({url})=>handleAuthLink(url));
  App.getLaunchUrl().then(result=>{if(result?.url)handleAuthLink(result.url)});
  window.addEventListener('offline',()=>setStatus(tr('Hors ligne. Reconnectez-vous avant de modifier vos données.'),false));
  App.addListener('backButton',()=>{
    if(!$('companyReport').classList.contains('hidden'))closeCompanyReport();
    else if(!$('individualReport').classList.contains('hidden'))closeIndividualReport();
    else App.minimizeApp();
  });
}
async function exportMobileReport(mode){
  if(saving){setStatus(tr('Attendez la fin de l’enregistrement.'),false);return;}
  const sourceId=mode==='print-company'?'companyReport':mode==='print-worker'?'workerReport':'individualReport';
  let source=document.getElementById(sourceId);
  if(!source||source.classList.contains('hidden')){
    if(mode==='print-company'){
      await showCompanyReport();
      source=$('companyReport');
    }else if(mode!=='print-worker'){
      await showIndividualReport();
      source=$('individualReport');
    }
  }
  if(!source||source.classList.contains('hidden'))return;
  try{
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    doc.setFontSize(17);doc.text(String(mode==='print-worker'?teamState.access.company:profile.company_name||'Suivi des heures Pro'),14,18);
    doc.setFontSize(11);const heading=doc.splitTextToSize(source.querySelector('h2')?.textContent||'Rapport',180);doc.text(heading,14,26);
    const subtitle=doc.splitTextToSize((source.querySelector('p')||source.querySelector('#reportMonth'))?.textContent||monthName(),180);const subtitleY=28+heading.length*5;doc.text(subtitle,14,subtitleY);const tableY=subtitleY+subtitle.length*5+3;
    const logo=$('brandLogo');
    if(logo?.complete&&logo.naturalWidth){try{doc.addImage(logo, 'PNG',173,10,23,23)}catch{}}
    const table=source.querySelector('table');
    autoTable(doc,{head:[[...table.querySelectorAll('thead th')].map(e=>e.textContent)],body:[...table.querySelectorAll('tbody tr')].map(tr=>[...tr.querySelectorAll('td')].map(td=>td.textContent)),startY:tableY,styles:{fontSize:7,cellPadding:1.1,overflow:'linebreak'},headStyles:{fillColor:[183,25,32]},margin:{left:14,right:14},pageBreak:'auto',rowPageBreak:'avoid'});
    const summary=[...source.querySelectorAll('.stat')].map(e=>[e.querySelector('span')?.textContent||'',e.querySelector('b')?.textContent||'']);
    autoTable(doc,{body:summary,startY:(doc.lastAutoTable?.finalY||40)+4,styles:{fontSize:8,cellPadding:1.2},margin:{left:14,right:14},pageBreak:'auto'});
    const note=source.querySelector('#personalReportNote,#reportNote')?.textContent;
    if(note){let y=(doc.lastAutoTable?.finalY||40)+10;const lines=doc.splitTextToSize(note,180);if(y+lines.length*4>282){doc.addPage();y=15}doc.setFontSize(9);doc.text(lines,14,y)}
    const name=reportFilename(mode,source.dataset.reportMonth||ym());
    if(typeof Capacitor!=='undefined'&&Capacitor.isNativePlatform()){
      const base64=doc.output('datauristring').split(',')[1];
      await Filesystem.writeFile({path:name,data:base64,directory:Directory.Cache});
      const {uri}=await Filesystem.getUri({path:name,directory:Directory.Cache});
      try{await Share.share({title:source.querySelector('h2')?.textContent||'Rapport',files:[uri],dialogTitle:tr('Partager le rapport PDF')});}
      finally{await Filesystem.deleteFile({path:name,directory:Directory.Cache});}
    }else {
      const file=new File([doc.output('blob')],name,{type:'application/pdf'});
      if(navigator.canShare?.({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:source.querySelector('h2')?.textContent||'Rapport'});return;}catch(error){if(error.name==='AbortError')return;}}
      doc.save(name);
    }
  }catch(error){if(mode==='print-worker')teamNotice(tr('Export PDF impossible : ')+error.message);else setStatus(tr('Export PDF impossible : ')+error.message,false)}
}
printSelectedReport=exportMobileReport;
window.print=()=>exportMobileReport('print-individual');
async function requestAccountDeletion(){
  if(!user)return;
  const message='Supprimer définitivement votre compte, ses employés, ses heures et ses paiements ? Cette action est irréversible. Saisissez votre e-mail pour confirmer.';
  const email=prompt(tr(message));
  if(email===null)return;
  if(email.trim().toLowerCase()!==user.email.toLowerCase()){setStatus(tr('L’adresse ne correspond pas à votre compte.'),false);return;}
  const {error}=await sb.functions.invoke('delete-own-account',{body:{confirm_email:email.trim()}});
  if(error){setStatus(tr('Suppression non effectuée. Contactez jefrisrenovation@gmail.com : ')+error.message,false);return;}
  await sb.auth.signOut();location.reload();
}
const deletion=document.createElement('button');deletion.className='secondary';deletion.style.cssText='width:auto;margin-top:16px;color:#a52b24;background:transparent;border:1px solid #ddd';deletion.dataset.text='Supprimer mon compte et mes données';deletion.textContent=tr(deletion.dataset.text);deletion.onclick=requestAccountDeletion;
const deletionCard=document.createElement('section');deletionCard.className='card no-print';const deletionDetails=document.createElement('details');const deletionSummary=document.createElement('summary');deletionSummary.dataset.text='Gestion du compte';deletionSummary.textContent=tr(deletionSummary.dataset.text);const accountLogout=document.querySelector('[onclick="logout()"]');if(accountLogout){accountLogout.id='accountLogout';accountLogout.style.cssText='display:block;width:100%;margin-top:16px';}const accountDeleteArea=document.createElement('div');accountDeleteArea.style.cssText='border-top:1px solid #e5e7eb;margin-top:20px;padding-top:4px';accountDeleteArea.append(deletion);deletionDetails.append(deletionSummary);if(accountLogout)deletionDetails.append(accountLogout);deletionDetails.append(accountDeleteArea);deletionCard.append(deletionDetails);$('app').append(deletionCard);
applyLanguage();
