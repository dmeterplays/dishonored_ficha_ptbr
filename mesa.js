import {db,getAuth} from './personagens-common.js';
import {initMasterEditor} from './mesa-mestre.js?v=resource-tracks1';
import {renderOwnedGear} from './active-upgrade-ui.js?v=2';
import {allActions} from './combat-actions.js?v=actions3';
const $=id=>document.getElementById(id),roomId=new URLSearchParams(location.search).get('id');
const isUuid=x=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x||'');
const node=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined&&txt!==null)e.textContent=String(txt);if(cls)e.className=cls;return e};
let trackLimits={};let ownedCombatItems=[];let lastGearCharacter=null;let me,room,roster=[],enemies=[],mine=null,mySheet=null,items=[],stock=[],purchases=[],tab='sheet',rollMode='quick',busy=false,costs={},gmEditor=null,realtimeChannel=null,presenceChannel=null,presenceReady=false,onlineUsers=new Set(),roomRefreshTimer=null,rollRefreshTimer=null,rollsSnapshot='',queuedRoomRefresh=false,lastRoll=null,mobileView='rolls';
const gm=()=>room?.owner_id===me?.id;
const say=(id,msg,bad=false)=>{$(id).textContent=msg;$(id).className=bad?'error':'status'};
const clip=x=>String(x??'').slice(0,5000);
const fmt=n=>Number(n||0).toLocaleString('pt-BR');
const byId=x=>items.find(i=>i.id===x);
const owns=x=>purchases.filter(p=>p.catalog_id===x.id);
const storeRecord=x=>stock.find(s=>s.catalog_id===x.id);
const available=x=>{const s=storeRecord(x);return !s||(s.available&&s.quantity!==0)};

const isMobile=()=>window.matchMedia('(max-width:760px)').matches;

const desktopPanels=[
 {id:'sheets',element:'table-sheets',label:'Fichas',weight:1.05},
 {id:'rolls',element:'table-rolls',label:'Rolagem',weight:1.25},
 {id:'history',element:'table-history',label:'Histórico',weight:1.15},
 {id:'character',element:'table-actions',label:'Ficha e ações',weight:1.35}
];
const panelPreferenceKey='dh-desktop-table-panels-v1:'+roomId;
let desktopPanelState=Object.fromEntries(desktopPanels.map(p=>[p.id,true]));
function loadDesktopPanels(){
 try{
  const saved=JSON.parse(localStorage.getItem(panelPreferenceKey)||'null');
  if(saved&&typeof saved==='object'&&!Array.isArray(saved)){
   // Preferências antigas tinham "Dados e histórico" como um único painel.
   // Se o histórico ainda não existir na preferência, respeite a visibilidade anterior de Dados.
   const restored=Object.fromEntries(desktopPanels.map(p=>[
    p.id,p.id==='history'&&typeof saved.history!=='boolean'?saved.rolls!==false:saved[p.id]!==false
   ]));
   if(Object.values(restored).some(Boolean))desktopPanelState=restored;
  }
 }catch(error){console.warn('Não foi possível restaurar a visualização dos painéis.',error)}
}
function renderDesktopPanels(){
 const table=$('table');
 const active=desktopPanels.filter(p=>desktopPanelState[p.id]);
 const any=active.length?active:desktopPanels;
 table.classList.add('desktop-panels');
 table.style.setProperty('--desktop-panel-grid',any.map(p=>'minmax(0,'+p.weight+'fr)').join(' '));
 table.dataset.visiblePanels=String(active.length);
 for(const panel of desktopPanels){
  const visible=desktopPanelState[panel.id],target=$(panel.element);
  target.dataset.desktopHidden=String(!visible);
  const button=document.querySelector('[data-panel-toggle="'+panel.id+'"]');
  if(button){
   button.setAttribute('aria-pressed',String(visible));
   button.textContent=(visible?'✓ ':'+ ')+panel.label;
   button.title=visible?'Ocultar '+panel.label:'Mostrar '+panel.label;
  }
 }
 $('desktop-panels-reset').disabled=active.length===desktopPanels.length;
}
function setDesktopPanel(id){
 if(isMobile())return;
 const next={...desktopPanelState,[id]:!desktopPanelState[id]};
 if(!Object.values(next).some(Boolean)){
  $('desktop-panel-message').textContent='Mantenha pelo menos um painel visível.';
  return;
 }
 desktopPanelState=next;
 try{localStorage.setItem(panelPreferenceKey,JSON.stringify(desktopPanelState))}catch(error){console.warn('Preferências não puderam ser salvas.',error)}
 renderDesktopPanels();
 $('desktop-panel-message').textContent=desktopPanelState[id]?'Painel exibido.':'Painel ocultado.';
}
loadDesktopPanels();
renderDesktopPanels();
for(const button of document.querySelectorAll('[data-panel-toggle]'))button.addEventListener('click',()=>setDesktopPanel(button.dataset.panelToggle));
$('desktop-panels-reset').addEventListener('click',()=>{
 desktopPanelState=Object.fromEntries(desktopPanels.map(p=>[p.id,true]));
 try{localStorage.setItem(panelPreferenceKey,JSON.stringify(desktopPanelState))}catch(error){}
 renderDesktopPanels();
 $('desktop-panel-message').textContent='Todos os painéis estão visíveis.';
});

function mobileNavigate(next,scroll=true){
 if(!['sheets','rolls','character','more'].includes(next))return;
 mobileView=next;
 const table=$('table');
 if(table)table.dataset.mobileView=next;
 for(const button of document.querySelectorAll('[data-mobile-target]')){
  button.setAttribute('aria-pressed',String(button.dataset.mobileTarget===next));
 }
 if(isMobile()&&scroll)window.scrollTo({top:0,behavior:'auto'});
}
function connectionState(state,label){
 const el=$('connection-status');if(!el)return;
 el.dataset.status=state;el.textContent=label;
 const panel=$('reconnect-panel');
 if(panel){
  const offline=state==='offline';
  panel.classList.toggle('hidden',!offline);
  if(offline){
   $('reconnect-title').textContent='Conexão com a mesa instável';
   $('reconnect-description').textContent=label+'. Os dados carregados continuam visíveis. Toque em Atualizar a mesa para tentar novamente.';
  }
 }
}
let reconnecting=false;
async function retryConnection(){
 if(reconnecting)return;
 if(!me){window.location.reload();return}
 reconnecting=true;
 const button=$('reconnect-now');button.disabled=true;button.textContent='Sincronizando...';
 try{
  const {data,error}=await db.from('dh_rooms').select('id').eq('id',roomId).single();
  if(error||!data?.id)throw Error(error?.message||'Sala inacessível');
  await refresh({side:true});await refreshRolls();
  connectionState('live',realtimeChannel?.state==='joined'?'Sincronizado':'Banco acessível · atualização manual disponível');
  say('room-status','Mesa atualizada com sucesso.');
 }catch(error){connectionState('offline','Falha ao sincronizar: '+error.message)}
 finally{reconnecting=false;button.disabled=false;button.textContent='↻ Atualizar a mesa'}
}
$('reconnect-now').addEventListener('click',retryConnection);
window.addEventListener('online',()=>{connectionState('offline','Internet reconectada · sincronizando');retryConnection()});
window.addEventListener('offline',()=>connectionState('offline','Sem internet'));
function setRepeatReady(){
 const button=$('roll-repeat');
 if(button)button.disabled=!mySheet||!lastRoll;
}
for(const button of document.querySelectorAll('[data-mobile-target]'))button.addEventListener('click',()=>mobileNavigate(button.dataset.mobileTarget));

function option(select,value,label){const o=node('option',label);o.value=String(value);select.append(o)}
function difficultyIsVisible(){
 return gm()||room?.show_test_difficulty!==false;
}
function renderDifficultyVisibility(){
 const visible=difficultyIsVisible();
 const value=$('roll-difficulty-value');
 value.textContent=visible?String(room?.test_difficulty??1):'Oculta';
 const display=$('roll-difficulty-display');
 display.querySelector('span').textContent=visible?'Dificuldade definida pelo mestre':'Dificuldade secreta (definida pelo mestre)';
 display.dataset.hiddenDifficulty=String(!visible);
 const checkbox=$('gm-difficulty-public');
 checkbox.checked=room?.show_test_difficulty!==false;
 $('gm-difficulty-visibility-status').textContent=checkbox.checked?
   'Os jogadores conseguem consultar a dificuldade.':
   'A dificuldade fica oculta para jogadores na rolagem e no histórico.';
}
function roomView(){
 $('room-name').textContent=room.name;
 $('room-code').textContent='Código: '+room.code;
 $('shop-indicator').textContent=room.shop_open?'Loja aberta':'Loja fechada';
 $('shop-toggle').textContent=room.shop_open?'Fechar loja':'Abrir loja';
 $('adventure-number').textContent='Aventura '+room.adventure_number;
 $('chaos-current').textContent=String(room.chaos??0);
 renderDifficultyVisibility();
 $('gm-test-difficulty').value=String(room.test_difficulty??1);
 $('gm-dashboard').classList.toggle('hidden',!gm());

 $('gm-tools').classList.toggle('hidden',!gm());
 $('bestiary-link').classList.toggle('hidden',!gm());
 $('bestiary-link').href='bestiario.html?room='+encodeURIComponent(roomId);
 $('diary-link').href='diario.html?room='+encodeURIComponent(roomId);
 $('mobile-journal-link').href='diario.html?room='+encodeURIComponent(roomId);
}

function resourceTrack(label,now,max,editable,onDelta){
 const ceiling=Math.max(1,Number(max)||1);
 const widget=node('div',null,'stress-widget resource-widget');
 const header=node('div',null,'stress-widget-header'),value=node('span',null,'stress-value');
 header.append(node('strong',label),value);
 const row=node('div',null,'stress-widget-row'),less=node('button','−','secondary stress-step'),more=node('button','+','secondary stress-step');
 less.type='button';more.type='button';
 less.setAttribute('aria-label','Diminuir '+label);more.setAttribute('aria-label','Aumentar '+label);
 const track=node('div',null,'stress-widget-track'),fill=node('span',null,'stress-widget-fill');
 track.setAttribute('role','progressbar');track.setAttribute('aria-label',label);
 track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(ceiling));
 track.append(fill);row.append(less,track,more);widget.append(header,row);
 const paint=valueNow=>{
  const n=Math.max(0,Math.min(ceiling,Number(valueNow)||0));
  value.textContent=n+' / '+ceiling;fill.style.width=100*n/ceiling+'%';
  track.setAttribute('aria-valuenow',String(n));
  less.disabled=!editable||n<=0;more.disabled=!editable||n>=ceiling;
 };
 paint(now);
 if(!editable){less.hidden=true;more.hidden=true}
 else for(const [btn,delta]of [[less,-1],[more,1]])btn.addEventListener('click',async()=>{
  if(btn.disabled)return;less.disabled=true;more.disabled=true;
  try{const result=await onDelta(delta);if(result!=null)paint(result)}
  catch(error){say('room-status','Erro ao ajustar '+label+': '+error.message,true)}
  finally{paint(Number(value.textContent.split('/')[0]))}
 });
 return widget;
}
async function changeResource(characterId,kind,delta){
 const {data,error}=await db.rpc('dh_room_adjust_track',{p_room:roomId,p_character:characterId,p_track:kind,p_delta:delta});
 if(error)throw Error(error.message);
 requestRoomRefresh();return data;
}
function trackMaximum(p,kind){
 const stored=trackLimits[p.character_id]||{};
 return kind==='void'?stored.void_max??Math.max(3,Number(p.void_points)||0):
  stored.momentum_max??Math.max(6,Number(p.momentum)||0);
}
function stressControl(now,max,editable,onDelta){
 const current=Math.min(Math.max(0,Number(now)||0),Math.max(0,Number(max)||0));
 const ceiling=Math.max(0,Number(max)||0);
 const root=node('div',null,'stress-widget');
 const line=node('div',null,'stress-widget-header');
 line.append(node('strong','Estresse'),node('span',current+' / '+ceiling,'stress-value'));
 root.append(line);
 const row=node('div',null,'stress-widget-row');
 const minus=node('button','−','secondary stress-step'),plus=node('button','+','secondary stress-step');
 minus.type='button';plus.type='button';minus.setAttribute('aria-label','Diminuir estresse');plus.setAttribute('aria-label','Aumentar estresse');
 const track=node('div',null,'stress-widget-track');
 track.setAttribute('role','progressbar');track.setAttribute('aria-label','Estresse atual');
 track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(ceiling));
 const fill=node('span',null,'stress-widget-fill');track.append(fill);
 const update=(value)=>{const n=Math.max(0,Math.min(ceiling,Number(value)||0));line.querySelector('.stress-value').textContent=n+' / '+ceiling;fill.style.width=(ceiling?100*n/ceiling:0)+'%';track.setAttribute('aria-valuenow',String(n));minus.disabled=!editable||n<=0;plus.disabled=!editable||n>=ceiling;};
 update(current);
 if(!editable){minus.hidden=true;plus.hidden=true;}
 else for(const [button,delta] of [[minus,-1],[plus,1]])button.addEventListener('click',async()=>{
  if(minus.disabled&&delta<0||plus.disabled&&delta>0)return;
  minus.disabled=true;plus.disabled=true;
  try{const value=await onDelta(delta);if(value!=null)update(value)}
  catch(e){say('room-status','Não foi possível alterar o estresse: '+e.message,true)}
  finally{update(Number(line.querySelector('.stress-value').textContent.split('/')[0]))}
 });
 row.append(minus,track,plus);root.append(row);
 return root;
}
async function changeStress({characterId=null,enemyId=null,delta}){
 const {data,error}=await db.rpc('dh_room_adjust_stress',{p_room:roomId,p_character:characterId,p_enemy:enemyId,p_delta:delta});
 if(error)throw Error(error.message);
 requestRoomRefresh();
 return data;
}
function participantView(){
 const root=$('participants-list');if(!root)return;
 root.replaceChildren();
 $('participants-count').textContent=roster.length+' inscrito'+(roster.length===1?'':'s')+
   (presenceReady?' · '+roster.filter(p=>onlineUsers.has(p.user_id)).length+' na mesa agora':'');
 $('roster-count').textContent='('+roster.length+')';
 if(!roster.length){root.append(node('p','Nenhum participante entrou nesta campanha ainda.','small'));return}
 for(const p of roster){
  const card=node('div',null,'participant-chip');
  const dot=node('span',null,'participant-dot');
  const live=presenceReady&&onlineUsers.has(p.user_id);
  dot.classList.toggle('is-online',live);
  dot.setAttribute('aria-hidden','true');
  const body=node('div',null,'participant-chip-info');
  body.append(node('strong',p.display_name||'Jogador'));
  const summary=(p.is_gm?'Mestre':'Jogador')+(p.character_name?' · '+p.character_name:' · Sem personagem');
  body.append(node('span',summary,'participant-character'));
  const state=node('span',presenceReady?(live?'Na mesa':'Fora da mesa'):'Inscrito','participant-state'+(live?' is-online':''));
  card.append(dot,body,state);
  root.append(card);
 }
}
function startPresence(){
 if(!me?.id)return;
 presenceChannel=db.channel('dh-presence-'+roomId,{config:{presence:{key:me.id}}})
 .on('presence',{event:'sync'},()=>{
  const state=presenceChannel.presenceState();
  onlineUsers=new Set(Object.keys(state).filter(id=>Array.isArray(state[id])&&state[id].length));
  presenceReady=true;participantView();if(gm())renderMasterShield();
 })
 .subscribe(async status=>{
  if(status==='SUBSCRIBED'){
   try{await presenceChannel.track({joined:true})}catch(e){presenceReady=false;participantView()}
  }
  if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
   presenceReady=false;onlineUsers.clear();participantView();if(gm())renderMasterShield();
  }
 });
}
$('participants-view-sheets').addEventListener('click',()=>mobileNavigate('sheets'));
function renderMasterShield(){
 const panel=$('gm-shield'),root=$('gm-shield-cards');root.replaceChildren();
 panel.classList.toggle('hidden',!gm());
 document.body.classList.toggle('is-room-gm',!!gm());
 if(!gm())return;
 const players=roster.filter(p=>p.character_id);
 $('gm-shield-count').textContent=players.length+' personagem(ns)';
 if(!players.length){root.append(node('p','Nenhum personagem vinculado.','small'));return}
 for(const p of players){
  const card=node('article',null,'gm-shield-card');card.dataset.characterId=p.character_id;
  const heading=node('div',null,'gm-shield-heading');
  const letter=node('span',(p.character_name||p.display_name||'?').trim().slice(0,1).toUpperCase(),'gm-shield-avatar');
  const meta=node('div',null,'gm-shield-meta');
  meta.append(node('strong',p.character_name||p.display_name||'Personagem'));
  meta.append(node('small',(p.archetype||'Sem arquétipo')+' · '+(presenceReady&&onlineUsers.has(p.user_id)?'Na mesa':'Inscrito')));
  heading.append(letter,meta);card.append(heading);
  card.append(stressControl(p.stress_now,p.stress_max,true,delta=>changeStress({characterId:p.character_id,delta})));
  for(const [kind,label,value] of [['void','Pontos do Vazio',p.void_points],['momentum','Momentum',p.momentum]]){
   card.append(resourceTrack(label,value,trackMaximum(p,kind),true,delta=>changeResource(p.character_id,kind,delta)));
  }
  const stats=node('div',null,'gm-shield-resources');
  for(const [label,value] of [['Moedas',fmt(p.coins)],['XP',fmt(p.xp)]]){
   const stat=node('div',null,'gm-shield-resource');stat.append(node('small',label),node('strong',value??0));stats.append(stat);
  }
  card.append(stats);
  const action=node('button','Abrir e editar ficha','secondary');action.type='button';
  action.addEventListener('click',()=>gmEditor?.choosePlayer(p.character_id));card.append(action);
  root.append(card);
 }
}
function rosterView(){
 const root=$('roster');root.replaceChildren();
 renderMasterShield();
 for(const p of roster){
  const card=node('div',null,'player-card');
  card.append(node('strong',p.character_name||p.display_name||(p.is_gm?'Mestre':'Jogador')));
  card.append(node('p',(p.is_gm?'Mestre · ':'')+(p.character_name?(p.archetype||'Sem arquétipo'):'Sem personagem selecionado')));
  if(p.character_id){
   card.append(stressControl(p.stress_now,p.stress_max,gm()||p.user_id===me.id,delta=>changeStress({characterId:p.character_id,delta})));
   for(const [kind,label,value] of [['void','Pontos do Vazio',p.void_points],['momentum','Momentum',p.momentum]]){
    card.append(resourceTrack(label,value,trackMaximum(p,kind),gm()||p.user_id===me.id,delta=>changeResource(p.character_id,kind,delta)));
   }
   if(gm())card.append(node('p','Moedas: '+fmt(p.coins)+' · XP: '+fmt(p.xp)));
  }
  if(gm()&&p.character_id){
   card.dataset.characterId=p.character_id;
   const open=node('button','Abrir ficha no painel direito','secondary');open.type='button';open.className='gm-open';
   open.addEventListener('click',()=>gmEditor?.choosePlayer(p.character_id));card.append(open);
  }
  root.append(card);
 }
 participantView();
 gmEditor?.highlight();
 if(!roster.length)root.append(node('p','Ainda não há participantes.'));
 const chooser=$('gm-character'),old=chooser.value;chooser.replaceChildren();
 for(const p of roster)if(p.character_id)option(chooser,p.character_id,p.character_name);
 if([...chooser.options].some(x=>x.value===old))chooser.value=old;
}

function enemyView(){
 const root=$('enemy-roster');root.replaceChildren();
 if(!enemies.length){root.append(node('p','Nenhum inimigo na mesa. O mestre pode adicioná-los pelo bestiário.','small'));return}
 for(const e of enemies){
  const card=node('div',null,'player-card');card.dataset.enemyId=e.id;
  const label=e.tier==='principal'?'Principal':e.tier==='notavel'?'Notável':e.tier==='incidental'?'Incidental':'Menor';
  card.append(node('strong',e.name),node('p',label+(e.visible===false?' · Oculto':'')+' · '+(e.section==='nobreza'?'Nobreza':e.section==='selvagens'?'Selvagem':e.section==='notorios'?'Notório':'Povo Comum')));
  if(e.stress_visible===false&&!gm()){
   card.append(node('p','Estresse oculto pelo mestre','small'));
  }else if(e.stress_max===0){
   card.append(node('p','Sem trilha de estresse','small'));
  }else if(e.stress_max!==null){
   const now=Number(e.stress_now||0),max=Number(e.stress_max);
   card.append(stressControl(now,max,gm(),delta=>changeStress({enemyId:e.id,delta})));
  }
  if(gm()){
   card.append(node('p','Pontos do Vazio: '+(e.void_points??0),'small'));
   const open=node('button','Ações e rolagens','secondary');open.type='button';open.className='gm-open';
   open.addEventListener('click',()=>gmEditor?.chooseEnemy(e.id));card.append(open);
  }
  root.append(card);
 }
 gmEditor?.highlight();
}
function diceView(rolls){
 const root=$('rolls');root.replaceChildren();
 if(!rolls.length){root.append(node('p','Ainda não houve rolagens.'));return}
 for(const r of rolls){
  const actor=roster.find(x=>x.user_id===r.user_id);
  const npc=enemies.find(x=>x.id===r.enemy_id);
  const character=roster.find(x=>x.character_id&&x.character_id===r.character_id);
  const actorName=r.actor_name||character?.character_name||npc?.name||(r.enemy_id?'Inimigo':r.character_id?'Personagem':r.action_label?'Inimigo':'Participante');
  const div=node('article',null,'roll-card'+(r.visibility==='public'?'':' private'));
  const title=r.action_name||((r.action_label&&r.action_label!=='Teste livre')?r.action_label:null);
  const h=node('h4',actorName+' · '+(title?title+' · ':'')+r.skill+' + '+r.style);
  const vis=r.visibility==='public'?'Pública':r.visibility==='private'?'Privada':'Somente mestre';
  const date=new Date(r.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  div.append(h,node('p',date+' · '+vis+(difficultyIsVisible()?' · Dificuldade '+r.difficulty:' · Dificuldade oculta')));
  div.append(node('div',(r.rolls||[]).join(' · '),'dice'));
  const passed=r.successes>=r.difficulty;
  // O servidor continua calculando os resultados; a dificuldade numérica não aparece ao jogador.
  div.append(node('p',r.successes+' sucesso(s) · '+r.complications+' complicação(ões) · '+(passed?'Sucesso':'Falha'),passed?'success':'fail'));
  div.append(node('p','Alvo: '+r.target+(r.focus?' · Foco: '+r.focus+' ('+r.focus_value+')':'')));
  if(r.action_name){
   const dmg=r.successes>=r.difficulty?Number(r.damage||0):0;
   div.append(node('p',dmg>0?'⚔ Dano fixo: '+dmg+' de Estresse (aplicação pelo mestre)':r.successes>=r.difficulty?'Ação bem-sucedida · sem dano direto':'Ataque falhou · nenhum dano','action-damage'));
   if(Number(r.void_spent)>0)div.append(node('p','✦ Vazio gasto: '+r.void_spent,'small'));
  }
  root.append(div);
 }
}
function focusOptions(){
 const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
 const result=[];
 const add=(name,rank)=>{
  const level=Number(rank),label=String(name||'').trim();
  if(!label||!Number.isInteger(level)||level<1||level>8||result.some(x=>normalize(x.name)===normalize(label)))return;
  result.push({name:label,rank:level});
 };
 // Fichas atualizadas usam a lista estruturada. Uma lista vazia indica remoção intencional.
 if(Array.isArray(mySheet?.focuses)){
  for(const f of mySheet.focuses)add(f.name||f.nome,f.rank??f.valor);
  return result;
 }
 const built=mySheet?.creation?.focus;
 if(Array.isArray(built))for(const f of built)add(f.nome||f.name,f.valor??f.rank);
 for(const f of mySheet?.catalogSelections?.focus||[])
  if(f.origin==='starting'||f.origin==='sheet')add(f.name,f.rank);
 return result;
}
const quickActions=[
 ['Ataque corpo a corpo','Lutar','Rapidamente','swords'],
 ['Ataque preciso','Lutar','Cuidadosamente','target'],
 ['Esquivar','Mover','Rapidamente','footprints'],
 ['Investigar','Estudar','Cuidadosamente','search'],
 ['Intimidar','Falar','Forçosamente','message-circle'],
 ['Consertar','Consertar','Habilmente','wrench']
];
function chooseQuickAction(skill,style){
 if(![...$('roll-skill').options].some(x=>x.value===skill)||![...$('roll-style').options].some(x=>x.value===style)){
  say('roll-msg','A ficha não possui a perícia/estilo necessário para esta ação.',true);return
 }
 $('roll-skill').value=skill;$('roll-style').value=style;
 for(const btn of document.querySelectorAll('.quick-action-btn'))btn.setAttribute('aria-pressed',String(btn.dataset.skill===skill&&btn.dataset.style===style));
 say('roll-msg','Ação selecionada: '+skill+' + '+style+'.');
}
let favoriteEditing=false;
const favoriteKey=()=>mySheet&&mine?.character_id?'dishonored-roll-favorites-'+me.id+'-'+mine.character_id:null;
function readFavoriteKeys(){
 try{const key=favoriteKey();if(!key)return [];const saved=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(saved)?saved.filter(x=>typeof x==='string').slice(0,20):[]}
 catch{return []}
}
function setFavoriteKeys(keys){
 try{const key=favoriteKey();if(key)localStorage.setItem(key,JSON.stringify(keys))}
 catch{say('roll-msg','Não foi possível salvar os favoritos neste navegador.',true)}
}
function actionKey(skill,style){return skill+'|'+style}
function paintQuickActions(){
 const root=$('roll-quick-actions'),favRoot=$('roll-favorite-actions');
 root.replaceChildren();favRoot.replaceChildren();
 const favoriteKeys=readFavoriteKeys();
 const favorites=[];
 for(const [name,skill,style] of quickActions){
  const key=actionKey(skill,style),isFavorite=favoriteKeys.includes(key);
  const entry=node('div',null,'quick-action-entry');
  const btn=node('button',name,'secondary quick-action-btn');btn.type='button';
  btn.dataset.skill=skill;btn.dataset.style=style;
  btn.disabled=!mySheet;
  btn.setAttribute('aria-pressed',String($('roll-skill').value===skill&&$('roll-style').value===style));
  btn.addEventListener('click',()=>chooseQuickAction(skill,style));
  const star=node('button',isFavorite?'★':'☆','quick-star');star.type='button';
  star.disabled=!mySheet;
  star.setAttribute('aria-label',(isFavorite?'Remover ':'Adicionar ')+name+(isFavorite?' dos favoritos':' aos favoritos'));
  star.setAttribute('aria-pressed',String(isFavorite));
  star.addEventListener('click',()=>{
   const next=readFavoriteKeys();const index=next.indexOf(key);
   if(index>=0)next.splice(index,1);else next.push(key);
   setFavoriteKeys(next);paintQuickActions();
  });
  entry.append(btn,star);root.append(entry);
  if(isFavorite)favorites.push([name,skill,style]);
 }
 if(!favorites.length)favRoot.append(node('p','Toque em ☆ ao lado de uma ação para deixá-la aqui.','small'));
 for(const [name,skill,style] of favorites){
  const btn=node('button','★ '+name,'secondary favorite-shortcut');btn.type='button';btn.disabled=!mySheet;
  btn.addEventListener('click',()=>chooseQuickAction(skill,style));favRoot.append(btn);
 }
 $('roll-more-actions').open=favoriteEditing||!favorites.length;
 $('roll-favorites-manage').textContent=favoriteEditing?'Concluir':'Organizar favoritos';
}
$('roll-favorites-manage').addEventListener('click',()=>{
 favoriteEditing=!favoriteEditing;paintQuickActions();
 if(favoriteEditing)$('roll-more-actions').open=true;
});
function setRollMode(mode){
 rollMode=mode;
 $('roll-custom-fields').classList.toggle('roll-custom-collapsed',mode==='quick');
 $('roll-mode-quick').setAttribute('aria-pressed',String(mode==='quick'));
 $('roll-mode-custom').setAttribute('aria-pressed',String(mode==='custom'));
}
$('roll-mode-quick').addEventListener('click',()=>setRollMode('quick'));
$('roll-mode-custom').addEventListener('click',()=>setRollMode('custom'));
function openMasterArea(id){
 if(!gm())return;
 if(id==='gm-enemies'){mobileNavigate('sheets');return}
 mobileNavigate('more');
 const tools=$('gm-tools');tools.open=true;
 const area=$(id);if(area){
  if(area.closest('details'))area.closest('details').open=true;
  area.scrollIntoView({behavior:'smooth',block:'start'});
 }
}
for(const btn of document.querySelectorAll('[data-gm-target]'))btn.addEventListener('click',()=>openMasterArea(btn.dataset.gmTarget));
$('gm-open-journal').addEventListener('click',()=>location.assign('diario.html?room='+encodeURIComponent(roomId)));
$('gm-difficulty-public').addEventListener('change',async event=>{
 if(!gm())return;
 const checkbox=event.currentTarget,show=checkbox.checked;
 checkbox.disabled=true;
 const {error}=await db.rpc('dh_room_set_difficulty_visibility',{p_room:roomId,p_show:show});
 checkbox.disabled=false;
 if(error){
  checkbox.checked=room?.show_test_difficulty!==false;
  say('gm-msg','Falha ao alterar a visibilidade da dificuldade: '+error.message,true);
  return;
 }
 room.show_test_difficulty=show;
 renderDifficultyVisibility();
 // Reaplica o filtro na lista já carregada e notifica a sala pela revisão da campanha.
 await refreshRolls(true);
 say('gm-msg',show?'Dificuldade visível para os jogadores.':'Dificuldade oculta para os jogadores.');
});
$('gm-save-difficulty').addEventListener('click',async()=>{
 if(!gm())return;
 const chosen=Number($('gm-test-difficulty').value);
 const btn=$('gm-save-difficulty');btn.disabled=true;
 const {error}=await db.rpc('dh_room_set_difficulty',{p_room:roomId,p_difficulty:chosen});
 btn.disabled=false;
 if(error){say('gm-msg','Falha ao definir dificuldade: '+error.message,true);return}
 room.test_difficulty=chosen;
 renderDifficultyVisibility();
 say('gm-msg','Dificuldade '+chosen+' aplicada a todos os testes da sala.');
});

let pendingCombatAction=false;
function availableCombatActions(){
 if(!mySheet)return [];
 const extension=structuredClone(mySheet);
 extension.catalogSelections=structuredClone(mySheet.catalogSelections||{});
 extension.catalogSelections.power=[...(extension.catalogSelections.power||[])];
 const names=[];
 for(const purchase of purchases.filter(x=>x.character_id===mine?.character_id)){
  const record=byId(purchase.catalog_id);if(!record)continue;
  if(record.category==='power')extension.catalogSelections.power.push({name:record.name});
  if(record.category==='item')names.push(record.name);
 }
 return allActions(extension,items,[...names,...ownedCombatItems]);
}
function paintCombatActions(){
 const picker=$('combat-roll-action'),old=picker.value,actions=availableCombatActions();
 picker.replaceChildren();option(picker,'','Selecione um ataque ou poder');
 for(const action of actions)option(picker,action.id,action.name+(action.source==='power'?' ✦':''));
 if([...picker.options].some(x=>x.value===old))picker.value=old;
 const action=actions.find(x=>x.id===picker.value);
 const preview=$('combat-roll-preview');
 preview.textContent=action?
  action.skill+' + '+action.style+(action.focus?' · Foco '+action.focus:'')+
   ' · Dano '+Math.max(0,action.damage+action.bonus)+(action.voidCost?' · Custo: '+action.voidCost+' Vazio':''):
  'Escolha um ataque configurado ou uma arma/poder do personagem.';
 $('combat-roll-use').disabled=!action||pendingCombatAction;
 $('combat-roll-edit').href=mine?.character_id?'personagem.html?id='+encodeURIComponent(mine.character_id)+'#character-combat-actions':'fichas.html';
}
$('combat-roll-action').addEventListener('change',paintCombatActions);
$('combat-roll-use').addEventListener('click',async()=>{
 if(pendingCombatAction||!mySheet||!mine?.character_id)return;
 const action=availableCombatActions().find(x=>x.id===$('combat-roll-action').value);
 if(!action)return say('roll-msg','Escolha uma ação válida da ficha.',true);
 if(action.voidCost>Number(mine.void_points||0))return say('roll-msg','Pontos do Vazio insuficientes.',true);
 if(action.voidCost&&!confirm('Usar '+action.name+' e gastar '+action.voidCost+' ponto(s) do Vazio, mesmo se o ataque falhar?'))return;
 pendingCombatAction=true;paintCombatActions();
 try{
  const {error}=await db.rpc('dh_room_roll_action',{
   p_room:roomId,p_action_key:action.id,p_dice:Number($('roll-dice').value),
   p_visibility:$('roll-visibility').value
  });
  if(error)throw Error(error.message);
  say('roll-msg','Ação '+action.name+' executada. O histórico informa acerto e dano fixo. O mestre aplica o dano ao alvo.');
  await Promise.all([refreshRolls(true),refresh({side:true})]);
 }catch(error){say('roll-msg','Falha ao executar ação: '+error.message,true)}
 finally{pendingCombatAction=false;paintCombatActions()}
});
function rollerView(){
 const disabled=!mySheet;
 $('roll-submit').disabled=disabled;
 $('roll-character-hint').textContent=disabled?'Escolha uma ficha pronta pelo lobby para rolar.':'Você está rolando como '+(mine?.character_name||'personagem')+'. Escolha a privacidade antes de enviar.';
 for(const [id,key] of [['roll-skill','skills'],['roll-style','styles']]){
  const select=$(id),old=select.value;select.replaceChildren();
  for(const item of mySheet?.[key]||[])option(select,item.label,item.label+' ('+item.value+')');
  if([...select.options].some(o=>o.value===old))select.value=old;
 }
 const focus=$('roll-focus'),old=focus.value;focus.replaceChildren();option(focus,'','Sem foco');
 for(const item of focusOptions())option(focus,item.name,item.name+' ('+item.rank+')');
 if([...focus.options].some(o=>o.value===old))focus.value=old;
 paintQuickActions();
 paintCombatActions();
}
const fingerprint=value=>JSON.stringify(value??null);
function requestRoomRefresh(){
 if(roomRefreshTimer!==null)clearTimeout(roomRefreshTimer);
 roomRefreshTimer=setTimeout(()=>{roomRefreshTimer=null;if(document.visibilityState==='visible')refresh();},170);
}
function requestRollRefresh(){
 if(rollRefreshTimer!==null)clearTimeout(rollRefreshTimer);
 rollRefreshTimer=setTimeout(()=>{rollRefreshTimer=null;if(document.visibilityState==='visible')refreshRolls();},120);
}
async function refreshRolls(force=false){
 const {data,error}=await db.from('dh_room_rolls')
  .select('id,user_id,character_id,enemy_id,actor_name,action_label,action_name,action_kind,damage,void_spent,skill,style,focus,focus_value,difficulty,dice,rolls,target,successes,complications,visibility,created_at')
  .eq('room_id',roomId).order('created_at',{ascending:false}).limit(65);
 if(error){say('room-status','Erro ao buscar rolagens: '+error.message,true);connectionState('offline','Histórico indisponível');return}
 const next=fingerprint(data||[]);
 if(!force&&next===rollsSnapshot)return;
 rollsSnapshot=next;
 const root=$('rolls'),atTop=root.scrollTop<30;
 diceView(data||[]);
 if(!atTop)root.scrollTop=Math.min(root.scrollTop,root.scrollHeight);
}
async function refresh({side=false}={}){
 if(busy){queuedRoomRefresh=true;return}
 busy=true;
 try{
  const [r,m,st,pu,enemyResponse,limitsResponse]=await Promise.all([
   db.from('dh_rooms').select('id,code,name,owner_id,shop_open,chaos,adventure_number,active,revision,test_difficulty,show_test_difficulty').eq('id',roomId).single(),
   db.rpc('dh_room_roster',{p_room:roomId}),
   db.from('dh_room_stock').select('catalog_id,available,quantity').eq('room_id',roomId),
   db.from('dh_room_purchases').select('id,room_id,character_id,catalog_id,amount,currency,created_at').eq('room_id',roomId).order('created_at',{ascending:false}).limit(200),
   db.rpc('dh_room_enemies_roster',{p_room:roomId}),
   db.rpc('dh_room_track_limits',{p_room:roomId})
  ]);
  if(r.error)throw Error('Sala não encontrada ou sem acesso. '+r.error.message);
  const roomChanged=fingerprint(room)!==fingerprint(r.data);
  const nextLimits=limitsResponse.error?trackLimits:Object.fromEntries((limitsResponse.data||[]).map(x=>[x.character_id,x]));
  const limitsChanged=fingerprint(trackLimits)!==fingerprint(nextLimits);
  trackLimits=nextLimits;
  const rosterChanged=fingerprint(roster)!==fingerprint(m.data||[]);
  const stockChanged=fingerprint(stock)!==fingerprint(st.data||[]);
  const purchasesChanged=fingerprint(purchases)!==fingerprint(pu.data||[]);
  const enemiesChanged=fingerprint(enemies)!==fingerprint(enemyResponse.data||[]);
  const oldCharacterId=mine?.character_id;
  const oldMode=room?.shop_open;
  room=r.data;roster=m.error?roster:m.data||[];stock=st.error?stock:st.data||[];
  purchases=pu.error?purchases:pu.data||[];enemies=enemyResponse.error?enemies:enemyResponse.data||[];
  mine=roster.find(x=>x.user_id===me.id)||null;
  if(roomChanged){roomView();if(rollsSnapshot)refreshRolls(true)}
  if(rosterChanged||limitsChanged)rosterView();
  if(enemiesChanged)enemyView();
  if(stockChanged&&gm())stockView();
  $('coins').textContent='Moedas: '+(mine?.character_id?fmt(mine.coins):'—');
  $('xp').textContent='XP: '+(mine?.character_id?fmt(mine.xp):'—');
  if(oldCharacterId!==mine?.character_id){lastRoll=null;setRepeatReady()}
  if(side||oldMode!==room.shop_open||purchasesChanged||stockChanged||oldCharacterId!==mine?.character_id)renderSide();
  if(purchasesChanged||oldCharacterId!==mine?.character_id)paintCombatActions();
  if(!m.error&&mine?.character_id)await loadMySheet(false);
  if(!mine?.character_id&&oldCharacterId)await loadMySheet(false);
  if(roomChanged||rosterChanged||enemiesChanged)say('room-status','');
 }catch(e){say('room-status',e.message,true);connectionState('offline','Falha de conexão com o banco')}
 finally{
  busy=false;
  if(queuedRoomRefresh){queuedRoomRefresh=false;requestRoomRefresh()}
 }
}
function startLiveUpdates(){
 // O Supabase envia apenas linhas permitidas pelas políticas RLS.
 // Uma mudança de recursos, estoque, NPC ou participante incrementa revision da sala.
 realtimeChannel=db.channel('dishonored-mesa-'+roomId)
 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'dh_rooms',filter:'id=eq.'+roomId},requestRoomRefresh)
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'dh_room_rolls',filter:'room_id=eq.'+roomId},requestRollRefresh)
 .subscribe(status=>{
  if(status==='SUBSCRIBED'){connectionState('live','Sincronizado');requestRoomRefresh();requestRollRefresh()}
  if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){connectionState('offline','Tempo real desconectado');say('room-status','Conexão em tempo real instável. Você pode atualizar a mesa manualmente.',true)}
  if(status==='CLOSED')connectionState('offline','Offline');
 });
 setInterval(()=>{
  if(document.visibilityState!=='visible')return;
  refresh();
  refreshRolls();
 },30000);
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){requestRoomRefresh();requestRollRefresh()}
 });
 window.addEventListener('pagehide',()=>{if(realtimeChannel)db.removeChannel(realtimeChannel);if(presenceChannel)db.removeChannel(presenceChannel)});
}
async function loadMySheet(redraw=true){
 if(!mine?.character_id){ownedCombatItems=[];lastGearCharacter=null;$('session-gear-list')?.replaceChildren(node('p','Vincule um personagem para consultar seu inventário.'));mySheet=null;rollerView();setRepeatReady();$('my-character').replaceChildren(node('p',gm()?'Você está como mestre. Clique em Abrir ficha de um participante ou inimigo no painel esquerdo.':'Vincule uma ficha à campanha pelo lobby.'));if(redraw)renderSide();return}
 const {data,error}=await db.from('dh_characters').select('id,name,sheet,creation_status').eq('id',mine.character_id).eq('owner_id',me.id).single();
 if(error){say('side-msg',error.message,true);return}
 const changed=JSON.stringify(mySheet)!==JSON.stringify(data.sheet);
 if(lastGearCharacter!==mine.character_id){
  lastGearCharacter=mine.character_id;ownedCombatItems=[];
  renderOwnedGear($('session-gear-list'),mine.character_id);
  db.from('dh_character_items').select('name,quantity').eq('character_id',mine.character_id)
   .then(({data,error})=>{
    if(!error&&mine?.character_id===lastGearCharacter){
     ownedCombatItems=(data||[]).filter(x=>Number(x.quantity)>0).map(x=>x.name);paintCombatActions();
    }
   });
 }
 mySheet=data.sheet;
 if(!changed&&!redraw)return;
 rollerView();setRepeatReady();
 const root=$('my-character');root.replaceChildren();
 root.append(node('strong',mine.character_name));
 const edit=node('a','Abrir ficha completa','btn secondary');edit.href='personagem.html?id='+encodeURIComponent(mine.character_id);edit.style.marginTop='8px';
 root.append(edit);
 if(redraw||changed)renderSide();
}
function accordion(title,desc,secondary){
 const details=node('details');details.append(node('summary',title));
 const wrap=node('div');wrap.append(node('p',desc||'Sem descrição disponível.'));
 if(secondary)wrap.append(node('p',secondary));
 details.append(wrap);return details;
}
function statusText(product){
 const s=storeRecord(product);
 if(!s)return 'Disponível · estoque livre';
 if(!s.available)return 'Indisponível nesta loja';
 return s.quantity===null?'Disponível · sem limite':s.quantity+' unidade(s) disponíveis';
}
function purchaseButtons(product,wrap){
 const owned=owns(product);
 const isItem=product.category==='item',price=isItem?product.coins_cost:(product.archetype===mySheet?.arquetipo?(costs.xp_talent_own??10):(costs.xp_talent_other??15));
 const type=isItem?'moedas':'XP';
 const row=node('div',null,'row');
 row.append(node('span',price===null?'Preço não definido':fmt(price)+' '+type,'small'));
 const btn=node('button','Comprar','secondary');btn.type='button';
 btn.disabled=!room.shop_open||!mine?.character_id||price===null||(isItem&&!available(product))||(!isItem&&owned.length>0);
 btn.addEventListener('click',async()=>{
  if(!confirm('Confirmar aquisição de '+product.name+' por '+price+' '+type+'?'))return;
  btn.disabled=true;
  const {error}=await db.rpc('dh_room_buy',{p_room:roomId,p_catalog:product.id});
  if(error){say('side-msg','Compra recusada: '+error.message,true);btn.disabled=false;return}
  say('side-msg','Aquisição realizada! O registro foi salvo e os recursos foram descontados.');
  await refresh({side:true});
 });
 row.append(btn);wrap.append(row);
 if(!room.shop_open)wrap.append(node('p','Somente consulta: o mestre ainda não abriu a loja.','small'));
 if(isItem&&!available(product))wrap.append(node('p','Item bloqueado pelo mestre.','error'));
 if(!isItem&&owned.length)wrap.append(node('p','Talento já adquirido nesta campanha.','small'));
}

function trialCard(product){
 const details=node('details');
 const summary=node('summary','Testar sem comprar');details.append(summary);
 const wrap=node('div');
 wrap.append(node('p','Simulação independente: não gasta recursos nem publica resultados na mesa. O efeito específico do item ou talento deve ser interpretado conforme a regra.','small'));
 if(!mySheet){wrap.append(node('p','Escolha um personagem para simular.'));details.append(wrap);return details}
 const skill=node('select'),style=node('select'),difficulty=node('select');
 for(const x of mySheet.skills||[])option(skill,x.label,x.label+' ('+x.value+')');
 for(const x of mySheet.styles||[])option(style,x.label,x.label+' ('+x.value+')');
 for(let d=0;d<=5;d++)option(difficulty,d,d);
 difficulty.value='1';
 const label=(text,control)=>{const l=node('label',text);wrap.append(l,control)};
 label('Perícia',skill);label('Estilo',style);label('Dificuldade',difficulty);
 const action=node('button','Rolar 2d20','secondary'),out=node('p',null,'status');
 action.type='button';
 action.addEventListener('click',()=>{
  const sv=Number(mySheet.skills.find(x=>x.label===skill.value)?.value||4);
  const tv=Number(mySheet.styles.find(x=>x.label===style.value)?.value||4);
  const rand=()=>{const b=new Uint32Array(1);crypto.getRandomValues(b);return b[0]%20+1};
  const dice=[rand(),rand()],target=sv+tv;
  const successes=dice.reduce((n,d)=>n+(d===1?2:d<=target?1:0),0);
  const complications=dice.filter(x=>x===20).length;
  out.textContent='Dados: '+dice.join(', ')+' · Alvo '+target+' · '+successes+' sucesso(s) · '+complications+' complicação(ões). '+(successes>=Number(difficulty.value)?'Sucesso!':'Falha.')+' Nenhum recurso foi gasto.';
 });
 wrap.append(action,out);details.append(wrap);return details;
}

function renderShop(){
 const root=$('side-content');root.replaceChildren();
 root.append(node('p','Modo loja: '+(room.shop_open?'ABERTO':'FECHADO')+'. Itens sem restrição explícita têm estoque livre. O mestre controla os itens limitados.','info'));
 const search=node('input');search.type='search';search.placeholder='Pesquisar equipamentos ou talentos';search.setAttribute('aria-label','Pesquisar loja');
 const select=node('select');option(select,'item','Equipamentos e itens');option(select,'talent','Talentos (XP)');
 root.append(search,select);
 const list=node('div',null,'items-list');root.append(list);
 const paint=()=>{
  list.replaceChildren();
  const term=search.value.trim().toLocaleLowerCase('pt-BR');
  const choices=items.filter(x=>x.category===select.value&&(!term||(x.name+' '+x.description).toLocaleLowerCase('pt-BR').includes(term))).slice(0,80);
  for(const x of choices){
   const card=node('div',null,'item-row');
   card.append(node('strong',x.name),node('p',x.description||'Sem descrição.'));
   if(x.category==='item')card.append(node('p',statusText(x)));
   card.append(trialCard(x));purchaseButtons(x,card);list.append(card);
  }
  if(!choices.length)list.append(node('p','Nenhum resultado.'));
 };
 search.addEventListener('input',paint);select.addEventListener('change',paint);paint();
}
function renderContent(kind){
 const root=$('side-content');root.replaceChildren();
 if(!mySheet){root.append(node('p','Vincule uma ficha ao entrar na campanha.'));return}
 const initial=mySheet?.catalogSelections?.[kind]||[];
 const acquired=purchases.filter(x=>x.character_id===mine.character_id&&byId(x.catalog_id)?.category===kind);
 const seen=new Set();
 for(const p of initial){
  if(!p?.name)continue;
  const record=items.find(x=>x.category===kind&&x.name.toLocaleLowerCase('pt-BR')===p.name.toLocaleLowerCase('pt-BR'));
  root.append(accordion(p.name,record?.description||p.description||'Registro inicial da ficha.',p.origin==='reference'?'Opção anotada como referência; não é uma aquisição confirmada.':'Conteúdo registrado na ficha.'));
  seen.add(p.name.toLocaleLowerCase('pt-BR'));
 }
 if(kind==='item'){
  for(const owned of mySheet?.gmInventory||[]){
   if(!owned?.name||Number(owned.quantity)<=0)continue;
   const record=items.find(x=>x.category==='item'&&x.name.toLocaleLowerCase('pt-BR')===owned.name.toLocaleLowerCase('pt-BR'));
   root.append(accordion(owned.name+' ×'+owned.quantity,record?.description||'Equipamento registrado no inventário oficial.',owned.source==='purchase'?'Comprado durante uma sessão.':'Concedido ou ajustado pelo mestre.'));
   seen.add(owned.name.toLocaleLowerCase('pt-BR'));
  }
 }else for(const p of acquired){
  const record=byId(p.catalog_id);if(!record)continue;
  root.append(accordion(record.name,record.description,'Adquirido por '+p.amount+' '+(p.currency==='xp'?'XP':'moedas')+'.'));
  seen.add(record.name.toLocaleLowerCase('pt-BR'));
 }
 if(!seen.size)root.append(node('p','Nenhum conteúdo registrado nesta categoria.'));
 const link=node('a','Gerenciar minhas abas na ficha','btn secondary');link.href='personagem.html?id='+encodeURIComponent(mine.character_id);root.append(link);
}

function renderUpgrade(){
 const root=$('side-content');root.replaceChildren();
 root.append(node('p','Aprimore uma perícia, estilo ou foco usando XP. O mestre precisa abrir a loja. As alterações e o gasto são aplicados de forma conjunta no servidor.','info'));
 if(!mySheet||!mine?.character_id){root.append(node('p','Escolha um personagem para evoluir.'));return}
 const kind=node('select');
 option(kind,'skill','Perícias');option(kind,'style','Estilos');option(kind,'focus','Focos');
 const target=node('select');const current=node('p',null,'small');const message=node('p',null,'small');
 const choose=()=>{
  target.replaceChildren();
  const type=kind.value;
  const sources=type==='skill'?(mySheet.skills||[]):type==='style'?(mySheet.styles||[]):(mySheet.creation?.focus||[]).map(x=>({label:x.nome,value:x.valor}));
  for(const x of sources)option(target,x.label,x.label+' ('+x.value+')');
  const key=type==='skill'?'xp_skill':type==='style'?'xp_style':'xp_focus';
  current.textContent='Custo por avanço: '+(costs[key]??(type==='focus'?5:10))+' XP. O sistema respeita o limite de avanços por aventura ('+(costs.max_advances??1)+').';
 };
 const action=node('button','Comprar aprimoramento');action.type='button';action.disabled=!room.shop_open;
 const go=async()=>{
  if(!room.shop_open)return say('side-msg','O mestre ainda não abriu o modo loja.',true);
  if(!target.value)return say('side-msg','Escolha uma característica.',true);
  if(!confirm('Gastar XP para aumentar '+target.value+' em +1?'))return;
  action.disabled=true;
  const {error}=await db.rpc('dh_room_advance',{p_room:roomId,p_kind:kind.value,p_target:target.value});
  if(error){say('side-msg','Avanço recusado: '+error.message,true);action.disabled=false;return}
  say('side-msg','Aprimoramento aplicado! XP descontado e característica atualizada.');
  await refresh({side:true});
 };
 kind.addEventListener('change',choose);action.addEventListener('click',go);
 root.append(node('label','Tipo de aprimoramento'),kind,node('label','Aumentar em +1'),target,current,action,message);
 if(!room.shop_open)root.append(node('p','Modo consulta: o mestre precisa abrir a loja.','small'));
 choose();
}

function renderSide(){
 const root=$('side-content');root.replaceChildren();
 for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===tab));
 if($('mobile-category'))$('mobile-category').value=tab;
 if(tab==='shop'){renderShop();return}
 if(tab==='upgrade'){renderUpgrade();return}
 if(tab==='sheet'){
  if(!mine?.character_id){root.append(node('p','Nenhum personagem vinculado. Use a página Salas para vincular uma ficha.'));return}
  const hero=node('div',null,'hero-card');
  hero.append(node('span','PERSONAGEM ATIVO','eyebrow'),node('h3',mine.character_name),node('p',mine.archetype||'Sem arquétipo'));
  root.append(hero);
  const stats=node('div',null,'hero-stats');
  for(const [label,value] of [['Estresse',mine.stress_now+'/'+mine.stress_max],['Vazio',mine.void_points],['XP',mine.xp],['Moedas',mine.coins]]){
   const card=node('div',null,'hero-stat');card.append(node('small',label),node('strong',value));stats.append(card);
  }
  root.append(stats);
  const shortcuts=node('div',null,'hero-shortcuts');
  for(const [label,action] of [['🎲 Nova rolagem',()=>mobileNavigate('rolls')],['⚔ Ações de combate',()=>{tab='actions';renderSide()}],['🎒 Inventário',()=>{tab='item';renderSide()}]]){
   const button=node('button',label,'secondary');button.type='button';button.addEventListener('click',action);shortcuts.append(button);
  }
  root.append(shortcuts);
  const stressPercent=Math.max(0,Math.min(100,Math.round(100*Number(mine.stress_now||0)/Math.max(1,Number(mine.stress_max)||12))));
  const stressHead=node('div',null,'compact-stress-heading');
  stressHead.append(node('span','Estresse atual'),node('strong',mine.stress_now+' / '+mine.stress_max));
  const stressTrack=node('div',null,'compact-stress-track');
  stressTrack.setAttribute('role','progressbar');stressTrack.setAttribute('aria-label','Estresse do personagem');
  stressTrack.setAttribute('aria-valuemin','0');stressTrack.setAttribute('aria-valuemax',String(mine.stress_max||12));
  stressTrack.setAttribute('aria-valuenow',String(mine.stress_now||0));
  const stressFill=node('span',null,'compact-stress-fill');stressFill.style.width=stressPercent+'%';stressTrack.append(stressFill);
  root.append(stressHead,stressTrack);
  const momentum=node('div',null,'compact-momentum');momentum.append(node('small','Momentum'),node('strong',mine.momentum+' / 6'));root.append(momentum);
  if(mySheet){
   const focusPanel=node('details',null,'compact-sheet-categories');
   const names=focusOptions();
   focusPanel.append(node('summary','Focos ('+names.length+') · consultar níveis'));
   const body=node('div',null,'compact-focus-grid');
   for(const item of names){
    const row=node('div',null,'compact-focus-row');
    row.append(node('strong',item.name),node('span','Nível '+item.rank));body.append(row);
   }
   if(!names.length)body.append(node('p','Nenhum foco cadastrado.','small'));
   focusPanel.append(body);root.append(focusPanel);
  }
  const link=node('a','Editar ficha completa','btn secondary');link.href='personagem.html?id='+encodeURIComponent(mine.character_id);root.append(link);
  return;
 }
 if(tab==='actions'){
  root.append(node('p','Escolha uma ação; o mestre define a dificuldade da mesa.','small'));
  const actions=[['Ataque corpo a corpo','Lutar','Rapidamente'],['Ataque calculado','Lutar','Cuidadosamente'],['Fugir ou esquivar','Mover','Rapidamente'],['Observar inimigo','Estudar','Cuidadosamente'],['Intimidar','Falar','Forçosamente'],['Reparar equipamento','Consertar','Habilmente']];
  for(const [name,skill,style] of actions){
   const row=node('div',null,'item-row');
   const b=node('button',name,'secondary');b.type='button';b.disabled=!mySheet;
   b.addEventListener('click',()=>{
    if(![...$('roll-skill').options].some(x=>x.value===skill)||![...$('roll-style').options].some(x=>x.value===style)){say('side-msg','Esta ação exige perícia ou estilo não disponível na ficha.',true);return}
    $('roll-skill').value=skill;$('roll-style').value=style;paintQuickActions();
    say('side-msg','Rolagem configurada para '+name+'. Use o botão Rolar dados no painel central.');
    if(isMobile())mobileNavigate('rolls');
    $('roll-submit').scrollIntoView({behavior:'smooth',block:'center'});
   });row.append(b);root.append(row);
  }
  return;
 }
 renderContent(tab);
}
function stockView(){
 if(!gm())return;
 const root=$('stock-items');root.replaceChildren();
 const query=$('stock-search').value.trim().toLocaleLowerCase('pt-BR');
 const filtered=items.filter(x=>x.category==='item'&&(!query||(x.name+' '+(x.description||'')).toLocaleLowerCase('pt-BR').includes(query)));
 const blocked=items.filter(x=>x.category==='item'&&!available(x)).length;
 const heading=node('p',blocked+' item(ns) indisponível(is) nesta campanha.','small');
 root.append(heading);
 for(const item of filtered){
  const label=node('label',null,'gm-stock-check');
  const input=node('input');input.type='checkbox';
  input.checked=!available(item);
  input.setAttribute('aria-label','Indisponível: '+item.name);
  const title=node('span',item.name,'gm-stock-name');
  const state=node('small',input.checked?'Indisponível':'Disponível','gm-stock-state');
  label.append(input,title,state);root.append(label);
  input.addEventListener('change',async()=>{
   const chosen=input.checked;
   input.disabled=true;
   const {error}=await db.rpc('dh_room_set_stock',{
    p_room:roomId,p_catalog:item.id,p_available:!chosen,p_quantity:null
   });
   if(error){
    input.checked=!chosen;
    state.textContent='Erro ao salvar';
    say('gm-msg','Não foi possível atualizar '+item.name+': '+error.message,true);
    input.disabled=false;return;
   }
   const previous=stock.findIndex(s=>s.catalog_id===item.id);
   const next={catalog_id:item.id,available:!chosen,quantity:null};
   if(previous>=0)stock[previous]=next;else stock.push(next);
   state.textContent=chosen?'Indisponível':'Disponível';
   heading.textContent=items.filter(x=>x.category==='item'&&!available(x)).length+' item(ns) indisponível(is) nesta campanha.';
   input.disabled=false;
   if(tab==='shop')renderSide();
   requestRoomRefresh();
  });
 }
 if(!filtered.length)root.append(node('p','Nenhum item encontrado.','small'));
}
async function loadCatalog(){
 const [{data,error},{data:settings}]=await Promise.all([db.from('dh_catalog').select('id,category,name,archetype,description,xp_cost,coins_cost,rules,published').in('category',['item','talent','power','bonecharm','focus']).eq('published',true).order('name').limit(400),db.from('dh_settings').select('key,value')]);
 for(const item of settings||[])costs[item.key]=item.value;
 if(error){say('side-msg','Erro no catálogo: '+error.message,true);return}
 items=data||[];stockView();renderSide();paintCombatActions();
}
for(const button of document.querySelectorAll('[data-tab]'))button.addEventListener('click',()=>{tab=button.dataset.tab;renderSide()});
$('mobile-category').addEventListener('change',event=>{tab=event.target.value;renderSide()});
$('copy-code').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(room.code);say('room-status','Código copiado: '+room.code)}
 catch(e){say('room-status','Código: '+room.code)}
});
const currentRollPayload=()=>({
 p_room:roomId,
 p_skill:$('roll-skill').value,p_style:$('roll-style').value,
 p_focus:$('roll-focus').value||null,p_dice:Number($('roll-dice').value),
 p_difficulty:Number(room?.test_difficulty??1),
 p_visibility:$('roll-visibility').value
});
async function sendRoll(payload){
 const submit=$('roll-submit'),repeat=$('roll-repeat');
 submit.disabled=true;repeat.disabled=true;
 try{
  const {error}=await db.rpc('dh_roll_room',payload);
  if(error)throw Error(error.message);
  lastRoll={...payload};
  say('roll-msg',payload.p_visibility==='gm_only'?'Rolagem enviada somente ao mestre.':'Rolagem registrada na mesa!');
  await refreshRolls();
 }catch(e){say('roll-msg',e.message,true)}
 finally{submit.disabled=!mySheet;setRepeatReady()}
}
$('roll-submit').addEventListener('click',()=>sendRoll(currentRollPayload()));
$('roll-repeat').addEventListener('click',()=>{
 if(lastRoll&&mySheet)sendRoll({...lastRoll});
});
$('shop-toggle').addEventListener('click',async()=>{
 const {error}=await db.rpc('dh_room_set_shop',{p_room:roomId,p_open:!room.shop_open});
 if(error)say('gm-msg',error.message,true);else{await refresh({side:true});stockView()}
});
$('gm-grant').addEventListener('click',async()=>{
 const character=$('gm-character').value;
 if(!character)return say('gm-msg','Selecione um personagem.',true);
 const coins=Number($('gm-coins').value),xp=Number($('gm-xp').value);
 if(!Number.isSafeInteger(coins)||!Number.isSafeInteger(xp)||Math.abs(coins)>100000||Math.abs(xp)>100000)return say('gm-msg','Insira valores inteiros até 100.000.',true);
 if(!confirm('Aplicar '+(coins>=0?'+':'')+coins+' moedas e '+(xp>=0?'+':'')+xp+' XP ao personagem?'))return;
 const {error}=await db.rpc('dh_room_adjust_resources',{p_room:roomId,p_character:character,p_coins_delta:coins,p_xp_delta:xp});
 if(error)say('gm-msg',error.message,true);else{say('gm-msg','Recursos atualizados.');$('gm-coins').value='0';$('gm-xp').value='0';await refresh({side:true})}
});
$('gm-next').addEventListener('click',async()=>{
 if(!confirm('Iniciar a próxima aventura? Isso reinicia a quantidade de avanços permitidos por aventura.'))return;
 const {error}=await db.rpc('dh_room_next_adventure',{p_room:roomId});
 if(error)say('gm-msg',error.message,true);else{say('gm-msg','Próxima aventura iniciada!');await refresh({side:true})}
});
for(const [buttonId,delta] of [['chaos-less',-1],['chaos-more',1]]){
 $(buttonId).addEventListener('click',async()=>{
  const {error}=await db.rpc('dh_room_adjust_chaos',{p_room:roomId,p_delta:delta});
  if(error)say('gm-msg',error.message,true);else await refresh();
 });
}
$('stock-search').addEventListener('input',stockView);
async function boot(){
 if(!isUuid(roomId))throw Error('Endereço de sala inválido.');
 me=await getAuth();
 gmEditor=initMasterEditor({db,roomId,getCatalog:()=>items,onSaved:async()=>{await refresh()},onSelect:()=>mobileNavigate('character')});
 await refresh({side:false});
 participantView();
 if(!room)return;
 $('table').classList.remove('hidden');
 await loadCatalog();await loadMySheet(true);await refreshRolls();setRollMode('quick');mobileNavigate(gm()&&!mine?.character_id?'more':'character',false);
 const selectedEnemy=new URLSearchParams(location.search).get('enemy');
 if(selectedEnemy&&gm()&&enemies.some(e=>e.id===selectedEnemy)){await gmEditor.chooseEnemy(selectedEnemy);history.replaceState(null,'','mesa.html?id='+encodeURIComponent(roomId));}
 startLiveUpdates();startPresence();
}
try{await boot()}catch(e){
 say('room-status','Não foi possível abrir a mesa: '+e.message,true);
 connectionState('offline','Falha ao carregar a sessão');
}
