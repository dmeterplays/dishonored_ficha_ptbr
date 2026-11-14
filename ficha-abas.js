import {focosOficiais} from './focos-oficiais.js';
// Abas de catálogo da ficha: apenas referências. Não altera posse oficial, XP, moedas ou poderes.
const categories={
 talent:{title:'Talentos',hint:'Talentos escolhidos e opções para avaliação do mestre.',price:'XP'},
 focus:{title:'Focos',hint:'Especialidades do personagem e novas opções de foco.',price:'XP'},
 power:{title:'Poderes do Vazio',hint:'Poderes registrados e sugestões de habilidades sobrenaturais.',price:'XP'},
 bonecharm:{title:'Amuletos de osso',hint:'Amuletos registrados e referências para encontrar durante a aventura.',price:'Moedas'},
 item:{title:'Itens',hint:'Equipamentos iniciais, inventário de referência e itens de interesse.',price:'Moedas'}
};
const $=id=>document.getElementById(id);
const node=(tag,text,klass)=>{const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=String(text);if(klass)e.className=klass;return e};
const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
function fromOriginal(sheet){
 const collected={talent:[],focus:[],power:[],bonecharm:[],item:[]};
 const add=(kind,name,description='',rank=null)=>{
  if(!String(name||'').trim())return;
  if(collected[kind].some(x=>normalize(x.name)===normalize(name)))return;
  collected[kind].push({id:null,name:String(name).trim(),description:String(description||''),origin:'starting',rank});
 };
 const built=sheet?.creation||{};
 if(built.talent)add('talent',built.talent);
 else if(sheet?.notas?.['nota-talentos'])add('talent',sheet.notas['nota-talentos']);
 if(Array.isArray(built.focus)&&built.focus.length){
  for(const focus of built.focus)add('focus',focus.nome||focus.name,'',Number(focus.valor||focus.value)||null);
 }else if(sheet?.notas?.['nota-focos']){
  for(const term of String(sheet.notas['nota-focos']).split(/[,\n]+/)){
   const match=term.trim().match(/^(.+?)\s*\((\d+)\)$/);
   if(match)add('focus',match[1],'',Number(match[2]));
   else add('focus',term.trim());
  }
 }
 const initialGear=sheet?.notas?.['nota-pertences'];
 if(initialGear)add('item',initialGear);
 const initialPowers=sheet?.notas?.['nota-poderes'];
 if(initialPowers)add('power',initialPowers);
 return collected;
}
function normalizeSelections(sheet){
 const original=sheet?.catalogSelections;
 const seeded=fromOriginal(sheet);
 if(!original||typeof original!=='object'||Array.isArray(original))return seeded;
 const result={};
 for(const kind of Object.keys(categories)){
  result[kind]=Array.isArray(original[kind])?
   original[kind].filter(x=>x&&typeof x.name==='string'&&x.name.trim()).map(x=>({
    id:typeof x.id==='string'?x.id:null,
    name:x.name.trim(),description:String(x.description||''),
    origin:x.origin==='starting'?'starting':'reference',
    rank:Number.isInteger(Number(x.rank))&&x.rank!==null?Number(x.rank):null
   })):seeded[kind];
 }
 const focusRecords=Array.isArray(sheet?.focuses)?sheet.focuses:null;
 if(focusRecords){
  result.focus=focusRecords.filter(x=>x&&typeof (x.name||x.nome)==='string'&&Number.isInteger(Number(x.rank??x.valor))&&Number(x.rank??x.valor)>=1&&Number(x.rank??x.valor)<=8)
   .map(x=>({id:null,name:String(x.name||x.nome).trim(),description:'',origin:'sheet',rank:Number(x.rank??x.valor)}));
 }else{
  const merged=[];
  for(const entry of [...(seeded.focus||[]),...(result.focus||[])])
   if(entry.name&&!merged.some(x=>normalize(x.name)===normalize(entry.name)))merged.push(entry);
  result.focus=merged;
 }
 return result;
}
export function initCharacterCollections({db,sheet,onChange}){
 const values=normalizeSelections(sheet);
 const list=$('collection-cards'),browser=$('collection-browser'),options=$('collection-options');
 const search=$('collection-search'),notice=$('collection-status'),browserNotice=$('collection-browser-status');
 let kind='talent',catalog=[],loadError=null;
 const tell=(txt,err=false)=>{notice.textContent=txt;notice.className=err?'error':'status'};
 const current=()=>values[kind]||[];
 const findRecord=entry=>catalog.find(x=>x.id===entry.id)||(catalog.find(x=>x.category===kind&&normalize(x.name)===normalize(entry.name)))||null;
 const allowed=()=>catalog.filter(x=>x.category===kind&&x.published!==false);
 function details(entry,record){
  const wrap=node('div',null,'collection-details');
  const description=(record?.description||entry.description||'Descrição não disponível para esta entrada. Consulte o mestre.');
  wrap.append(node('p',description));
  if(kind==='focus'&&entry.rank!==null&&entry.rank!==undefined)wrap.append(node('p','Classificação de foco: '+entry.rank));
  if(record?.archetype)wrap.append(node('p','Arquétipo: '+record.archetype));
  if(record?.xp_cost!==null&&record?.xp_cost!==undefined)wrap.append(node('p','Custo de referência: '+record.xp_cost+' XP'));
  if(record?.coins_cost!==null&&record?.coins_cost!==undefined)wrap.append(node('p','Preço de referência: '+record.coins_cost+' moedas'));
  if(record?.rules?.custo_vazio!==null&&record?.rules?.custo_vazio!==undefined)wrap.append(node('p','Custo de uso: '+record.rules.custo_vazio+' Ponto(s) do Vazio'));
  if(record?.rules?.dano!==null&&record?.rules?.dano!==undefined)wrap.append(node('p','Dano base: '+record.rules.dano));
  return wrap;
 }
 function renderFocusEditor(){
  browser.classList.add('hidden');
  const heading=node('div',null,'focus-editor');
  heading.append(node('h3','Adicionar foco à ficha'));
  heading.append(node('p','Escolha um foco do livro e sua classificação. Os valores ficam registrados na ficha após salvar; a progressão com XP continua sujeita às regras da mesa.','small'));
  const fields=node('div',null,'focus-editor-fields');
  const selectWrap=node('div'),pickLabel=node('label','Foco'),picker=node('select');
  pickLabel.htmlFor='sheet-focus-select';picker.id='sheet-focus-select';
  const placeholder=node('option','Selecione um foco');placeholder.value='';picker.append(placeholder);
  const names=new Map();
  for(const focus of focosOficiais)if(focus?.nome)names.set(normalize(focus.nome),{name:focus.nome,description:focus.descricao||''});
  for(const entry of catalog.filter(x=>x.category==='focus'))if(entry.name&&!names.has(normalize(entry.name)))names.set(normalize(entry.name),{name:entry.name,description:entry.description||''});
  for(const entry of current())if(entry.name&&!names.has(normalize(entry.name)))names.set(normalize(entry.name),{name:entry.name,description:entry.description||''});
  for(const focus of [...names.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))){
   const opt=node('option',focus.name);opt.value=focus.name;picker.append(opt);
  }
  selectWrap.append(pickLabel,picker);
  const rankWrap=node('div'),rankLabel=node('label','Classificação / nível'),rank=node('input');
  rankLabel.htmlFor='sheet-focus-level';rank.id='sheet-focus-level';rank.type='number';rank.min='1';rank.max='8';rank.step='1';rank.value='2';
  rankWrap.append(rankLabel,rank);
  const add=node('button','+ Adicionar foco');add.type='button';
  add.addEventListener('click',()=>{
   const name=picker.value,level=Number(rank.value);
   if(!name){tell('Selecione um foco da lista.',true);picker.focus();return}
   if(!Number.isInteger(level)||level<1||level>8){tell('Informe uma classificação inteira entre 1 e 8.',true);rank.focus();return}
   if(current().some(x=>normalize(x.name)===normalize(name))){tell('Este foco já está na ficha. Altere o nível dele abaixo.',true);return}
   const choice=names.get(normalize(name));
   values.focus.push({id:null,name,description:choice?.description||'',origin:'sheet',rank:level});
   onChange();render();tell('Foco adicionado. Clique em Salvar ficha para confirmar.');
  });
  fields.append(selectWrap,rankWrap,add);heading.append(fields);
  list.append(heading);
  if(!current().length)list.append(node('p','Nenhum foco adicionado.','small'));
  for(const entry of current()){
   const card=node('div',null,'focus-editor-item');
   const info=node('div',null,'focus-editor-info');
   info.append(node('strong',entry.name));
   const official=focosOficiais.find(x=>normalize(x.nome)===normalize(entry.name));
   if(official?.descricao||entry.description)info.append(node('p',official?.descricao||entry.description,'small'));
   const controls=node('div',null,'focus-editor-controls');
   const levelLabel=node('label','Nível'),level=node('input');
   level.type='number';level.min='1';level.max='8';level.step='1';level.value=entry.rank??2;
   level.setAttribute('aria-label','Classificação do foco '+entry.name);
   level.addEventListener('change',()=>{
    const next=Number(level.value);
    if(!Number.isInteger(next)||next<1||next>8){level.value=entry.rank??2;tell('Classificação deve estar entre 1 e 8.',true);return}
    entry.rank=next;entry.origin='sheet';onChange();tell('Classificação atualizada. Salve a ficha para registrar.');
   });
   const remove=node('button','Remover','secondary');remove.type='button';
   remove.setAttribute('aria-label','Remover foco '+entry.name);
   remove.addEventListener('click',()=>{values.focus=values.focus.filter(x=>x!==entry);onChange();render();tell('Foco removido. Salve a ficha para confirmar.')});
   controls.append(levelLabel,level,remove);card.append(info,controls);list.append(card);
  }
 }
 function render(){
  for(const btn of document.querySelectorAll('[data-collection]')){
   const selected=btn.dataset.collection===kind;btn.setAttribute('aria-selected',String(selected));
  }
  for(const count of document.querySelectorAll('[data-count]'))count.textContent=(values[count.dataset.count]?.length??0)+(count.dataset.count==='item'?(sheet?.gmInventory||[]).filter(x=>x&&x.quantity>0).length:0);
  $('collection-hint').textContent=categories[kind].hint;
  list.replaceChildren();
  $('collection-add').classList.toggle('hidden',kind==='focus');
  if(kind==='focus'){renderFocusEditor();return}
  const official=kind==='item'&&Array.isArray(sheet?.gmInventory)?sheet.gmInventory.filter(x=>x&&x.quantity>0):[];
  if(!current().length&&!official.length)list.append(node('p','Nada registrado nesta aba. Clique em “Adicionar do catálogo” para explorar opções.','small'));
  for(const owned of official){
    const record=catalog.find(x=>x.category==='item'&&normalize(x.name)===normalize(owned.name));
    const card=node('details',null,'collection-card');const summary=node('summary',null,'collection-summary');
    const title=node('div',null,'collection-main');title.append(node('strong',owned.name+' ×'+owned.quantity),node('span','Inventário oficial • mestre','collection-tag'));
    summary.append(title,node('span','Ver detalhes','collection-open'));card.append(summary);
    card.append(details({name:owned.name,description:record?.description||'Item adquirido ou concedido pelo mestre.'},record));
    list.append(card);
  }
  for(const entry of current()){
   const record=findRecord(entry);
   const card=node('details',null,'collection-card');
   const summary=node('summary',null,'collection-summary');
   const left=node('div',null,'collection-main');
   left.append(node('strong',entry.name));
   const meta=node('span',entry.origin==='starting'?'Inicial / já registrado':'Adicionado como referência • não adquirido','collection-tag');
   left.append(meta);
   if(kind==='focus'&&entry.rank!==null&&entry.rank!==undefined)left.append(node('span','Classificação '+entry.rank,'collection-rank'));
   summary.append(left,node('span','Ver detalhes','collection-open'));
   card.append(summary);
   const expanded=details(entry,record);
   if(kind==='focus'&&entry.origin!=='starting'){
    const label=node('label','Classificação proposta (para avaliação do mestre)');
    const number=node('input');number.type='number';number.min='1';number.max='8';number.step='1';number.value=entry.rank??2;number.className='collection-rank-input';
    number.addEventListener('change',()=>{
     const rank=Number(number.value);
     if(!Number.isInteger(rank)||rank<1||rank>8){number.value=entry.rank??2;return}
     entry.rank=rank;onChange();tell('Classificação proposta alterada. Salve a ficha para registrar.');
    });
    expanded.append(label,number);
   }
   if(entry.origin!=='starting'){
    const controls=node('div',null,'action-group');
    const remove=node('button','Remover da ficha','secondary');
    remove.type='button';remove.addEventListener('click',()=>{
     values[kind]=values[kind].filter(x=>x!==entry);onChange();render();tell('Opção removida. Clique em Salvar ficha para confirmar.');
    });
    controls.append(remove);expanded.append(controls);
   }
   card.append(expanded);list.append(card);
  }
 }
 function renderOptions(){
  options.replaceChildren();
  if(loadError){browserNotice.textContent='Não foi possível carregar o catálogo: '+loadError;return}
  const query=normalize(search.value);
  const filtered=allowed().filter(x=>(!query||normalize(x.name+' '+(x.description||'')+' '+(x.archetype||'')).includes(query))).slice(0,100);
  browserNotice.textContent=filtered.length+' resultado(s) do catálogo publicado.';
  if(!filtered.length)options.append(node('p','Nenhuma opção encontrada para esta busca.','small'));
  for(const record of filtered){
   const already=current().some(x=>x.id===record.id||normalize(x.name)===normalize(record.name));
   const card=node('div',null,'collection-choice');
   const info=node('div',null,'collection-choice-info');
   info.append(node('strong',record.name),node('p',record.description||'Sem descrição publicada.'));
   if(record.archetype)info.append(node('small','Arquétipo: '+record.archetype));
   const button=node('button',already?'Já está na ficha':'Adicionar','secondary');
   button.type='button';button.disabled=already;
   button.addEventListener('click',()=>{
    if(current().some(x=>x.id===record.id||normalize(x.name)===normalize(record.name)))return;
    values[kind].push({id:record.id,name:record.name,description:record.description||'',origin:'reference',rank:kind==='focus'?2:null});
    onChange();render();renderOptions();tell('“'+record.name+'” adicionado como referência. Salve a ficha para registrar. Não houve compra ou aquisição automática.');
   });
   card.append(info,button);options.append(card);
  }
 }
 function select(next){
  kind=next;browser.classList.add('hidden');search.value='';tell('');render();
 }
 for(const btn of document.querySelectorAll('[data-collection]'))btn.addEventListener('click',()=>select(btn.dataset.collection));
 $('collection-add').addEventListener('click',()=>{
  const wasHidden=browser.classList.contains('hidden');browser.classList.toggle('hidden',!wasHidden);
  if(wasHidden){renderOptions();search.focus();}
 });
 $('collection-close').addEventListener('click',()=>browser.classList.add('hidden'));
 search.addEventListener('input',renderOptions);
 async function load(){
  try{
   const {data,error}=await db.from('dh_catalog').select('id,category,name,archetype,description,xp_cost,coins_cost,rules,published').in('category',Object.keys(categories)).eq('published',true).order('name').limit(500);
   if(error)throw Error(error.message);
   catalog=data||[];loadError=null;
  }catch(e){loadError=e.message||String(e)}
  render();if(!browser.classList.contains('hidden'))renderOptions();
 }
 render();load();
 return {getSelection:()=>structuredClone(values),getFocuses:()=>values.focus.map(x=>({name:x.name,rank:x.rank})),reload:load};
}
