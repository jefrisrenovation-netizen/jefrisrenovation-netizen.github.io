// The shipped application bundle stays on-device; only account data goes to Supabase.
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
    await showIndividualReport();source=$('individualReport');
  }
  if(source.classList.contains('hidden'))return;
  try{
    const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    doc.setFontSize(17);doc.text(String(profile.company_name||'Suivi des heures Pro'),14,18);
    doc.setFontSize(11);doc.text(source.querySelector('h2')?.textContent||'Rapport',14,26);
    doc.text(source.querySelector('p')?.textContent||monthName(),14,33);
    const logo=$('brandLogo');
    if(logo?.complete&&logo.naturalWidth){try{doc.addImage(logo, 'PNG',258,10,23,23)}catch{}}
    const table=source.querySelector('table');
    autoTable(doc,{head:[[...table.querySelectorAll('thead th')].map(e=>e.textContent)],body:[...table.querySelectorAll('tbody tr')].map(tr=>[...tr.querySelectorAll('td')].map(td=>td.textContent)),startY:40,styles:{fontSize:9,cellPadding:3},headStyles:{fillColor:[183,25,32]},margin:{left:14,right:14}});
    const summary=[...source.querySelectorAll('.stat')].map(e=>[e.querySelector('span')?.textContent||'',e.querySelector('b')?.textContent||'']);
    autoTable(doc,{body:summary,startY:(doc.lastAutoTable?.finalY||40)+8,styles:{fontSize:10},margin:{left:14,right:14}});
    const note=source.querySelector('#reportNote')?.textContent;
    if(note){let y=(doc.lastAutoTable?.finalY||40)+10;if(y>185){doc.addPage();y=15}doc.setFontSize(9);doc.text(doc.splitTextToSize(note,268),14,y)}
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
