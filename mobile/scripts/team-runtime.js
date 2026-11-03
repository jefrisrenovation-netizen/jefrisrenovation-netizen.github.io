// Employee identities are resolved server-side. Company records keep their existing owner_id.
const teamState={role:null,booting:false,access:null,sites:[],members:[],days:[],month:new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0'),pane:'home',refresh:0};
const teamWords={
 accountManagement:['Gestion du compte','Gestão da conta','Account management'],status:['Statut','Situação','Status'],schedule:['Horaire par défaut','Horário padrão','Default hours'],
 resetMember:['Créer un lien pour un nouveau mot de passe','Criar link para nova senha','Create password reset link'],resetShare:['Lien pour définir un nouveau mot de passe (1 heure)','Link para definir nova senha (1 hora)','Password reset link (1 hour)'],invalid_phone:['Téléphone avec indicatif du pays, ex. +32470123456.','Telefone com código do país, ex. +32470123456.','Phone with country code, e.g. +32470123456.'],passwordSaved:['Mot de passe enregistré. Connectez-vous avec votre identifiant ou téléphone.','Senha salva. Entre com seu usuário ou telefone.','Password saved. Sign in with your username or phone.'],deleteUsername:['Saisissez votre identifiant pour supprimer votre accès personnel. L’historique de l’entreprise sera conservé.','Digite seu usuário para apagar seu acesso pessoal. O histórico da empresa será preservado.','Enter your username to delete your personal access. Company history will be retained.'],

 home:['Accueil','Início','Home'],team:['Équipe','Equipe','Team'],sites:['Chantiers','Obras','Projects'],reports:['Rapports','Relatórios','Reports'],settings:['Paramètres','Configurações','Settings'],
 register:['Enregistrer un nouvel horaire','Registrar novo horário','Record new hours'],month:['Résumé du mois','Resumo do mês','Monthly overview'],hours:['Heures','Horas','Hours'],days:['Jours','Dias','Days'],advances:['Avances','Adiantamentos','Advances'],due:['Total à payer','Total a pagar','Total due'],
 invite:['Inviter un employé','Convidar funcionário','Invite employee'],username:['Identifiant','Usuário','Username'],email:['E-mail (facultatif)','E-mail (opcional)','Email (optional)'],phone:['Téléphone','Telefone','Phone'],createInvite:['Créer le lien d’invitation','Criar link de convite','Create invite link'],share:['Partager','Compartilhar','Share'],copy:['Copier le lien','Copiar link','Copy link'],copied:['Lien copié','Link copiado','Link copied'],
 pending:['À approuver','Aguardando aprovação','Pending approval'],approved:['Approuvé','Aprovado','Approved'],rejected:['À corriger','Precisa de correção','Needs correction'],approve:['Approuver','Aprovar','Approve'],reject:['Demander une correction','Pedir correção','Request correction'],
 block:['Bloquer','Bloquear','Block'],unblock:['Débloquer','Desbloquear','Unblock'],active:['Actif','Ativo','Active'],blocked:['Accès bloqué. Contactez votre responsable.','Acesso bloqueado. Fale com seu administrador.','Access blocked. Contact your administrator.'],
 siteName:['Nom du chantier','Nome da obra','Project name'],address:['Adresse','Endereço','Address'],addSite:['Ajouter un chantier','Cadastrar obra','Add project'],noSites:['Aucun chantier enregistré','Nenhuma obra cadastrada','No projects yet'],noDays:['Aucune journée enregistrée ce mois','Nenhum dia registrado neste mês','No days recorded this month'],noTeam:['Ajoutez votre premier employé dans Équipe','Cadastre seu primeiro funcionário em Equipe','Add your first employee in Team'],
 worker:['Employé','Funcionário','Employee'],date:['Date','Data','Date'],entry:['Début','Início','Start'],exit:['Fin','Fim','End'],pause:['Pause (minutes)','Pausa (minutos)','Break (minutes)'],workplace:['Chantier / lieu de travail','Obra / local de trabalho','Project / workplace'],save:['Enregistrer','Salvar','Save'],cancel:['Annuler','Cancelar','Cancel'],edit:['Modifier','Editar','Edit'],ownDays:['Mes journées','Meus dias','My days'],company:['Entreprise','Empresa','Company'],
 password:['Mot de passe','Senha','Password'],confirm:['Confirmer le mot de passe','Confirmar senha','Confirm password'],setPassword:['Définir mon mot de passe','Definir minha senha','Set my password'],reset:['Mot de passe oublié','Esqueci minha senha','Forgot password'],recover:['Recevoir le lien par e-mail','Receber link por e-mail','Email reset link'],recoverySent:['Avec un e-mail, consultez votre boîte de réception. Sans e-mail, demandez un nouveau lien à votre responsable.','Com e-mail, confira sua caixa de entrada. Sem e-mail, peça um novo link ao administrador.','With email, check your inbox. Without email, ask your manager for a new link.'],
 saveOK:['Enregistré et synchronisé','Salvo e sincronizado','Saved and synced'],check:['Vérifiez les champs et réessayez.','Confira os campos e tente novamente.','Check the fields and try again.'],failed:['Impossible de terminer. Réessayez.','Não foi possível concluir. Tente novamente.','Unable to complete. Try again.'],loading:['Chargement…','Carregando…','Loading…'],sendHours:['Envoyer pour approbation','Enviar para aprovação','Submit for approval'],signout:['Déconnexion','Sair','Sign out'],
 invalid_credentials:['Identifiant ou mot de passe incorrect.','Usuário ou senha incorretos.','Incorrect username or password.'],username_taken:['Cet identifiant est déjà utilisé.','Este usuário já está em uso.','This username is already taken.'],invalid_username:['Utilisez 3 à 40 caractères : lettres sans accent, chiffres, point, tiret ou soulignement.','Use 3 a 40 caracteres: letras sem acento, números, ponto, hífen ou sublinhado.','Use 3–40 characters: unaccented letters, numbers, dots, hyphens or underscores.'],
 invalid_email:['Indiquez un e-mail valide différent du vôtre.','Informe um e-mail válido diferente do seu.','Enter a valid email different from yours.'],expired_invite:['Invitation expirée. Demandez un nouveau lien.','Convite expirado. Peça um novo link.','Invite expired. Request a new link.'],invite_email_mismatch:['Connectez-vous avec l’e-mail qui a reçu l’invitation.','Entre com o e-mail cadastrado no convite.','Sign in with the email registered on the invitation.'],try_later:['Trop de tentatives. Réessayez dans 15 minutes.','Muitas tentativas. Tente novamente em 15 minutos.','Too many attempts. Try again in 15 minutes.'],date_exists:['Cette date existe déjà. Modifiez la journée enregistrée.','Esta data já existe. Edite o dia registrado.','This date already exists. Edit the recorded day.'],approved_day_locked:['Journée approuvée. Demandez la modification au responsable.','Dia aprovado. Peça a alteração ao administrador.','Approved day. Ask your manager to make changes.'],linked_email_locked:['L’e-mail d’un accès activé ne peut pas être modifié ici.','O e-mail de um acesso ativado não pode ser alterado aqui.','An activated account’s email cannot be changed here.'],access_blocked:['Débloquez cet accès avant de créer une invitation.','Desbloqueie o acesso antes de criar um convite.','Unblock this account before creating an invite.'],
 inviteHelp:['Sans e-mail : partagez le lien par WhatsApp ou SMS. L’employé choisit son propre mot de passe. Téléphone avec indicatif du pays.','Sem e-mail: compartilhe o link por WhatsApp ou SMS. O funcionário escolhe a própria senha. Telefone com código do país.','Without email: share the link via WhatsApp or SMS. The employee chooses their own password. Include the phone country code.'],reviewHelp:['Les journées approuvées ne peuvent être modifiées que par le responsable.','Somente o administrador pode alterar dias aprovados.','Only the manager can edit approved days.'],reviewTitle:['Journées à approuver','Dias para aprovar','Days to approve'],noPending:['Aucune journée en attente','Nenhum dia aguardando aprovação','No days awaiting approval'],openApp:['Ouvrir l’application','Abrir aplicativo','Open app'],browser:['Continuer dans le navigateur','Continuar no navegador','Continue in browser'],appstore:['Télécharger sur l’App Store','Baixar na App Store','Download on the App Store'],accept:['Activer mon accès','Ativar meu acesso','Activate my access'],invitation:['Invitation à rejoindre l’équipe','Convite para entrar na equipe','Invitation to join the team'],
 deleteWorkerConfirm:['Supprimer définitivement votre accès personnel ? L’historique détenu par votre entreprise sera conservé. Saisissez votre e-mail pour confirmer.','Apagar definitivamente seu acesso pessoal? O histórico mantido pela empresa será preservado. Digite seu e-mail para confirmar.','Permanently delete your personal account? Company-owned work history will be retained. Enter your email to confirm.'],logoutRecovery:['Vous pouvez fermer cette fenêtre après l’enregistrement.','Após salvar, você poderá fechar esta janela.','You may close this window after saving.'],usernameEmail:['Identifiant, téléphone ou e-mail','Usuário, telefone ou e-mail','Username, phone or email'],payrollApproved:['Seules les journées approuvées sont incluses dans les paiements et rapports.','Somente dias aprovados entram nos pagamentos e relatórios.','Only approved days are included in payments and reports.'],notes:['Notes','Observações','Notes'],owner:['Administrateur','Administrador','Administrator'],fullName:['Nom complet','Nome completo','Full name'],allSaved:['Données synchronisées avec votre compte','Dados sincronizados com sua conta','Data synced with your account']
};
function tt(key){const lang=$('languageCode')?.value||document.documentElement.lang||'fr';const row=teamWords[key];return row?row[lang.startsWith('pt')?1:lang.startsWith('en')?2:0]:teamWords.failed[lang.startsWith('pt')?1:lang.startsWith('en')?2:0]}
function teamLabel(key){return `<span data-team-text="${key}">${esc(tt(key))}</span>`}
function teamTranslate(){document.querySelectorAll('[data-team-text]').forEach(e=>e.textContent=tt(e.dataset.teamText));$('email').placeholder=tt('usernameEmail');}
async function teamCall(action,payload={}){
 const {data:auth}=await sb.auth.getSession();
 const response=await fetch(SUPABASE_URL+'/functions/v1/team-access',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_KEY,...(auth.session?{Authorization:'Bearer '+auth.session.access_token}:{})},body:JSON.stringify({action,...payload})});
 const data=await response.json();if(!response.ok){const error=new Error(tt(data.error));error.code=data.error;throw error;}return data;
}
function teamNotice(error){const message=typeof error==='string'?error:error instanceof Error?error.message:tt('failed');const target=teamState.role==='employee'?$('workerNotice'):$('upgradeNotice');if(target){target.textContent=message;target.setAttribute('role','status');}else setLogin(message);}
function showPane(pane){
 teamState.pane=pane;for(const [id,p] of [['dashboard','home'],['teamPanel','team'],['timesheetPanel','team'],['accessPanel','team'],['sitesPanel','sites'],['reportActions','reports'],['reviewPanel','team'],['settingsPanel','settings']])$(id)?.classList.toggle('hidden',p!==pane);
 closeCompanyReport();closeIndividualReport();document.querySelectorAll('[data-pane]').forEach(e=>e.classList.toggle('selected',e.dataset.pane===pane));
 $('upgradeNotice').textContent='';$('mainNav')?.scrollIntoView({block:'start',behavior:'smooth'});
}
function teamField(key,id,type='text',value=''){return `<div><label for="${id}">${teamLabel(key)}</label><input id="${id}" type="${type}" value="${esc(value)}" ${type==='number'?'min="0" step="1"':''} required></div>`}
function setupOwnerUI(){
 if($('mainNav'))return;
 $('profileHeading').closest('section').id='settingsPanel';$('employee').closest('section').id='teamPanel';
 const defaults=$('employeeDefaults');if(defaults){const details=document.createElement('details');details.className='schedule-settings no-print';details.innerHTML=`<summary>${teamLabel('schedule')}</summary>`;details.append(defaults);$('settingsPanel').append(details);}$('title').closest('section').id='timesheetPanel';
 // Remove inherited test banner from the released interface.
 const banner=$('app').firstElementChild;if(banner?.textContent.includes('VERSÃO DE TESTE')||banner?.textContent.includes('Version de test'))banner.remove();
 const shell=document.createElement('div');shell.id='upgradeShell';shell.className='no-print';shell.innerHTML=`<nav id="mainNav" class="app-nav" aria-label="Navigation">${['home','team','sites','reports','settings'].map((p,i)=>`<button class="secondary" data-pane="${p}" onclick="teamUI.pane('${p}')"><span aria-hidden="true">${['⌂','♙','▦','▤','⚙'][i]}</span>${teamLabel(p)}</button>`).join('')}</nav><p id="upgradeNotice" class="status" role="status"></p><section id="dashboard" class="card"><div class="dashboard-head"><div><small>${teamLabel('owner')}</small><h2 id="dashboardCompany"></h2></div><input id="dashboardMonth" type="month" aria-label="${esc(tt('month'))}" onchange="teamUI.month(this.value)"></div><h2>${teamLabel('month')}</h2><div id="dashboardStats" class="summary"></div><button class="register-button" onclick="teamUI.day()">＋ ${teamLabel('register')}</button><h2>${teamLabel('team')}</h2><div id="dashboardTeam"></div><p class="muted">${teamLabel('payrollApproved')}</p><p class="muted">✓ ${teamLabel('allSaved')}</p></section>`;
 $('app').prepend(shell);
 const access=document.createElement('section');access.id='accessPanel';access.className='card hidden no-print';access.innerHTML=`<h2>${teamLabel('invite')}</h2><p class="muted">${teamLabel('inviteHelp')}</p><form id="inviteForm"><div class="grid"><div><label for="inviteEmployee">${teamLabel('worker')}</label><select id="inviteEmployee" required></select></div>${teamField('username','inviteUsername')}${teamField('email','inviteEmail','email')}${teamField('phone','invitePhone','tel')}</div><button type="submit">${teamLabel('createInvite')}</button></form><div id="inviteResult" class="hidden"></div><div id="memberList" class="access-list"></div>`;
 $('app').append(access);$('invitePhone').required=false;$('inviteEmail').required=false;const syncContact=()=>{$('invitePhone').required=!$('inviteEmail').value.trim();};$('inviteEmail').oninput=syncContact;syncContact();$('inviteUsername').pattern='[a-zA-Z0-9][a-zA-Z0-9._\\x2D]{2,39}';$('inviteUsername').maxLength=40;$('inviteUsername').placeholder='ex: teste.funcionario';$('inviteUsername').title='3–40: A–Z, a–z, 0–9, . _ -';
 $('inviteForm').onsubmit=async e=>{e.preventDefault();await withTeamButton(e.submitter,createTeamInvite)};
 const sites=document.createElement('section');sites.id='sitesPanel';sites.className='card hidden no-print';sites.innerHTML=`<h2>${teamLabel('sites')}</h2><form id="siteForm"><div class="grid">${teamField('siteName','siteName')}${teamField('address','siteAddress')}</div><button type="submit">＋ ${teamLabel('addSite')}</button></form><div id="siteList"></div>`;
 $('app').append(sites);$('siteAddress').required=false;$('siteForm').onsubmit=async e=>{e.preventDefault();await withTeamButton(e.submitter,async()=>{const {error}=await sb.from('work_sites').insert({owner_id:user.id,name:$('siteName').value.trim(),address:$('siteAddress').value.trim()});if(error)throw Error(tt('failed'));$('siteForm').reset();await upgradeRefresh();teamNotice(tt('saveOK'));});};
 const review=document.createElement('section');review.id='reviewPanel';review.className='card hidden no-print';review.innerHTML=`<h2>${teamLabel('reviewTitle')}</h2><p class="muted">${teamLabel('reviewHelp')}</p><div id="reviewList"></div>`;$('app').append(review);
 $('email').type='text';showPane('home');
}
async function withTeamButton(button,fn){if(button?.disabled)return;if(button)button.disabled=true;try{await fn()}catch(error){teamNotice(error)}finally{if(button)button.disabled=false}}
async function upgradeRefresh(){
 if(teamState.role!=='owner'||!$('dashboard'))return;const request=++teamState.refresh,month=ym();if(!/^\d{4}-\d{2}$/.test(month))return;
 const results=await Promise.all([sb.from('employees').select('*').eq('owner_id',user.id).order('name'),sb.from('work_days').select('*').eq('owner_id',user.id).gte('work_date',monthStart()).lte('work_date',monthEnd()),sb.from('monthly_payments').select('*').eq('owner_id',user.id).eq('month',monthStart()),sb.from('work_sites').select('id,name,address').eq('owner_id',user.id).eq('active',true).order('name'),teamCall('members')]);
 if(request!==teamState.refresh)return;for(const result of results.slice(0,4))if(result.error)throw Error(tt('failed'));
 const [staff,days,payments,sites]=results.slice(0,4).map(r=>r.data||[]),report=buildCompanyReport(staff,days,payments);teamState.sites=sites;teamState.members=results[4].members;
 const currencies=[...new Set(report.rows.map(r=>r.currency))],currency=currencies[0]||profile.preferred_currency||'EUR';
 const stats=[[tt('hours'),fmt(days.reduce((sum,d)=>sum+minutes(d.entry_time,d.exit_time,d.break_minutes),0))],[tt('days'),report.rows.reduce((sum,r)=>sum+r.days,0)],[tt('advances'),currencies.length>1?'—':formatMoney(report.advance,currency)],[tt('due'),currencies.length>1?'—':formatMoney(report.due,currency)]];
 $('dashboardStats').innerHTML=stats.map(([label,value])=>`<div class="stat"><b>${esc(value)}</b><span>${esc(label)}</span></div>`).join('');$('dashboardCompany').textContent=profile.company_name||'Suivi des heures Pro';$('dashboardMonth').value=month;
 $('dashboardTeam').innerHTML=staff.filter(e=>e.active).map(e=>`<button class="worker-tile secondary" data-employee="${e.id}"><strong>${esc(e.name)}</strong><span>${fmt(days.filter(d=>d.employee_id===e.id).reduce((sum,d)=>sum+minutes(d.entry_time,d.exit_time,d.break_minutes),0))} ›</span></button>`).join('')||`<p>${esc(tt('noTeam'))}</p>`;
 $('dashboardTeam').querySelectorAll('[data-employee]').forEach(b=>b.onclick=async()=>{$('employee').value=b.dataset.employee;await loadRecords();showPane('team');});
 const selected=$('inviteEmployee').value;$('inviteEmployee').innerHTML=staff.filter(e=>e.active).map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('');if(selected)$('inviteEmployee').value=selected;
 $('siteList').innerHTML=sites.map(s=>`<article class="project-tile"><strong>${esc(s.name)}</strong><p>${esc(s.address)}</p></article>`).join('')||`<p>${esc(tt('noSites'))}</p>`;
 $('memberList').innerHTML=teamState.members.map(m=>`<article class="project-tile"><strong>${esc(staff.find(e=>e.id===m.employee_id)?.name||m.username)}</strong><p>${esc(m.username)} · ${esc(m.activated_at?tt('active'):tt('pending'))}</p><button class="secondary" data-member="${m.id}" data-enabled="${!m.enabled}">${esc(tt(m.enabled?'block':'unblock'))}</button>${m.login_method==='phone'&&m.activated_at&&m.enabled?`<button class="secondary" data-reset-member="${m.id}">${esc(tt('resetMember'))}</button>`:''}</article>`).join('');
 $('memberList').querySelectorAll('[data-member]').forEach(b=>b.onclick=()=>withTeamButton(b,async()=>{await teamCall('set_access',{id:b.dataset.member,enabled:b.dataset.enabled==='true'});await upgradeRefresh()}));
 $('memberList').querySelectorAll('[data-reset-member]').forEach(b=>b.onclick=()=>withTeamButton(b,async()=>{showTeamInvitation({...await teamCall('reset_phone',{id:b.dataset.resetMember}),reset:true});}));
 $('reviewList').innerHTML=days.filter(d=>d.approval_status==='pending').map(d=>`<article class="project-tile"><strong>${esc(staff.find(e=>e.id===d.employee_id)?.name||'')} · ${esc(d.work_date)}</strong><p>${esc(d.entry_time?.slice(0,5)||'')}–${esc(d.exit_time?.slice(0,5)||'')} · ${Number(d.break_minutes)} min · ${esc(d.workplace||'')}</p><div class="actions"><button class="green" data-review="${d.id}" data-status="approved">${esc(tt('approve'))}</button><button class="secondary" data-review="${d.id}" data-status="rejected">${esc(tt('reject'))}</button></div></article>`).join('')||`<p>${esc(tt('noPending'))}</p>`;
 $('reviewList').querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>withTeamButton(b,async()=>{await teamCall('review_day',{id:b.dataset.review,status:b.dataset.status});await upgradeRefresh();await loadRecords()}));
 teamTranslate();
}

async function createTeamInvite(){
 const invitation=await teamCall('invite',{employee_id:$('inviteEmployee').value,username:$('inviteUsername').value,email:$('inviteEmail').value,phone:$('invitePhone').value});
 showTeamInvitation(invitation);await upgradeRefresh();
}
function showTeamInvitation(invitation){
 const result=$('inviteResult');result.classList.remove('hidden');result.innerHTML=`<p><strong>${esc(invitation.username)}</strong></p><input readonly aria-label="Invitation" value="${esc(invitation.url)}"><div class="actions"><a class="button green" id="shareWhatsApp" target="_blank" rel="noopener">WhatsApp</a><a class="button secondary" id="shareSMS">SMS</a><a class="button secondary" id="shareEmail">E-mail</a><button class="secondary" id="copyInvite">${esc(tt('copy'))}</button></div>`;
 const message=tt(invitation.reset?'resetShare':'invitation')+' — '+(profile.company_name||'Suivi des heures Pro')+'\n'+invitation.url;
 const phone=invitation.phone.replace(/\D/g,'');$('shareWhatsApp').href='https://wa.me/'+phone+'?text='+encodeURIComponent(message);$('shareSMS').href='sms:'+phone+(/iPhone|iPad/.test(navigator.userAgent)?'&':'?')+'body='+encodeURIComponent(message);$('shareEmail').href='mailto:'+encodeURIComponent(invitation.email)+'?subject='+encodeURIComponent(tt('invitation'))+'&body='+encodeURIComponent(message);
 $('shareEmail').classList.toggle('hidden',!invitation.email);
 $('copyInvite').onclick=async()=>{try{await navigator.clipboard.writeText(invitation.url);$('copyInvite').textContent=tt('copied')}catch{result.querySelector('input').select()}};
}
function selectSiteHtml(id){return `<select id="${id}" aria-label="${esc(tt('sites'))}"><option value="">—</option>${teamState.sites.map(s=>`<option value="${esc(s.name+(s.address?' — '+s.address:''))}">${esc(s.name)}</option>`).join('')}</select>`}
function scheduleHTML(prefix){
 return `<section class="default-schedule"><h2>${teamLabel('schedule')}</h2>${['entry','exit','pause'].map((key,i)=>`<div class="schedule-row"><label for="${prefix}${['Entry','Exit','Pause'][i]}">${teamLabel(key)}</label><input id="${prefix}${['Entry','Exit','Pause'][i]}" type="${i===2?'number':'time'}" ${i===2?'min="0" max="1440" step="1"':''} required></div>`).join('')}<p id="${prefix}Status" class="status" role="status"></p></section>`;
}
function wireSchedule(prefix,getEmployee,isWorker=false){
 const fill=()=>{const emp=getEmployee()||{};$(prefix+'Entry').value=(emp.default_entry_time||'08:00').slice(0,5);$(prefix+'Exit').value=(emp.default_exit_time||'17:30').slice(0,5);$(prefix+'Pause').value=emp.default_break_minutes??30;};fill();
 let saving=false;
 for(const suffix of ['Entry','Exit','Pause'])$(prefix+suffix).onchange=async()=>{
  if(saving)return;const emp=getEmployee();if(!emp?.id)return;
  const entry=$(prefix+'Entry').value,exit=$(prefix+'Exit').value,pause=Number($(prefix+'Pause').value);
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(entry)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(exit)||!Number.isInteger(pause)||pause<0||pause>1440){$(prefix+'Status').textContent=tt('check');return;}
  saving=true;for(const key of ['Entry','Exit','Pause'])$(prefix+key).disabled=true;
  const values={default_entry_time:entry,default_exit_time:exit,default_break_minutes:pause};
  try{
   if(isWorker){await teamCall('save_my_defaults',{entry_time:entry,exit_time:exit,break_minutes:pause});}
   else {const {error}=await sb.from('employees').update(values).eq('id',emp.id).eq('owner_id',user.id).select('id').single();if(error)throw Error(tt('failed'));}
   Object.assign(emp,values);$(prefix+'Status').textContent=tt('saveOK');if(isWorker){for(const other of ['workerSchedule','workerDialogSchedule'])if(other!==prefix&&$(other+'Entry')){$(other+'Entry').value=entry;$(other+'Exit').value=exit;$(other+'Pause').value=pause;}}
   if(!isWorker&&$('employee').value===emp.id){$('defaultEntry').value=entry;$('defaultExit').value=exit;$('defaultBreak').value=pause;}
  }catch(error){$(prefix+'Status').textContent=error.message;fill();}
  finally{saving=false;for(const key of ['Entry','Exit','Pause'])$(prefix+key).disabled=false;}
 };
 return fill;
}
function dayFormHTML(prefix,employeeSelect=''){
 return `<form id="${prefix}Form">${employeeSelect}<div class="grid">${teamField('date',prefix+'Date','date',ym()+'-01')}${teamField('entry',prefix+'Entry','time','08:00')}${teamField('exit',prefix+'Exit','time','17:30')}${teamField('pause',prefix+'Pause','number','30')}<div><label>${teamLabel('hours')}</label><p id="${prefix}Hours"></p></div></div><label for="${prefix}Site">${teamLabel('sites')}</label>${selectSiteHtml(prefix+'Site')}${teamField('workplace',prefix+'Workplace')}<div class="actions"><button type="submit">${teamLabel(teamState.role==='employee'?'sendHours':'save')}</button><button type="button" class="secondary" onclick="this.closest('dialog').close()">${teamLabel('cancel')}</button></div><p id="${prefix}Error" class="status err" role="alert"></p></form>`;
}
function wireDayForm(prefix){
 const site=$(prefix+'Site'),place=$(prefix+'Workplace');site.onchange=()=>{place.value=site.value};place.required=false;
 const update=()=>{$(prefix+'Hours').textContent=fmt(minutes($(prefix+'Entry').value,$(prefix+'Exit').value,$(prefix+'Pause').value));};
 for(const suffix of ['Entry','Exit','Pause'])$(prefix+suffix).oninput=update;update();
}
function readDayForm(prefix){return {work_date:$(prefix+'Date').value,entry_time:$(prefix+'Entry').value,exit_time:$(prefix+'Exit').value,break_minutes:Number($(prefix+'Pause').value),workplace:$(prefix+'Workplace').value.trim()};}
function ownerDayDialog(id){
 const record=records.find(r=>r.id===id);
 if(!employees.length){showPane('team');return;}
 let dialog=$('ownerDayDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='ownerDayDialog';document.body.append(dialog)}
 dialog.innerHTML=scheduleHTML('ownerSchedule')+`<h2>${teamLabel('register')}</h2>`+dayFormHTML('ownerDay',`<label for="ownerDayEmployee">${teamLabel('worker')}</label><select id="ownerDayEmployee">${employees.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select>`);
 $('ownerDayEmployee').value=record?.employee_id||$('employee').value;wireDayForm('ownerDay');const defaults=employees.find(e=>e.id===$('ownerDayEmployee').value);$('ownerDayDate').value=record?.work_date||$('newDate').value||ym()+'-01';$('ownerDayEntry').value=(record?.entry_time||defaults?.default_entry_time||'08:00').slice(0,5);$('ownerDayExit').value=(record?.exit_time||defaults?.default_exit_time||'17:30').slice(0,5);$('ownerDayPause').value=record?.break_minutes??defaults?.default_break_minutes??30;$('ownerDayWorkplace').value=record?.workplace||'';$('ownerDayEntry').oninput();
 const fillSchedule=wireSchedule('ownerSchedule',()=>employees.find(e=>e.id===$('ownerDayEmployee').value));$('ownerDayEmployee').onchange=()=>{fillSchedule();if(!record){const emp=employees.find(e=>e.id===$('ownerDayEmployee').value);$('ownerDayEntry').value=(emp?.default_entry_time||'08:00').slice(0,5);$('ownerDayExit').value=(emp?.default_exit_time||'17:30').slice(0,5);$('ownerDayPause').value=emp?.default_break_minutes??30;$('ownerDayEntry').oninput();}};
 $('ownerDayForm').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{const payload={...readDayForm('ownerDay'),owner_id:user.id,employee_id:$('ownerDayEmployee').value};const {error}=record?await sb.from('work_days').update(payload).eq('id',record.id).eq('owner_id',user.id):await sb.from('work_days').insert(payload);if(error)throw Error(error.code==='23505'?tt('date_exists'):tt('failed'));$('employee').value=$('ownerDayEmployee').value;await loadRecords();await upgradeRefresh();dialog.close();teamNotice(tt('saveOK'));}catch(error){$('ownerDayError').textContent=error.message}finally{button.disabled=false}};dialog.showModal();
}
async function workerPortal(){
 $('app').classList.add('hidden');$('loginCard').classList.add('hidden');
 let portal=$('workerPortal');if(!portal){portal=document.createElement('section');portal.id='workerPortal';portal.className='card';document.querySelector('main').append(portal);}
 portal.innerHTML=`<p class="muted">${esc(teamState.access.company)}</p><h2>${esc(teamState.access.employee.name)}</h2>${scheduleHTML('workerSchedule')}<div class="actions"><button onclick="teamUI.workerDay()">＋ ${teamLabel('register')}</button></div><label for="workerMonth">${teamLabel('month')}</label><input id="workerMonth" type="month" value="${esc(teamState.month)}"><p id="workerNotice" class="status" role="status"></p><p class="muted">${teamLabel('reviewHelp')}</p><h2>${teamLabel('ownDays')}</h2><div id="workerDays"></div>`;
 wireSchedule('workerSchedule',()=>teamState.access.employee,true);
 $('workerMonth').onchange=async()=>{teamState.month=$('workerMonth').value;try{await loadWorkerDays()}catch(e){teamNotice(e)}};portal.classList.remove('hidden');const settings=document.createElement('details');settings.className='project-tile';settings.innerHTML=`<summary>${teamLabel('accountManagement')}</summary><button id="workerLogout" class="secondary" style="display:block;width:100%;margin-top:16px" onclick="logout()">${teamLabel('signout')}</button><div style="border-top:1px solid #e5e7eb;margin-top:20px;padding-top:4px"><button id="workerDelete" class="secondary" style="margin-top:12px;color:#a52b24">${esc(tr('Supprimer mon compte et mes données'))}</button></div>`;portal.append(settings);$('workerDelete').onclick=requestEmployeeDeletion;await loadWorkerDays();
}
async function loadWorkerDays(){
 const result=await teamCall('my_days',{month:teamState.month});teamState.days=result.days;teamState.sites=result.sites;
 $('workerDays').innerHTML=result.days.length?`<div class="compact-sheet-wrap"><table class="compact-sheet"><thead><tr>${['date','entry','exit','pause','workplace','hours','status'].map(k=>`<th>${esc(tt(k))}</th>`).join('')}<th></th></tr></thead><tbody>${result.days.map(d=>`<tr><td><time datetime="${esc(d.work_date)}">${esc(d.work_date.slice(8,10)+'/'+d.work_date.slice(5,7))}</time></td><td>${esc(d.entry_time?.slice(0,5)||'')}</td><td>${esc(d.exit_time?.slice(0,5)||'')}</td><td>${Number(d.break_minutes)}</td><td>${esc(d.workplace||'—')}</td><td><b>${fmt(minutes(d.entry_time,d.exit_time,d.break_minutes))}</b></td><td><span class="approval ${d.approval_status}">${esc(tt(d.approval_status))}</span></td><td>${d.approval_status!=='approved'?`<button class="secondary" aria-label="${esc(tt('edit'))}" data-day="${d.id}">✎</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:`<p>${esc(tt('noDays'))}</p>`;
 $('workerDays').querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>workerDayDialog(b.dataset.day));
}
function workerDayDialog(id){
 const record=teamState.days.find(d=>d.id===id);let dialog=$('workerDayDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='workerDayDialog';document.body.append(dialog)}
 dialog.innerHTML=scheduleHTML('workerDialogSchedule')+`<h2>${teamLabel('register')}</h2>`+dayFormHTML('workerDay');wireDayForm('workerDay');wireSchedule('workerDialogSchedule',()=>teamState.access.employee,true);const employee=teamState.access.employee;
 $('workerDayDate').value=record?.work_date||teamState.month+'-01';$('workerDayEntry').value=(record?.entry_time||employee.default_entry_time||'08:00').slice(0,5);$('workerDayExit').value=(record?.exit_time||employee.default_exit_time||'17:30').slice(0,5);$('workerDayPause').value=record?.break_minutes??employee.default_break_minutes??30;$('workerDayWorkplace').value=record?.workplace||'';$('workerDayEntry').oninput();
 $('workerDayForm').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{await teamCall('save_my_day',{...readDayForm('workerDay'),...(id?{id}:{})});teamState.month=$('workerDayDate').value.slice(0,7);$('workerMonth').value=teamState.month;await loadWorkerDays();dialog.close();teamNotice(tt('saveOK'));}catch(error){$('workerDayError').textContent=error.message}finally{button.disabled=false}};dialog.showModal();
}
function passwordSetup(activate=false,inviteToken=null){
 let dialog=$('passwordSetup');if(!dialog){dialog=document.createElement('dialog');dialog.id='passwordSetup';document.body.append(dialog)}
 dialog.innerHTML=`<h2>${teamLabel('setPassword')}</h2><form id="passwordSetupForm">${teamField('password','newAccessPassword','password')}${teamField('confirm','newAccessConfirmation','password')}<button type="submit">${teamLabel('save')}</button><p id="passwordSetupError" role="alert" class="status err"></p></form>`;
 for(const id of ['newAccessPassword','newAccessConfirmation']){$(id).minLength=8;$(id).autocomplete='new-password';}
 $('passwordSetupForm').onsubmit=async e=>{e.preventDefault();if($('newAccessPassword').value!==$('newAccessConfirmation').value){$('passwordSetupError').textContent=tt('check');return;}const button=e.submitter;button.disabled=true;try{if(inviteToken){const result=await teamCall('redeem_phone',{token:inviteToken,password:$('newAccessPassword').value});sessionStorage.removeItem('suivi_invite');sessionStorage.removeItem('suivi_new_invite');const saved=await sb.auth.setSession(result.session);if(saved.error)throw saved.error;dialog.close();teamState.role=null;await teamBoot();return;}const {error}=await sb.auth.updateUser({password:$('newAccessPassword').value});if(error)throw Error(tt('check'));if(activate)await teamCall('activate');sessionStorage.removeItem('suivi_recovery');sessionStorage.removeItem('suivi_invite');sessionStorage.removeItem('suivi_new_invite');dialog.close();teamState.role=null;await teamBoot();}catch(error){$('passwordSetupError').textContent=error.message}finally{button.disabled=false}};dialog.showModal();
}
async function requestPasswordReset(){
 const identifier=$('email').value.trim();if(!identifier){setLogin(tt('usernameEmail'));return;}
 const button=$('passwordResetButton');button.disabled=true;try{if(identifier.includes('@'))await sb.auth.resetPasswordForEmail(identifier,{redirectTo:'https://jefrisrenovation-netizen.github.io/preview/'});else await teamCall('recover',{username:identifier});setLogin(tt('recoverySent'),true)}catch{setLogin(tt('failed'))}finally{button.disabled=false}
}
async function teamBoot(){
 const {data}=await sb.auth.getSession();if(!data.session)return;if(teamState.booting)return;teamState.booting=true;
 try{
  user=data.session.user;
  const token=sessionStorage.getItem('suivi_invite');const recovery=sessionStorage.getItem('suivi_recovery');
  // Existing users prove possession of their verified email before linking an invitation.
  if(token&&!sessionStorage.getItem('suivi_new_invite')){await teamCall('claim_invite',{token});sessionStorage.removeItem('suivi_invite');}
  const access=await teamCall('access');teamState.access=access;teamState.role=access.role;
  if(access.language)$('languageCode').value=access.language;
  if(recovery||access.role==='activation'){passwordSetup(access.role==='activation');return;}
  if(access.role==='blocked'){$('app').classList.add('hidden');$('loginCard').classList.remove('hidden');setLogin(tt('blocked'));return;}
  if(access.role==='employee'){await workerPortal();return;}
  $('workerPortal')?.classList.add('hidden');await startLegacy();setupOwnerUI();await upgradeRefresh();teamTranslate();
 }catch(error){$('app').classList.add('hidden');$('loginCard').classList.remove('hidden');setLogin(error.message||tt('failed'));}
 finally{teamState.booting=false}
}
// Recovery state is captured before Auth removes tokens from the address bar.
try{const params=new URLSearchParams(location.hash.slice(1));if(params.get('type')==='recovery')sessionStorage.setItem('suivi_recovery','1');if(params.get('type')==='invite')sessionStorage.setItem('suivi_new_invite','1');}catch{}
window.teamUI={pane:showPane,day:ownerDayDialog,editDay:id=>ownerDayDialog(id),workerDay:workerDayDialog,month:async value=>{if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))return;$('year').value=value.slice(0,4);$('month').value=value.slice(5,7);await loadRecords();await upgradeRefresh();},recover:requestPasswordReset};
window.showPasswordSetup=passwordSetup;
const resetButton=document.createElement('button');resetButton.id='passwordResetButton';resetButton.type='button';resetButton.className='secondary';resetButton.style.marginTop='10px';resetButton.innerHTML=teamLabel('reset');resetButton.onclick=requestPasswordReset;$('loginCard').append(resetButton);$('email').type='text';
const previousLanguage=applyLanguage;applyLanguage=function(){previousLanguage();teamTranslate();if(teamState.role==='owner')upgradeRefresh().catch(teamNotice)};
for(const fn of ['loadEmployees','loadRecords']){
 const original=fn==='loadEmployees'?loadEmployees:loadRecords;
 const wrapped=async(...args)=>{await original(...args);if(teamState.role==='owner'&&$('dashboard'))await upgradeRefresh()};
 if(fn==='loadEmployees')loadEmployees=wrapped;else loadRecords=wrapped;
}
teamTranslate();
try{const initial=new URLSearchParams(location.hash.slice(1));if(initial.get('username'))$('email').value=initial.get('username');}catch{}

async function handleTeamInvite(token){
 if(!/^[a-f0-9]{64}$/.test(token||'')){setLogin(tt('expired_invite'));return;}
 sessionStorage.setItem('suivi_invite',token);
 const result=await teamCall('resolve_invite',{token,native:true});
 if(result.login_method==='phone'){sessionStorage.removeItem('suivi_invite');passwordSetup(false,token);return;}
 if(result.activation_url){sessionStorage.setItem('suivi_new_invite','1');location.assign(result.activation_url);}
 else {setLogin(tt('inviteHelp')+' '+result.username);await start();}
}

async function requestEmployeeDeletion(){
 const managed=user.email.endsWith('@staff.suivi.invalid');const text=tt(managed?'deleteUsername':'deleteWorkerConfirm');
 const email=prompt(text);if(email===null)return;
 if(email.trim().toLowerCase()!==(managed?teamState.access.username:user.email).toLowerCase()){teamNotice(tt('check'));return;}
 const {error}=await sb.functions.invoke('delete-own-account',{body:{confirm_email:managed?user.email:email.trim()}});
 if(error){teamNotice(tt('failed'));return;}await sb.auth.signOut();location.reload();
}
