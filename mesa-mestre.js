// Painel de mestre: seleção de participantes e NPCs, edição salva por RPCs autorizadas no banco.
const $=id=>document.getElementById(id);
const make=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined&&text!==null)x.textContent=String(text);if(cls)x.className=cls;return x};
const sections={povo_comum:'O Povo Comum',nobreza:'A Nobreza',selvagens:'O Selvagem',notorios:'O Notório'};
const tiers={incidental:'Incidental',menor:'Menor',notavel:'Notável',principal:'Principal'};
const skills=['Lutar','Mover','Estudar','Sobreviver','Falar','Consertar'];
const styles=['Ousadamente','Cuidadosamente','Habilmente','Forçosamente','Silenciosamente','Rapidamente'];
export function initMasterEditor({db,roomId,onSaved,getCatalog}){
 let selected=null,working=null,inventory=[],focusEntries=[],saving=false;
 const message=(text,bad=false)=>{$('gm-editor-status').textContent=text;$('gm-editor-status').className=bad?'error':'status'};
 const put=(id,label,value,type='text',max)=>{
  const box=make('div');const lab=make('label',label);lab.htmlFor=id;
  const input=make('input');input.id=id;input.type=type;input.value=String(value??'');
  if(type==='number'){input.min='0';input.max=String(max??1000000);input.step='1'}
  box.append(lab,input);return box;
 };
 const choice=(id,label,values,value)=>{
  const wrap=make('div');const lab=make('label',label);lab.htmlFor=id;
  const select=make('select');select.id=id;
  for(const [id,text] of Object.entries(values)){const o=make('option',text);o.value=id;select.append(o)}
  select.value=value;wrap.append(lab,select);return wrap;
 };
 const section=(title)=>{const s=make('section',null,'gm-sheet-section');s.append(make('h3',title));return s};
 const paired=(root,...fields)=>{const grid=make('div',null,'form-grid');grid.append(...fields);root.append(grid);};
 function close(){
  selected=null;working=null;inventory=[];focusEntries=[];
  $('gm-selected').classList.add('hidden');$('player-side').classList.remove('hidden');
  $('right-title').textContent='Minha ficha e ações';$('gm-editor').replaceChildren();message('');
  document.querySelectorAll('.player-card.gm-active').forEach(x=>x.classList.remove('gm-active'));
 }
 $('gm-back-own').addEventListener('click',close);
 function drawFocuses(){
  const root=$('gm-focus-list');if(!root)return;root.replaceChildren();
  focusEntries.forEach((item,i)=>{
   const row=make('div',null,'gm-focus-entry');
   const name=make('input');name.type='text';name.value=item.nome||'';name.placeholder='Nome do foco';
   name.setAttribute('aria-label','Foco '+(i+1));name.addEventListener('input',()=>{item.nome=name.value});
   const rank=make('input');rank.type='number';rank.min='1';rank.max='8';rank.step='1';rank.value=item.valor??2;
   rank.setAttribute('aria-label','Classificação do foco '+(i+1));rank.addEventListener('input',()=>{item.valor=Number(rank.value)});
   const remove=make('button','Remover','secondary');remove.type='button';remove.addEventListener('click',()=>{focusEntries.splice(i,1);drawFocuses()});
   row.append(name,rank,remove);root.append(row);
  });
 }
 function drawInventory(){
  const root=$('gm-inventory-list');if(!root)return;
  root.replaceChildren();
  if(!inventory.length)root.append(make('p','Nenhum equipamento concedido pelo mestre.','small'));
  inventory.forEach((item,i)=>{
   const row=make('div',null,'gm-inventory-entry');
   const title=make('span',(item.name||'Item')+' ×'+(item.quantity||1));
   const remove=make('button','Remover','secondary');remove.type='button';
   remove.addEventListener('click',()=>{inventory.splice(i,1);drawInventory()});
   row.append(title,remove);root.append(row);
  });
 }

 function renderEnemyQuick(){
  const sh=working.sheet||{},root=$('gm-editor');root.replaceChildren();
  root.append(make('h3',working.name),make('p','Ações e rolagens rápidas deste adversário. As alterações na ficha ficam fora da mesa.','small'));
  const tier=working.tier==='incidental'?'Incidental':working.tier==='menor'?'Menor':working.tier==='notavel'?'Notável':'Principal';
  root.append(make('p','NPC '+tier+' · '+(working.section==='selvagens'?'O Selvagem':working.section==='nobreza'?'A Nobreza':working.section==='notorios'?'O Notório':'O Povo Comum'),'small'));
  const stress=Number(sh.stressMax??0);
  const stressText=make('p',stress===0?'Sem trilha de estresse.':'Estresse: '+(sh.stressAtual??0)+' / '+stress,'small');
  const visibility=make('label','Mostrar barra de estresse aos jogadores','gm-stress-toggle');
  const checkbox=make('input');checkbox.type='checkbox';checkbox.checked=working.stress_visible!==false;
  checkbox.style.width='auto';checkbox.setAttribute('aria-label','Exibir estresse do inimigo aos jogadores');
  visibility.prepend(checkbox);
  const toggleStatus=make('span',checkbox.checked?'Visível':'Oculta','small');visibility.append(toggleStatus);
  checkbox.addEventListener('change',async()=>{
   checkbox.disabled=true;
   const {error}=await db.rpc('dh_room_enemy_set_stress_visibility',{p_room:roomId,p_enemy:selected.id,p_visible:checkbox.checked});
   if(error){checkbox.checked=!checkbox.checked;message(error.message,true)}
   else{working.stress_visible=checkbox.checked;toggleStatus.textContent=checkbox.checked?'Visível':'Oculta';await onSaved();message('Visibilidade atualizada para os jogadores.')}
   checkbox.disabled=false;
  });
  root.append(stressText,visibility);
  const skills=Array.isArray(sh.skills)?sh.skills:[],styles=Array.isArray(sh.styles)?sh.styles:[];
  const controls=make('div',null,'gm-quick-roll');
  const dice=make('select');dice.id='gm-enemy-dice';for(let n=2;n<=5;n++){const opt=make('option',n+'d20');opt.value=n;dice.append(opt)}
  const difficulty=make('select');difficulty.id='gm-enemy-difficulty';for(let n=0;n<=5;n++){const opt=make('option','Dificuldade '+n);opt.value=n;difficulty.append(opt)}difficulty.value='1';
  const visibilityRoll=make('select');visibilityRoll.id='gm-enemy-roll-visibility';
  for(const [value,label] of [['public','Pública'],['gm_only','Somente mestre']]){const opt=make('option',label);opt.value=value;visibilityRoll.append(opt)}
  const skillSelect=make('select');skillSelect.id='gm-enemy-skill';
  for(const item of skills){const opt=make('option',item.label+' ('+item.value+')');opt.value=item.label;skillSelect.append(opt)}
  const styleSelect=make('select');styleSelect.id='gm-enemy-style';
  for(const item of styles){const opt=make('option',item.label+' ('+item.value+')');opt.value=item.label;styleSelect.append(opt)}
  const grid=make('div',null,'form-grid');
  for(const [label,el] of [['Perícia',skillSelect],['Estilo',styleSelect],['Dados',dice],['Dificuldade',difficulty],['Privacidade',visibilityRoll]]){
   const box=make('div');const l=make('label',label);box.append(l,el);grid.append(box)
  }
  controls.append(make('h3','Rolagens do inimigo'),grid);
  const abilities=make('div',null,'gm-enemy-actions');
  const attacks=String(sh.ataques||'').split(';').map(x=>x.trim()).filter(Boolean);
  controls.append(make('h4','Ações da ficha'));
  if(sh.regrasEspeciais)controls.append(make('p',sh.regrasEspeciais,'small'));
  const act=async(label,button)=>{
   if(!skillSelect.value||!styleSelect.value)return message('Esta ficha não possui perícia ou estilo para rolar.',true);
   button.disabled=true;message('Rolando '+label+'...');
   const {error}=await db.rpc('dh_room_enemy_roll',{
    p_room:roomId,p_enemy:selected.id,p_skill:skillSelect.value,p_style:styleSelect.value,
    p_action:label,p_dice:Number(dice.value),p_difficulty:Number(difficulty.value),p_visibility:visibilityRoll.value
   });
   if(error){message('Falha na rolagem: '+error.message,true);button.disabled=false;return}
   await onSaved();message('Rolagem de '+label+' registrada no painel central.');button.disabled=false;
  };
  const makeAction=label=>{
   const row=make('div',null,'gm-enemy-action-row');
   row.append(make('span',label));
   const btn=make('button','Rolar ação','secondary');btn.type='button';btn.addEventListener('click',()=>act(label,btn));
   row.append(btn);abilities.append(row);
  };
  for(const attack of attacks)makeAction(attack);
  makeAction('Teste livre');
  controls.append(abilities);
  root.append(controls);
  const link=make('a','Consultar ficha do bestiário','btn secondary');
  if(working.template_id){link.href='ficha-inimigo.html?id='+encodeURIComponent(working.template_id)+'&room='+encodeURIComponent(roomId);root.append(link)}
  const remove=make('button','Remover inimigo da mesa','danger-button');
  remove.type='button';
  remove.style.marginTop='12px';
  remove.addEventListener('click',deleteEnemy);
  root.append(remove);
  message('');
 }

 function render(){
  if(!selected||!working)return;
  const npc=selected.kind==='enemy',sheet=working.sheet||{};
  $('gm-selected').classList.remove('hidden');$('player-side').classList.add('hidden');
  $('right-title').textContent=npc?'Ficha de inimigo':'Ficha de jogador';
  const root=$('gm-editor');root.replaceChildren();message('');
  if(npc){renderEnemyQuick();return}
  const desc=make('p',npc?'NPC sob seu controle. Edite livremente atributos, histórico, condições e itens.':'Você está editando a ficha de um participante como mestre. As alterações serão salvas na conta dele.','small');
  root.append(desc);
  const ident=section('Identificação');
  paired(ident,put('gm-name','Nome',working.name),npc?choice('gm-section','Seção do bestiário',sections,working.section):put('gm-archetype','Arquétipo',working.archetype||sheet.arquetipo||''));
  if(npc){paired(ident,choice('gm-tier','Importância',tiers,working.tier));const box=make('div');const input=make('input');input.type='checkbox';input.id='gm-visible';input.checked=working.visible!==false;input.style.width='auto';const lab=make('label','Visível aos jogadores na mesa');lab.htmlFor=input.id;box.append(lab,input);ident.append(box);}
  paired(ident,put('gm-truth','Verdade / característica',sheet.verdade1||''),put('gm-truth2','Segunda Verdade',sheet.verdade2||''));
  const story=make('textarea');story.id='gm-background';story.value=sheet.background||'';const storyLabel=make('label','Histórico e observações');storyLabel.htmlFor=story.id;ident.append(storyLabel,story);root.append(ident);
  const resources=section('Estresse e recursos');
  paired(resources,put('gm-stress','Estresse atual',sheet.stressAtual??0,'number',1000),put('gm-stressmax',npc&&['menor','incidental'].includes(working.tier)?'Trilha (0 = derrotado com ataque)':'Estresse máximo',sheet.stressMax??12,'number',1000));
  if(npc){
   paired(resources,put('gm-void','Pontos do Vazio',sheet.void??0,'number',20),put('gm-momentum','Momentum',sheet.momentum??0,'number',50));
  }else{
   paired(resources,put('gm-coins-direct','Moedas',working.coins??0,'number',1000000),put('gm-xp-direct','XP',working.xp??0,'number',1000000));
   paired(resources,put('gm-void','Pontos do Vazio',working.void_points??0,'number',20),put('gm-momentum','Momentum',working.momentum??0,'number',50));
  }
  root.append(resources);
  const stats=section('Perícias e estilos');
  for(const [title,key,names] of [['Perícias','skills',skills],['Estilos','styles',styles]]){
   stats.append(make('h4',title));
   const area=make('div',null,'gm-stats-grid');
   const source=Array.isArray(sheet[key])?sheet[key]:[];
   for(const name of names){
    const item=source.find(x=>x.label===name)||(name==='Habilmente'?source.find(x=>x.label==='Inteligentemente'):null);
    const id='gm-'+key+'-'+names.indexOf(name);
    const control=put(id,name,item?.value??4,'number',12);
    control.querySelector('input').dataset.statKey=key;control.querySelector('input').dataset.statLabel=item?.label||name;
    area.append(control);
   }
   stats.append(area);
  }
  root.append(stats);
  const abilities=section('Focos, ataques e poderes');
  const asText=(id,label,value)=>{
   const labelElement=make('label',label);labelElement.htmlFor=id;
   const field=make('textarea');field.id=id;field.rows=3;field.value=String(value||'');
   abilities.append(labelElement,field);
  };
  asText('gm-focus-text','Focos e especialidades',sheet.focos||sheet.notas?.['nota-focos']||'');
  asText('gm-attack-text','Ataques e ações especiais',sheet.ataques||'');
  asText('gm-power-text','Poderes do Vazio',sheet.notas?.['nota-poderes']||'');
  asText('gm-talent-text','Talentos e vantagens',sheet.notas?.['nota-talentos']||'');
  asText('gm-special-text','Regras especiais e condições',sheet.regrasEspeciais||'');
  if(!npc){
   const focusTitle=make('h4','Focos ativos na rolagem (nome e classificação)');
   abilities.append(focusTitle);
   const focusList=make('div');focusList.id='gm-focus-list';abilities.append(focusList);
   const addFocus=make('button','+ Adicionar foco','secondary');addFocus.type='button';
   addFocus.addEventListener('click',()=>{focusEntries.push({nome:'',valor:2});drawFocuses()});
   abilities.append(addFocus);
   abilities.append(make('p','Estas classificações passam a valer nas rolagens oficiais.','small'));
  }
  root.append(abilities);
  if(!npc)drawFocuses();
  const inventorySection=section('Itens e equipamentos');
  inventorySection.append(make('p',npc?'Equipamentos deste inimigo.':'Inventário oficial concedido pelo mestre — separado de itens apenas anotados para teste.','small'));
  const invRoot=make('div');invRoot.id='gm-inventory-list';inventorySection.append(invRoot);
  const add=make('div',null,'gm-inventory-add');
  const select=make('select');select.id='gm-item-select';
  const available=getCatalog().filter(x=>x.category==='item');
  for(const item of available){const opt=make('option',item.name);opt.value=item.name;select.append(opt)}
  const qty=make('input');qty.id='gm-item-quantity';qty.type='number';qty.min='1';qty.max='999';qty.value='1';qty.title='Quantidade';
  const give=make('button','Dar item');give.type='button';
  give.addEventListener('click',()=>{
   const name=select.value,count=Number(qty.value);
   if(!name||!Number.isInteger(count)||count<1||count>999)return message('Escolha um item e uma quantidade válida.',true);
   const found=inventory.find(x=>x.name===name);
   if(found)found.quantity+=count;else inventory.push({name,quantity:count});
   drawInventory();message('Inventário editado. Clique em Salvar ficha para confirmar.');
  });
  add.append(select,qty,give);inventorySection.append(add);
  const manual=make('div',null,'gm-inventory-add');
  const custom=make('input');custom.placeholder='Nome de item personalizado';custom.id='gm-custom-item';custom.maxLength=160;
  const addCustom=make('button','Adicionar personalizado','secondary');addCustom.type='button';
  addCustom.addEventListener('click',()=>{
   const name=custom.value.trim();if(!name)return;
   const found=inventory.find(x=>x.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'));
   if(found)found.quantity++;else inventory.push({name,quantity:1});
   custom.value='';drawInventory();
  });
  manual.append(custom,addCustom);inventorySection.append(manual);
  const baseGearLabel=make('label','Equipamento inicial / itens descritos na ficha');baseGearLabel.htmlFor='gm-initial-gear';
  const baseGear=make('textarea');baseGear.id='gm-initial-gear';baseGear.rows=3;
  baseGear.value=sheet.notas?.['nota-pertences']||'';
  inventorySection.append(baseGearLabel,baseGear,make('p','Você pode editar ou apagar o equipamento inicial. Os itens concedidos pelo mestre ficam na lista acima.','small'));
  root.append(inventorySection);drawInventory();
  const actions=make('div',null,'gm-actions');
  const save=make('button','Salvar alterações da ficha');save.type='button';save.id='gm-editor-save';
  save.addEventListener('click',saveCurrent);
  actions.append(save);
  if(npc){
   const remove=make('button','Remover inimigo da sala','danger-button');remove.type='button';
   remove.addEventListener('click',deleteEnemy);actions.append(remove);
  }
  root.append(actions);
 }
 const readNum=(id,min,max)=>{
  const v=Number($(id)?.value);
  if(!Number.isSafeInteger(v)||v<min||v>max)throw Error('Valor inválido no campo '+id+'.');
  return v;
 };
 function gather(){
  const npc=selected.kind==='enemy',sheet=structuredClone(working.sheet||{});
  const name=$('gm-name').value.trim();
  if(!name||name.length>150)throw Error('Informe um nome válido.');
  sheet.nome=name;
  sheet.verdade1=$('gm-truth').value;sheet.verdade2=$('gm-truth2').value;sheet.background=$('gm-background').value;
  sheet.stressAtual=readNum('gm-stress',0,1000);sheet.stressMax=readNum('gm-stressmax',npc?0:1,1000);
  if(sheet.stressAtual>sheet.stressMax)throw Error('Estresse atual não pode superar o máximo.');
  for(const key of ['skills','styles']){
   const original=Array.isArray(sheet[key])?sheet[key]:[];
   const known=new Set();
   sheet[key]=[...rootStatFields(key)].map(input=>{
    const label=input.dataset.statLabel,old=original.find(x=>x.label===label);
    known.add(label);
    return {...(old||{}),label,value:readNum(input.id,0,12)};
   }).concat(original.filter(item=>!known.has(item.label)));
  }
  if(!npc){
   const normalized=focusEntries.map(x=>({nome:String(x.nome||'').trim(),valor:Number(x.valor)}));
   if(normalized.some(x=>!x.nome||!Number.isInteger(x.valor)||x.valor<1||x.valor>8))throw Error('Foco precisa de nome e classificação entre 1 e 8.');
   if(new Set(normalized.map(x=>x.nome.toLocaleLowerCase('pt-BR'))).size!==normalized.length)throw Error('Focos duplicados.');
   sheet.creation={...(sheet.creation||{}),focus:normalized};
  }
  sheet.focos=$('gm-focus-text').value;
  sheet.ataques=$('gm-attack-text').value;
  sheet.regrasEspeciais=$('gm-special-text').value;
  sheet.notas={...(sheet.notas||{}),'nota-focos':sheet.focos,'nota-poderes':$('gm-power-text').value,'nota-talentos':$('gm-talent-text').value,'nota-pertences':$('gm-initial-gear').value};
  if(npc){sheet.void=readNum('gm-void',0,20);sheet.momentum=readNum('gm-momentum',0,50);sheet.defeated_on_success=['menor','incidental'].includes($('gm-tier').value);}
  else{sheet.arquetipo=$('gm-archetype').value.trim();sheet.gmInventory=structuredClone(inventory);}
  return {name,sheet};
 }
 function rootStatFields(key){return document.querySelectorAll('#gm-editor [data-stat-key="'+key+'"]')}
 async function saveCurrent(){
  if(!selected||!working||saving)return;
  saving=true;const btn=$('gm-editor-save');btn.disabled=true;
  try{
   const {name,sheet}=gather();let result;
   if(selected.kind==='enemy'){
    result=await db.rpc('dh_room_enemy_update',{
     p_room:roomId,p_enemy:selected.id,p_name:name,p_section:$('gm-section').value,p_tier:$('gm-tier').value,
     p_sheet:sheet,p_inventory:inventory,p_visible:$('gm-visible').checked
    });
   }else{
    result=await db.rpc('dh_room_gm_update_character',{
     p_room:roomId,p_character:selected.id,p_sheet:sheet,p_coins:readNum('gm-coins-direct',0,1000000),
     p_xp:readNum('gm-xp-direct',0,1000000),p_void:readNum('gm-void',0,20),p_momentum:readNum('gm-momentum',0,50)
    });
   }
   if(result.error)throw Error(result.error.message);
   const remember={...selected};await onSaved();
   if(remember.kind==='enemy')await chooseEnemy(remember.id);else await choosePlayer(remember.id);
   message('Ficha salva com sucesso!');
  }catch(e){message('Erro ao salvar: '+e.message,true)}
  finally{saving=false;const current=$('gm-editor-save');if(current)current.disabled=false}
 }
 async function deleteEnemy(){
  if(!selected||selected.kind!=='enemy')return;
  if(!confirm('Remover permanentemente o inimigo “'+working.name+'” desta mesa?'))return;
  const {error}=await db.rpc('dh_room_enemy_delete',{p_room:roomId,p_enemy:selected.id});
  if(error)return message(error.message,true);
  close();await onSaved();
 }
 async function choosePlayer(id){
  const {data,error}=await db.rpc('dh_room_gm_sheet',{p_room:roomId,p_character:id});
  if(error)return message(error.message,true);
  selected={kind:'player',id};working=data;inventory=Array.isArray(data.sheet?.gmInventory)?structuredClone(data.sheet.gmInventory):[];focusEntries=Array.isArray(data.sheet?.creation?.focus)?structuredClone(data.sheet.creation.focus):[];
  render();highlight();
 }
 async function chooseEnemy(id){
  const {data,error}=await db.from('dh_room_enemies').select('id,room_id,name,tier,section,sheet,inventory,visible,stress_visible,template_id').eq('room_id',roomId).eq('id',id).single();
  if(error)return message(error.message,true);
  selected={kind:'enemy',id};working=data;inventory=Array.isArray(data.inventory)?structuredClone(data.inventory):[];focusEntries=[];
  render();highlight();
 }
 function highlight(){
  for(const card of document.querySelectorAll('[data-character-id],[data-enemy-id]')){
   const match=selected?.kind==='player'?card.dataset.characterId===selected.id:card.dataset.enemyId===selected?.id;
   card.classList.toggle('gm-active',!!match);
  }
 }
 return {choosePlayer,chooseEnemy,highlight,selected:()=>selected,close};
}
