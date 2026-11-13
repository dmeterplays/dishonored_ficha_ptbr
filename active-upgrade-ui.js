import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';
import {UPGRADES} from './equipment-upgrades.js?v=wiki4';
import {mergedUpgrade,compatibleUpgrade,installedUpgradeIds,activeUpgradeEffects} from './upgrade-config.js?v=4';
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const el=(tag,value)=>{const x=document.createElement(tag);if(value!==undefined)x.textContent=value;return x};
let lastKey='',busy=false;
export async function renderOwnedGear(container,characterId){
 if(!container)return;
 if(!characterId){container.replaceChildren(el('p','Associe um personagem à mesa para consultar seus equipamentos.'));return}
 if(busy&&lastKey===characterId)return;busy=true;lastKey=characterId;
 const notice=el('p','Consultando equipamentos e melhorias...');container.replaceChildren(notice);
 const [{data:items,error:ie},{data:config,error:ce}]=await Promise.all([
  db.from('dh_character_items').select('id,catalog_id,name,description,quantity,upgrades').eq('character_id',characterId).order('created_at',{ascending:false}),
  db.from('dh_upgrade_config').select('*')
 ]);
 if(ie||ce){notice.textContent='Falha ao carregar inventário: '+(ie||ce).message;busy=false;return}
 const ids=(items||[]).map(x=>x.id);
 const {data:active,error:ae}=ids.length?await db.from('dh_item_upgrade_active').select('item_id,upgrade_id,active').in('item_id',ids):{data:[],error:null};
 if(ae){notice.textContent=ae.message;busy=false;return}
 container.replaceChildren();
 const title=el('div');title.className='gear-header';
 const refresh=el('button','Atualizar inventário');refresh.type='button';refresh.className='secondary';refresh.addEventListener('click',()=>renderOwnedGear(container,characterId));
 title.append(refresh);container.append(title);
 if(!items?.length)container.append(el('p','Nenhum equipamento concedido pelo mestre.'));
 for(const item of items||[]){
  const details=el('details');details.className='gear-item';
  details.append(el('summary',item.name+' ×'+item.quantity));
  if(item.description)details.append(el('p',item.description));
  const installed=installedUpgradeIds(item);
  if(!installed.length){details.append(el('p','Nenhuma melhoria instalada pelo mestre.'));container.append(details);continue}
  const effective=activeUpgradeEffects(item,active||[],config||[]);
  const summary=el('p','Melhorias ativas: '+effective.upgrades.length+' · Bônus de capacidade: +'+effective.capacityBonus);
  summary.className='gear-effect-total';details.append(summary);
  for(const b of effective.testBonuses){details.append(el('p','Bônus de ação: '+(b.value>0?'+':'')+b.value+' em '+(b.skill||'qualquer perícia')+' + '+(b.style||'qualquer estilo')+' ('+b.name+')'))}
  const installedIds=new Set(installed);
  for(const id of installed){
   const upgrade=mergedUpgrade(id,config||[]);if(!upgrade)continue;
   const compatible=compatibleUpgrade(item,upgrade);
   const selected=!!active?.find(x=>x.item_id===item.id&&x.upgrade_id===id&&x.active);
   const line=el('label');line.className='gear-upgrade-choice';
   const checkbox=el('input');checkbox.type='checkbox';checkbox.checked=selected;checkbox.disabled=!compatible;
   const info=el('span');info.append(el('strong',upgrade.name),el('small',upgrade.effect));
   if(upgrade.capacity_bonus)info.append(el('small','Capacidade extra quando ativa: +'+upgrade.capacity_bonus));
   if(upgrade.rule_note)info.append(el('small','Regra da mesa: '+upgrade.rule_note));
   if(upgrade.bonus_value&&(upgrade.bonus_skill||upgrade.bonus_style))info.append(el('small','Bônus automático: '+(upgrade.bonus_value>0?'+':'')+upgrade.bonus_value+' ao alvo do teste '+(upgrade.bonus_skill||'qualquer perícia')+' + '+(upgrade.bonus_style||'qualquer estilo')));
   if(!compatible)info.append(el('small','Melhoria desabilitada ou incompatível com o equipamento atual.'));
   checkbox.addEventListener('change',async()=>{
    const enable=checkbox.checked;
    if(enable&&upgrade.requires?.some(id=>!installedIds.has(id)||!active?.some(r=>r.item_id===item.id&&r.upgrade_id===id&&r.active))){
     checkbox.checked=false;alert('Ative primeiro as melhorias pré-requisito.');return;
    }
    if(!enable && installed.some(other=>other!==id&&active?.some(r=>r.item_id===item.id&&r.upgrade_id===other&&r.active)&&UPGRADES.find(u=>u.id===other)?.requires?.includes(id))){
     checkbox.checked=true;alert('Desative as melhorias dependentes antes.');return;
    }
    checkbox.disabled=true;
    const {error}=await db.from('dh_item_upgrade_active').upsert({item_id:item.id,upgrade_id:id,active:enable,updated_at:new Date().toISOString()},{onConflict:'item_id,upgrade_id'});
    checkbox.disabled=false;
    if(error){checkbox.checked=!enable;alert('Não foi possível alterar melhoria: '+error.message);return}
    await renderOwnedGear(container,characterId);
    const reopened=[...container.querySelectorAll('.gear-item')].find(x=>x.querySelector('summary')?.textContent===item.name+' ×'+item.quantity);if(reopened)reopened.open=true;
   });
   line.append(checkbox,info);details.append(line);
  }
  container.append(details);
 }
 busy=false;
}
