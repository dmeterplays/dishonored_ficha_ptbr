import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';
import {UPGRADES} from './equipment-upgrades.js?v=wiki3';
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const root=document.getElementById('master-inventory-list');
const status=document.getElementById('master-inventory-status');
const id=new URLSearchParams(location.search).get('id');
const node=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e};
async function load(){
 if(!id)return;
 const {data:{user},error:ue}=await db.auth.getUser();
 if(!user||ue){status.textContent='Faça login para consultar os itens recebidos.';return}
 const {data,error}=await db.from('dh_character_items').select('name,description,quantity,upgrades').eq('character_id',id).order('created_at',{ascending:false});
 if(error){status.textContent='Não foi possível carregar os itens: '+error.message;return}
 root.replaceChildren();
 if(!data?.length){status.textContent='Nenhum item entregue pelo mestre até agora.';return}
 status.textContent=data.length+' tipo(s) de equipamento recebido(s).';
 for(const item of data){
  const card=node('details','');card.className='master-inventory-card';
  card.append(node('summary',item.name+' ×'+item.quantity));
  if(item.description)card.append(node('p',item.description));
  const assigned=(item.upgrades||[]).map(id=>typeof id==='string'?UPGRADES.find(u=>u.id===id):null).filter(Boolean);
  if(assigned.length){
   card.append(node('h4','Melhorias instaladas'));
   for(const u of assigned){const row=node('p',u.name+' — '+u.effect);card.append(row)}
  }else card.append(node('p','Sem melhorias instaladas.'));
  root.append(card);
 }
}
load();
