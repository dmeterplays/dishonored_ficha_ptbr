// Ficha legada: catálogo do Supabase com seleção persistida localmente e no JSON exportado.
// A conta autenticada é necessária para ler o catálogo publicado (RLS).
import {db} from './personagens-common.js';
const $=id=>document.getElementById(id);
const kinds=['focus','power','talent'];
const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
const create=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=String(text);if(cls)e.className=cls;return e};
const selections=()=>window.legacyCatalogSelections||{};
const status=(message,error=false)=>{const n=$('legacy-catalog-status');n.textContent=message;n.classList.toggle('error',error)};
let catalog=[],available=false;
function changed(){
 // Usa o mesmo autosave do formulário antigo, sem mudar a chave do navegador.
 document.dispatchEvent(new Event('input',{bubbles:true}));
}
function listFor(kind){
 const data=selections();
 if(!Array.isArray(data[kind]))data[kind]=[];
 return data[kind];
}
function render(){
 for(const kind of kinds){
  const items=listFor(kind),root=$('legacy-list-'+kind);root.replaceChildren();
  $('legacy-count-'+kind).textContent=items.length;
  if(!items.length){root.append(create('p','Nenhum '+(kind==='focus'?'foco':kind==='power'?'poder':'talento')+' adicionado.','legacy-catalog-empty'));continue}
  for(const item of items){
   const row=create('div',null,'legacy-owned-row'),info=create('div',null,'legacy-owned-info');
   const name=String(item.name||'Sem nome');
   info.append(create('strong',name));
   const record=catalog.find(x=>x.category===kind&&(x.id===item.id||normalize(x.name)===normalize(name)));
   if(record?.description||item.description)info.append(create('small',record?.description||item.description));
   row.append(info);
   if(kind==='focus'){
    const field=create('div',null,'legacy-owned-rank'),label=create('label','Nível'),rank=create('input');
    rank.type='number';rank.min='1';rank.max='8';rank.step='1';rank.value=item.rank??2;
    rank.setAttribute('aria-label','Nível do foco '+name);field.append(label,rank);
    rank.addEventListener('change',()=>{
     const level=Number(rank.value);
     if(!Number.isInteger(level)||level<1||level>8){rank.value=item.rank??2;status('O nível do foco precisa ser um número de 1 a 8.',true);return}
     item.rank=level;item.origin='sheet';changed();status('Nível de '+name+' atualizado e salvo neste navegador.');
    });
    row.append(field);
   }
   const remove=create('button','Remover','legacy-owned-remove');remove.type='button';
   remove.setAttribute('aria-label','Remover '+name);
   remove.addEventListener('click',()=>{
    const array=listFor(kind),index=array.indexOf(item);
    if(index>=0)array.splice(index,1);
    changed();render();status(name+' removido. Salvo neste navegador.');
   });
   row.append(remove);root.append(row);
  }
 }
}
function choices(){
 for(const kind of kinds){
  const picker=$('legacy-pick-'+kind);
  const selected=picker.value;
  picker.replaceChildren();
  const placeholder=create('option','Selecione '+(kind==='focus'?'um foco':kind==='power'?'um poder':'um talento'));placeholder.value='';
  picker.append(placeholder);
  const entries=catalog.filter(x=>x.category===kind);
  for(const record of entries){
   const opt=create('option',record.name);opt.value=record.id;
   if(record.description)opt.title=record.description;
   picker.append(opt);
  }
  if([...picker.options].some(x=>x.value===selected))picker.value=selected;
  picker.disabled=!available||!entries.length;
  $('legacy-add-'+kind).disabled=!available||!entries.length;
 }
}
for(const kind of kinds){
 $('legacy-add-'+kind).addEventListener('click',()=>{
  if(!available){status('Entre na sua conta para carregar o catálogo do sistema.',true);return}
  const selected=$('legacy-pick-'+kind).value,record=catalog.find(x=>x.id===selected&&x.category===kind);
  if(!record){status('Escolha uma opção do catálogo.',true);return}
  if(listFor(kind).some(x=>x.id===record.id||normalize(x.name)===normalize(record.name))){
   status('“'+record.name+'” já está na ficha. Você pode editar o nível, se for um foco.',true);return;
  }
  let rank=null;
  if(kind==='focus'){
   rank=Number($('legacy-rank-focus').value);
   if(!Number.isInteger(rank)||rank<1||rank>8){status('Informe um nível inteiro entre 1 e 8.',true);return}
  }
  listFor(kind).push({id:record.id,name:record.name,description:record.description||'',
   origin:kind==='focus'?'sheet':'reference',rank});
  changed();render();status('“'+record.name+'” adicionado à ficha. Salvo neste navegador e incluído na exportação JSON.');
 });
}
document.addEventListener('legacy-sheet-loaded',render);
render();
async function load(){
 try{
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user){
   status('Faça login em Minha conta para selecionar Focos, Poderes e Talentos do catálogo. As anotações antigas continuam acessíveis.');
   const link=create('a','Entrar na conta');link.href='campanha.html';link.style.marginLeft='10px';$('legacy-catalog-status').append(' ',link);
   choices();return;
  }
  const {data,error}=await db.from('dh_catalog')
   .select('id,category,name,description,published')
   .in('category',kinds).eq('published',true).order('name').limit(500);
  if(error)throw Error(error.message);
  catalog=data||[];available=true;choices();render();
  status('Catálogo conectado: '+catalog.filter(x=>x.category==='focus').length+' focos, '+
   catalog.filter(x=>x.category==='power').length+' poderes e '+
   catalog.filter(x=>x.category==='talent').length+' talentos disponíveis. Adicionar aqui não gasta XP nem compra habilidades automaticamente.');
 }catch(error){available=false;choices();status('Não foi possível consultar o catálogo do banco: '+error.message,true)}
}
load();
