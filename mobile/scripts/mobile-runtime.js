// The shipped application bundle stays on-device; only account data goes to Supabase.
async function loginWithPassword(){
  const button=$('passwordLoginButton');
  if(button.disabled)return;
  const email=$('email').value.trim();
  const password=$('loginPassword').value;
  if(!email||!password){setLogin('Saisissez votre e-mail et votre mot de passe.');return;}
  button.disabled=true;
  setLogin('Connexion en cours…',true);
  try{
    const {error}=await sb.auth.signInWithPassword({email,password});
    if(error){setLogin('Connexion impossible. Vérifiez vos identifiants.');return;}
    $('loginPassword').value='';
    await start();
  }catch{setLogin('Connexion impossible. Vérifiez votre connexion Internet et réessayez.');}
  finally{button.disabled=false;}
}
const passwordAccess=document.createElement('details');
passwordAccess.style.marginTop='16px';
const passwordSummary=document.createElement('summary');
passwordSummary.textContent='Se connecter avec un mot de passe';
const passwordForm=document.createElement('form');
const passwordLabel=document.createElement('label');
passwordLabel.htmlFor='loginPassword';passwordLabel.textContent='Mot de passe';
passwordLabel.style.marginTop='12px';
const passwordInput=document.createElement('input');
passwordInput.id='loginPassword';passwordInput.type='password';
passwordInput.autocomplete='current-password';passwordInput.required=true;
const passwordButton=document.createElement('button');
passwordButton.id='passwordLoginButton';passwordButton.type='submit';
passwordButton.textContent='Se connecter';passwordButton.style.marginTop='8px';
passwordForm.append(passwordLabel,passwordInput,passwordButton);
passwordForm.onsubmit=event=>{event.preventDefault();loginWithPassword();};
passwordAccess.append(passwordSummary,passwordForm);
$('loginCard').append(passwordAccess);
async function handleAuthLink(url){
  const tokens=authTokens(url);
  if(!tokens)return;
  const {error}=await sb.auth.setSession(tokens);
  if(error){setLogin('Ce lien a expiré. Demandez un nouveau lien.');return;}
  await start();
}
if(Capacitor.isNativePlatform()){
  App.addListener('appUrlOpen',({url})=>handleAuthLink(url));
  App.getLaunchUrl().then(result=>{if(result?.url)handleAuthLink(result.url)});
  window.addEventListener('offline',()=>setStatus('Hors ligne. Reconnectez-vous avant de modifier vos données.',false));
  App.addListener('backButton',()=>{
    if(!$('companyReport').classList.contains('hidden'))closeCompanyReport();
    else if(!$('individualReport').classList.contains('hidden'))closeIndividualReport();
    else App.minimizeApp();
  });
}
async function exportMobileReport(mode){
  if(saving){setStatus('Attendez la fin de l’enregistrement.',false);return;}
  let source=document.getElementById(mode==='print-company'?'companyReport':'individualReport');
  if(!source||source.classList.contains('hidden')){
    if(mode==='print-company'){
      await showCompanyReport();
      source=$('companyReport');
    }else{
      await showIndividualReport();
      source=$('individualReport');
    }
  }
  if(!source||source.classList.contains('hidden'))return;
  try{
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    doc.setFontSize(17);doc.text(String(profile.company_name||'Suivi des heures Pro'),14,18);
    doc.setFontSize(11);doc.text(source.querySelector('h2')?.textContent||'Rapport',14,26);
    doc.text(source.querySelector('p')?.textContent||monthName(),14,33);
    const logo=$('brandLogo');
    if(logo?.complete&&logo.naturalWidth){try{doc.addImage(logo, 'PNG',173,10,23,23)}catch{}}
    const table=source.querySelector('table');
    autoTable(doc,{head:[[...table.querySelectorAll('thead th')].map(e=>e.textContent)],body:[...table.querySelectorAll('tbody tr')].map(tr=>[...tr.querySelectorAll('td')].map(td=>td.textContent)),startY:40,styles:{fontSize:8,cellPadding:2,overflow:'linebreak'},headStyles:{fillColor:[183,25,32]},margin:{left:14,right:14},pageBreak:'auto',rowPageBreak:'avoid'});
    const summary=[...source.querySelectorAll('.stat')].map(e=>[e.querySelector('span')?.textContent||'',e.querySelector('b')?.textContent||'']);
    autoTable(doc,{body:summary,startY:(doc.lastAutoTable?.finalY||40)+8,styles:{fontSize:9,cellPadding:2},margin:{left:14,right:14},pageBreak:'auto'});
    const note=source.querySelector('#reportNote')?.textContent;
    if(note){let y=(doc.lastAutoTable?.finalY||40)+10;const lines=doc.splitTextToSize(note,180);if(y+lines.length*4>282){doc.addPage();y=15}doc.setFontSize(9);doc.text(lines,14,y)}
    const name=reportFilename(mode,ym());
    if(Capacitor.isNativePlatform()){
      const base64=doc.output('datauristring').split(',')[1];
      await Filesystem.writeFile({path:name,data:base64,directory:Directory.Cache});
      const {uri}=await Filesystem.getUri({path:name,directory:Directory.Cache});
      await Share.share({title:'Rapport mensuel',files:[uri],dialogTitle:'Partager le rapport PDF'});
      // Do not leave previous salary reports in the app cache after sharing.
      await Filesystem.deleteFile({path:name,directory:Directory.Cache});
    }else doc.save(name);
  }catch(error){setStatus('Export PDF impossible : '+error.message,false)}
}
printSelectedReport=exportMobileReport;
window.print=()=>exportMobileReport('print-individual');
async function requestAccountDeletion(){
  if(!user)return;
  const message='Supprimer définitivement votre compte, ses employés, ses heures et ses paiements ? Cette action est irréversible. Saisissez votre e-mail pour confirmer.';
  const email=prompt(message);
  if(email===null)return;
  if(email.trim().toLowerCase()!==user.email.toLowerCase()){setStatus('L’adresse ne correspond pas à votre compte.',false);return;}
  const {error}=await sb.functions.invoke('delete-own-account',{body:{confirm_email:email.trim()}});
  if(error){setStatus('Suppression non effectuée. Contactez jefrisrenovation@gmail.com : '+error.message,false);return;}
  await sb.auth.signOut();location.reload();
}
const deletion=document.createElement('button');deletion.className='danger';deletion.textContent='Supprimer mon compte et mes données';deletion.onclick=requestAccountDeletion;
const deletionCard=document.createElement('section');deletionCard.className='card no-print';deletionCard.append(deletion);$('app').append(deletionCard);
