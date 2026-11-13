import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';
import {UPGRADES,optionsFor,GAME_LABELS,conflictingMasterwork} from './equipment-upgrades.js?v=wiki3';
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const el=id=>document.getElementById(id);
let chars=[],items=[],catalog=[],selected=null,uid=null;
const say=(s,bad=false)=>{el('grant-status').textContent=s;el('grant-status').style.color=bad?'#f0a69b':'#a5dbc7'};
function option(value,label){const x=document.createElement('option');x.value=value;x.textContent=label;return x}
function text(tag,s){const x=document.createElement(tag);x.textContent=s;return x}
async function load(){
 const {data:{user}}=await db.auth.getUser();if(!user){say('Entre na conta de administrador.',true);return}
 const {data:p}=await db.from('dh_profiles').select('role').eq('id',user.id).single();if(p?.role!=='admin'){say('Acesso restrito.',true);return}
 uid=user.id;
 const [{data:ch,error:ce},{data:cat,error:ca}]=await Promise.all([db.from('dh_characters').select('id,name,owner_id,archetype').order('name').limit(1000),db.from('dh_catalog').select('id,name,description').eq('category','item').order('name').limit(1000)]);
 if(ce||ca){say('Falha ao carregar: '+(ce||ca).message,true);return}
 chars=ch||[];catalog=cat||[];const s=el('grant-character');s.replaceChildren(option('','Selecione um personagem'));
 chars.forEach(c=>s.append(option(c.id,c.name+' — '+(c.archetype||'Sem arquétipo'))));
 const cs=el('grant-catalog');cs.replaceChildren(option('','Selecione um item do catálogo'));catalog.forEach(c=>cs.append(option(c.id,c.name)));
 say('Selecione um personagem para entregar e melhorar seus equipamentos.');
 if(new URLSearchParams(location.search).has('character'))s.value=new URLSearchParams(location.search).get('character');
 if(s.value)await selectCharacter();
}
async function selectCharacter(){
 selected=el('grant-character').value;items=[];await refreshItems()
}
async function refreshItems(){
 const target=el('granted-items');target.replaceChildren();
 if(!selected){target.append(text('p','Escolha um personagem.'));return}
 const {data,error}=await db.from('dh_character_items').select('id,character_id,catalog_id,name,description,quantity,upgrades,created_at').eq('character_id',selected).order('created_at',{ascending:false});
 if(error){say(error.message,true);return}
 items=data||[];
 if(!items.length)target.append(text('p','Ainda não há itens entregues pelo mestre.'));
 for(const item of items){
  const card=document.createElement('details');card.className='granted-card';
  const summary=document.createElement('summary');summary.textContent=item.name+' ×'+item.quantity+' · '+(item.upgrades?.length||0)+' melhoria(s)';card.append(summary);
  card.append(text('p',item.description||'Sem descrição.'));
  const installed=new Set((item.upgrades||[]).map(v=>typeof v==='string'?v:v.id));
  const upgrades=optionsFor(item.name).sort((a,b)=>['D2','D1','DLC','DOTO'].indexOf(a.game)-['D2','D1','DLC','DOTO'].indexOf(b.game));
  const legacyInstalled=UPGRADES.filter(u=>u.legacy&&installed.has(u.id));
  const openBefore=window.__expandedEquipment===item.id; if(openBefore)card.open=true;
  const box=document.createElement('div');box.className='upgrade-options';
  card.addEventListener('toggle',()=>{if(card.open)window.__expandedEquipment=item.id;else if(window.__expandedEquipment===item.id)window.__expandedEquipment=null});
  if(!upgrades.length)box.append(text('p','Sem melhorias predefinidas para este equipamento. Itens personalizados permanecem disponíveis para uso narrativo.'));
  for(const u of legacyInstalled){box.append(text('p','Melhoria anterior preservada: '+u.name+' — '+u.effect))}
  for(const u of upgrades){
   const line=document.createElement('label');line.className='upgrade-choice';
   const input=document.createElement('input');input.type='checkbox';input.checked=installed.has(u.id);
   const met=document.createElement('span');
   met.append(text('strong',u.name+' · '+u.cost+' moedas · '+(GAME_LABELS[u.game]||u.game)));
   met.append(text('small',u.effect));
   if(u.requires.length)met.append(text('small','Pré-requisito: '+u.requires.map(id=>UPGRADES.find(v=>v.id===id)?.name||id).join(', ')));
   if(u.blueprint)met.append(text('small','Projeto do videogame: '+u.blueprint));
   input.addEventListener('change',async()=>{
    const next=new Set(installed);
    if(input.checked){
     if(conflictingMasterwork(u.id,next)){
      say('Essas duas obras-primas são alternativas exclusivas. Remova a anterior.',true);input.checked=false;return;
     }
     if(u.requires.some(id=>!next.has(id))){say('Adicione primeiro os pré-requisitos de '+u.name+'.',true);input.checked=false;return}
     next.add(u.id);
    }else{
     if(upgrades.some(v=>next.has(v.id)&&v.requires.includes(u.id))){say('Remova antes as melhorias dependentes.',true);input.checked=true;return}
     next.delete(u.id);
    }
    input.disabled=true;
    const {error}=await db.from('dh_character_items').update({upgrades:[...next],updated_at:new Date().toISOString()}).eq('id',item.id);
    input.disabled=false;
    if(error){say('Não foi possível aplicar: '+error.message,true);input.checked=!input.checked;return}
    say('Melhorias de '+item.name+' atualizadas.');await refreshItems();
   });
   line.append(input,met);box.append(line);
  }
  card.append(text('h4','Melhorias do equipamento'));card.append(box);
  const remove=document.createElement('button');remove.type='button';remove.textContent='Retirar item';remove.className='secondary';
  remove.addEventListener('click',async()=>{if(!confirm('Retirar '+item.name+' deste personagem?'))return;const {error}=await db.from('dh_character_items').delete().eq('id',item.id);if(error)say(error.message,true);else{say('Item retirado.');await refreshItems()}});
  card.append(remove);target.append(card);
 }
}
el('grant-character').addEventListener('change',selectCharacter);
el('grant-mode').addEventListener('change',()=>{
 const custom=el('grant-mode').value==='custom';el('grant-catalog-wrap').hidden=custom;el('grant-custom-wrap').hidden=!custom;
});
el('grant-send').addEventListener('click',async()=>{
 if(!selected)return say('Selecione um personagem.',true);
 const custom=el('grant-mode').value==='custom';const cat=custom?null:catalog.find(c=>c.id===el('grant-catalog').value);
 const name=custom?el('grant-name').value.trim():cat?.name;
 if(!name||name.length>160)return say('Informe um item válido (até 160 caracteres).',true);
 const quantity=Number(el('grant-qty').value);
 if(!Number.isInteger(quantity)||quantity<1||quantity>10000)return say('Quantidade inválida.',true);
 const description=custom?el('grant-description').value.trim():cat.description||'';
 if(description.length>3000)return say('Descrição muito longa.',true);
 el('grant-send').disabled=true;
 const {error}=await db.from('dh_character_items').insert({character_id:selected,catalog_id:cat?.id||null,name,description,quantity,granted_by:uid});
 el('grant-send').disabled=false;
 if(error)return say(error.message,true);
 say(name+' entregue ao personagem.');el('grant-name').value='';el('grant-description').value='';await refreshItems();
});
el('grant-refresh').addEventListener('click',load);
load();
