import {db,getAuth} from './personagens-common.js';
import {initMasterEditor} from './mesa-mestre.js';
const $=id=>document.getElementById(id),roomId=new URLSearchParams(location.search).get('id');
const isUuid=x=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x||'');
const node=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined&&txt!==null)e.textContent=String(txt);if(cls)e.className=cls;return e};
let me,room,roster=[],enemies=[],mine=null,mySheet=null,items=[],stock=[],purchases=[],tab='sheet',busy=false,costs={},gmEditor=null;
const gm=()=>room?.owner_id===me?.id;
const say=(id,msg,bad=false)=>{$(id).textContent=msg;$(id).className=bad?'error':'status'};
const clip=x=>String(x??'').slice(0,5000);
const fmt=n=>Number(n||0).toLocaleString('pt-BR');
const byId=x=>items.find(i=>i.id===x);
const owns=x=>purchases.filter(p=>p.catalog_id===x.id);
const storeRecord=x=>stock.find(s=>s.catalog_id===x.id);
const available=x=>{const s=storeRecord(x);return !s||(s.available&&s.quantity!==0)};
function option(select,value,label){const o=node('option',label);o.value=String(value);select.append(o)}
function roomView(){
 $('room-name').textContent=room.name;
 $('room-code').textContent='Código: '+room.code;
 $('shop-indicator').textContent=room.shop_open?'Loja aberta':'Loja fechada';
 $('shop-toggle').textContent=room.shop_open?'Fechar loja':'Abrir loja';
 $('adventure-number').textContent='Aventura '+room.adventure_number;
 $('chaos-current').textContent=String(room.chaos??0);
 $('gm-tools').classList.toggle('hidden',!gm());
 $('bestiary-link').classList.toggle('hidden',!gm());
 $('bestiary-link').href='bestiario.html?room='+encodeURIComponent(roomId);
}
function rosterView(){
 const root=$('roster');root.replaceChildren();
 for(const p of roster){
  const card=node('div',null,'player-card');
  card.append(node('strong',p.character_name||p.display_name||(p.is_gm?'Mestre':'Jogador')));
  card.append(node('p',(p.is_gm?'Mestre · ':'')+(p.character_name?(p.archetype||'Sem arquétipo'):'Sem personagem selecionado')));
  if(p.character_id){
   card.append(node('p','Estresse '+p.stress_now+'/'+p.stress_max));
   const outer=node('div',null,'meter'),inner=node('span');
   inner.style.width=Math.min(100,Math.max(0,Number(p.stress_now)/(Number(p.stress_max)||12)*100))+'%';
   outer.append(inner);card.append(outer);
   card.append(node('p','Vazio: '+p.void_points+' · Momentum: '+p.momentum));
   if(gm())card.append(node('p','Moedas: '+fmt(p.coins)+' · XP: '+fmt(p.xp)));
  }
  if(gm()&&p.character_id){
   card.dataset.characterId=p.character_id;
   const open=node('button','Abrir ficha no painel direito','secondary');open.type='button';open.className='gm-open';
   open.addEventListener('click',()=>gmEditor?.choosePlayer(p.character_id));card.append(open);
  }
  root.append(card);
 }
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
  const card=node('div',null,'player-card');
  card.dataset.enemyId=e.id;
  card.append(node('strong',e.name),node('p',(e.tier==='principal'?'Principal':e.tier==='notavel'?'Notável':'Menor')+(e.visible===false?' · Oculto':'')+' · '+(e.section==='nobreza'?'Nobreza':e.section==='selvagens'?'Selvagem':e.section==='notorios'?'Notório':'Povo Comum')));
  const now=Number(e.sheet?.stressAtual||0),max=Number(e.sheet?.stressMax||6);
  card.append(node('p',max===0?'Sem trilha de estresse · cai após ataque bem-sucedido':'Estresse '+now+'/'+max));
  const meter=node('div',null,'meter'),fill=node('span');
  fill.style.width=Math.min(100,Math.max(0,now/Math.max(1,max)*100))+'%';meter.append(fill);if(max>0)card.append(meter);
  card.append(node('p','Pontos do Vazio: '+(e.sheet?.void||0)));
  if(gm()){
   const open=node('button','Abrir ficha de inimigo','secondary');open.type='button';open.className='gm-open';
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
  const div=node('article',null,'roll-card'+(r.visibility==='public'?'':' private'));
  const h=node('h4',(actor?.character_name||actor?.display_name||'Jogador')+' · '+r.skill+' + '+r.style);
  const vis=r.visibility==='public'?'Pública':r.visibility==='private'?'Privada':'Somente mestre';
  const date=new Date(r.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  div.append(h,node('p',date+' · '+vis+' · Dificuldade '+r.difficulty));
  div.append(node('div',(r.rolls||[]).join(' · '),'dice'));
  const passed=r.successes>=r.difficulty;
  div.append(node('p',r.successes+' sucesso(s) · '+r.complications+' complicação(ões) · '+(passed?'Sucesso':'Falha'),passed?'success':'fail'));
  div.append(node('p','Alvo: '+r.target+(r.focus?' · Foco: '+r.focus+' ('+r.focus_value+')':'')));
  root.append(div);
 }
}
function focusOptions(){
 const result=[];const built=mySheet?.creation?.focus;
 if(Array.isArray(built))for(const f of built)if(f.nome&&f.valor)result.push({name:f.nome,rank:f.valor});
 for(const f of mySheet?.catalogSelections?.focus||[])if(f.origin==='starting'&&f.name&&f.rank&&!result.some(x=>x.name===f.name))result.push({name:f.name,rank:f.rank});
 return result;
}
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
}
async function refresh({side=false}={}){
 if(busy)return;busy=true;
 try{
  const [r,m,rr,st,pu,enemyResponse]=await Promise.all([
   db.from('dh_rooms').select('id,code,name,owner_id,shop_open,chaos,adventure_number,active').eq('id',roomId).single(),
   db.rpc('dh_room_roster',{p_room:roomId}),
   db.from('dh_room_rolls').select('id,user_id,character_id,skill,style,focus,focus_value,difficulty,dice,rolls,target,successes,complications,visibility,created_at').eq('room_id',roomId).order('created_at',{ascending:false}).limit(75),
   db.from('dh_room_stock').select('catalog_id,available,quantity').eq('room_id',roomId),
   db.from('dh_room_purchases').select('id,room_id,character_id,catalog_id,amount,currency,created_at').eq('room_id',roomId).order('created_at',{ascending:false}).limit(200),
   db.from('dh_room_enemies').select('id,name,section,tier,sheet,inventory,visible').eq('room_id',roomId).order('created_at',{ascending:true}).limit(150)
  ]);
  if(r.error)throw Error('Sala não encontrada ou sem acesso. '+r.error.message);
  const oldMode=room?.shop_open;
  room=r.data;roster=m.error?[]:m.data||[];stock=st.error?[]:st.data||[];purchases=pu.error?[]:pu.data||[];enemies=enemyResponse.error?[]:enemyResponse.data||[];
  mine=roster.find(x=>x.user_id===me.id)||null;
  roomView();rosterView();enemyView();diceView(rr.data||[]);
  $('coins').textContent='Moedas: '+(mine?.character_id?fmt(mine.coins):'—');
  $('xp').textContent='XP: '+(mine?.character_id?fmt(mine.xp):'—');
  if(side||oldMode!==room.shop_open)renderSide();
  if(!m.error&&mine?.character_id&&(!mySheet||side))await loadMySheet(false);
 }catch(e){say('room-status',e.message,true)}finally{busy=false}
}
async function loadMySheet(redraw=true){
 if(!mine?.character_id){mySheet=null;rollerView();$('my-character').replaceChildren(node('p',gm()?'Você está como mestre. Clique em Abrir ficha de um participante ou inimigo no painel esquerdo.':'Vincule uma ficha à campanha pelo lobby.'));if(redraw)renderSide();return}
 const {data,error}=await db.from('dh_characters').select('id,name,sheet,creation_status').eq('id',mine.character_id).eq('owner_id',me.id).single();
 if(error){say('side-msg',error.message,true);return}
 mySheet=data.sheet;rollerView();
 const root=$('my-character');root.replaceChildren();
 root.append(node('strong',mine.character_name));
 const edit=node('a','Abrir ficha completa','btn secondary');edit.href='personagem.html?id='+encodeURIComponent(mine.character_id);edit.style.marginTop='8px';
 root.append(edit);
 if(redraw)renderSide();
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
  await refresh({side:true});await loadMySheet(true);
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
  await refresh({side:false});await loadMySheet(false);renderSide();
 };
 kind.addEventListener('change',choose);action.addEventListener('click',go);
 root.append(node('label','Tipo de aprimoramento'),kind,node('label','Aumentar em +1'),target,current,action,message);
 if(!room.shop_open)root.append(node('p','Modo consulta: o mestre precisa abrir a loja.','small'));
 choose();
}

function renderSide(){
 const root=$('side-content');root.replaceChildren();
 for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===tab));
 if(tab==='shop'){renderShop();return}
 if(tab==='upgrade'){renderUpgrade();return}
 if(tab==='sheet'){
  if(!mine?.character_id){root.append(node('p','Nenhum personagem vinculado. Use a página Salas para vincular uma ficha.'));return}
  root.append(node('p','Personagem: '+mine.character_name));
  root.append(node('p','Arquétipo: '+mine.archetype));
  root.append(node('p','Estresse: '+mine.stress_now+'/'+mine.stress_max+' · Vazio: '+mine.void_points+' · Momentum: '+mine.momentum));
  const link=node('a','Editar ficha completa','btn secondary');link.href='personagem.html?id='+encodeURIComponent(mine.character_id);root.append(link);
  root.append(node('p','A tabela de combate e os recursos mostrados aqui refletem sua ficha salva no Supabase.','small'));return;
 }
 if(tab==='actions'){
  root.append(node('p','Escolha uma ação para configurar a próxima rolagem. A dificuldade e a privacidade continuam à sua escolha.','small'));
  const actions=[['Ataque corpo a corpo','Lutar','Rapidamente'],['Ataque calculado','Lutar','Cuidadosamente'],['Fugir ou esquivar','Mover','Rapidamente'],['Observar inimigo','Estudar','Cuidadosamente'],['Intimidar','Falar','Forçosamente'],['Reparar equipamento','Consertar','Habilmente']];
  for(const [name,skill,style] of actions){
   const row=node('div',null,'item-row');
   const b=node('button',name,'secondary');b.type='button';b.disabled=!mySheet;
   b.addEventListener('click',()=>{
    if(![...$('roll-skill').options].some(x=>x.value===skill)||![...$('roll-style').options].some(x=>x.value===style)){say('side-msg','Esta ação exige perícia ou estilo não disponível na ficha.',true);return}
    $('roll-skill').value=skill;$('roll-style').value=style;
    say('side-msg','Rolagem configurada para '+name+'. Use o botão Rolar dados no painel central.');
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
 for(const item of items.filter(x=>x.category==='item'&&(!query||x.name.toLocaleLowerCase('pt-BR').includes(query))).slice(0,50)){
  const s=storeRecord(item);
  const div=node('div',null,'item-row');
  div.append(node('strong',item.name),node('p',s?statusText(item):'Sem restrição: disponível sem limite'));
  const row=node('div',null,'row');
  const qty=node('input');qty.type='number';qty.min='0';qty.placeholder='∞';qty.style.width='70px';qty.value=s?.quantity??'';
  qty.setAttribute('aria-label','Limite de '+item.name);
  const allow=node('button','Liberar','secondary');allow.type='button';
  const block=node('button','Bloquear','secondary');block.type='button';
  const set=async flag=>{
   const count=qty.value.trim()===''?null:Number(qty.value);
   if(count!==null&&(!Number.isSafeInteger(count)||count<0)){say('gm-msg','Estoque inválido.',true);return}
   const {error}=await db.rpc('dh_room_set_stock',{p_room:roomId,p_catalog:item.id,p_available:flag,p_quantity:count});
   if(error)say('gm-msg',error.message,true);else{say('gm-msg','Disponibilidade de '+item.name+' atualizada.');await refresh({side:true});stockView()}
  };
  allow.addEventListener('click',()=>set(true));block.addEventListener('click',()=>set(false));
  row.append(qty,allow,block);div.append(row);root.append(div);
 }
}
async function loadCatalog(){
 const [{data,error},{data:settings}]=await Promise.all([db.from('dh_catalog').select('id,category,name,archetype,description,xp_cost,coins_cost,rules,published').in('category',['item','talent','power','bonecharm','focus']).eq('published',true).order('name').limit(400),db.from('dh_settings').select('key,value')]);
 for(const item of settings||[])costs[item.key]=item.value;
 if(error){say('side-msg','Erro no catálogo: '+error.message,true);return}
 items=data||[];stockView();renderSide();
}
for(const button of document.querySelectorAll('[data-tab]'))button.addEventListener('click',()=>{tab=button.dataset.tab;renderSide()});
$('copy-code').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(room.code);say('room-status','Código copiado: '+room.code)}
 catch(e){say('room-status','Código: '+room.code)}
});
$('roll-submit').addEventListener('click',async()=>{
 const b=$('roll-submit');b.disabled=true;
 try{
 const payload={p_room:roomId,p_skill:$('roll-skill').value,p_style:$('roll-style').value,p_focus:$('roll-focus').value||null,p_dice:Number($('roll-dice').value),p_difficulty:Number($('roll-difficulty').value),p_visibility:$('roll-visibility').value};
 const {error}=await db.rpc('dh_roll_room',payload);if(error)throw Error(error.message);
 say('roll-msg',payload.p_visibility==='gm_only'?'Rolagem enviada somente ao mestre.':'Rolagem registrada na mesa!');
 await refresh();
 }catch(e){say('roll-msg',e.message,true)}finally{b.disabled=!mySheet}
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
 gmEditor=initMasterEditor({db,roomId,getCatalog:()=>items,onSaved:async()=>{await refresh({side:true});await loadMySheet(true)}});
 await refresh({side:false});
 if(!room)return;
 $('table').classList.remove('hidden');
 await loadCatalog();await loadMySheet(true);
 const selectedEnemy=new URLSearchParams(location.search).get('enemy');
 if(selectedEnemy&&gm()&&enemies.some(e=>e.id===selectedEnemy)){await gmEditor.chooseEnemy(selectedEnemy);history.replaceState(null,'','mesa.html?id='+encodeURIComponent(roomId));}
 setInterval(()=>refresh(),4500);
}
try{await boot()}catch(e){say('room-status',e.message,true)}
