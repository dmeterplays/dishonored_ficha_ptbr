import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';
import {UPGRADES,GAME_LABELS,UPGRADE_GROUPS} from './equipment-upgrades.js?v=wiki4';
import {mergedUpgrade} from './upgrade-config.js?v=4';
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
let configs=[], catalogItems=[],renderLimit=130;
const node=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x};
const filtered=()=>UPGRADES.filter(u=>!u.legacy&&!u.hidden&&(!$('upgrade-game').value||u.game===$('upgrade-game').value)&&(!$('upgrade-group').value||u.type===$('upgrade-group').value)&&[u.name,u.effect,GAME_LABELS[u.game]||''].join(' ').toLocaleLowerCase('pt-BR').includes($('upgrade-search').value.toLocaleLowerCase('pt-BR').trim()));
function field(parent,label,type,value){
 const wrap=node('label');wrap.textContent=label;const input=node(type==='textarea'?'textarea':'input');
 if(type!=='textarea')input.type=type;input.value=value??'';
 wrap.append(input);parent.append(wrap);return input;
}
function render(){
 const root=$('upgrade-catalog-list');root.replaceChildren();const all=filtered().slice(0,renderLimit);
 $('upgrade-count').textContent=all.length+' melhoria(s) exibida(s)';
 if(!all.length){root.append(node('p','Nenhuma melhoria encontrada.'));return}
 for(const u of all){
  const effective=mergedUpgrade(u.id,configs);
  const card=node('article');card.className='upgrade-catalog-card';
  const title=node('h3',effective.name);card.append(title);
  const meta=node('div');meta.className='upgrade-catalog-meta';
  meta.append(node('span',(GAME_LABELS[u.game]||u.game)+' · '+(UPGRADE_GROUPS[u.type]||u.type)),node('span',effective.cost+' moedas'));
  card.append(meta,node('p',effective.effect));
  if(effective.rule_note)card.append(node('p','Regra 2d20: '+effective.rule_note));
  if(effective.capacity_bonus)card.append(node('p','Capacidade adicional enquanto ativa: +'+effective.capacity_bonus));
  if((effective.bonus_skill||effective.bonus_style)&&effective.bonus_value)card.append(node('p','Bônus em teste de '+(effective.bonus_skill||'qualquer perícia')+' + '+(effective.bonus_style||'qualquer estilo')+': '+(effective.bonus_value>0?'+':'')+effective.bonus_value+' ao alvo 2d20'));
  if(u.requires?.length)card.append(node('p','Requer: '+u.requires.map(id=>UPGRADES.find(x=>x.id===id)?.name||id).join(', ')));
  if(u.blueprint)card.append(node('small','Projeto do jogo: '+u.blueprint));
  const editor=node('details');editor.className='upgrade-editor';
  editor.append(node('summary','Editar melhoria e equipamentos compatíveis'));
  const form=node('div');form.className='upgrade-editor-fields';
  const name=field(form,'Nome', 'text',effective.name);name.maxLength=160;
  const effect=field(form,'Descrição do efeito','textarea',effective.effect);effect.maxLength=3000;
  const price=field(form,'Custo de referência em moedas','number',effective.cost);price.min=0;price.max=1000000;
  const capacity=field(form,'Bônus de capacidade (somado quando ativa)','number',effective.capacity_bonus);capacity.min=0;capacity.max=100;
  const skillLabel=node('label','Perícia beneficiada pelo bônus');const skill=node('select');
  for(const [value,label] of [['','Todas as perícias'],...['Lutar','Mover','Estudar','Sobreviver','Falar','Consertar'].map(x=>[x,x])]){const op=node('option',label);op.value=value;skill.append(op)}
  skill.value=effective.bonus_skill||'';skillLabel.append(skill);form.append(skillLabel);
  const styleLabel=node('label','Estilo beneficiado (ex.: Silenciosamente para Furtividade)');const style=node('select');
  for(const [value,label] of [['','Todos os estilos'],...['Ousadamente','Cuidadosamente','Habilmente','Forçosamente','Silenciosamente','Rapidamente'].map(x=>[x,x])]){const op=node('option',label);op.value=value;style.append(op)}
  style.value=effective.bonus_style||'';styleLabel.append(style);form.append(styleLabel);
  const bonus=field(form,'Bônus de teste 2d20 (-5 a +5 no alvo)','number',effective.bonus_value||0);bonus.min=-5;bonus.max=5;
  const rule=field(form,'Regra personalizada para a mesa (texto livre)','textarea',effective.rule_note);rule.maxLength=3000;
  const enabledLabel=node('label','Melhoria habilitada');const enabled=node('input');enabled.type='checkbox';enabled.checked=effective.enabled;enabledLabel.append(enabled);form.append(enabledLabel);
  const link=node('details');link.className='upgrade-link-list';
  link.append(node('summary','Vincular a itens específicos do catálogo (opcional)'));
  const natural=node('label');const auto=node('input');auto.type='checkbox';auto.checked=effective.item_ids===null;natural.append(auto,node('span','Usar compatibilidade automática por tipo de equipamento'));link.append(natural);
  const choices=node('div');choices.className='upgrade-link-choices';
  const selected=new Set(effective.item_ids||[]);
  for(const item of catalogItems){const lab=node('label');const check=node('input');check.type='checkbox';check.value=item.id;check.checked=selected.has(item.id);
   lab.append(check,node('span',item.name));choices.append(lab)}
  link.append(choices);
  function sync(){choices.hidden=auto.checked}auto.addEventListener('change',sync);sync();form.append(link);
  const save=node('button','Salvar melhoria');save.type='button';const status=node('p');status.setAttribute('role','status');
  save.addEventListener('click',async()=>{
   const val={upgrade_id:u.id,name:name.value.trim(),effect:effect.value.trim(),price:Number(price.value),capacity_bonus:Number(capacity.value),rule_note:rule.value.trim(),bonus_skill:skill.value,bonus_style:style.value,bonus_value:Number(bonus.value),enabled:enabled.checked,item_ids:auto.checked?null:[...choices.querySelectorAll('input:checked')].map(x=>x.value),updated_at:new Date().toISOString()};
   if(!val.name||val.name.length>160||val.effect.length>3000||val.rule_note.length>3000||val.bonus_skill.length>100||!Number.isSafeInteger(val.bonus_value)||val.bonus_value< -5||val.bonus_value>5||(!val.bonus_skill&&!val.bonus_style&&val.bonus_value!==0)||!Number.isSafeInteger(val.price)||val.price<0||val.price>1000000||!Number.isSafeInteger(val.capacity_bonus)||val.capacity_bonus<0||val.capacity_bonus>100){status.textContent='Confira os valores e limites.';return}
   save.disabled=true;const {data,error}=await db.from('dh_upgrade_config').upsert(val,{onConflict:'upgrade_id'}).select('*').single();save.disabled=false;
   if(error){status.textContent='Erro: '+error.message;return}
   const old=configs.findIndex(x=>x.upgrade_id===u.id);if(old>=0)configs[old]=data;else configs.push(data);
   status.textContent='Melhoria salva no Supabase.';title.textContent=data.name;const ps=card.querySelectorAll(':scope > p');if(ps[0])ps[0].textContent=data.effect;
  });
  const reset=node('button','Restaurar padrão da wiki');reset.type='button';reset.className='secondary';
  reset.addEventListener('click',async()=>{
   if(!confirm('Restaurar os valores originais desta melhoria?'))return;
   const {error}=await db.from('dh_upgrade_config').delete().eq('upgrade_id',u.id);
   if(error){status.textContent=error.message;return}
   configs=configs.filter(x=>x.upgrade_id!==u.id);render();
  });
  form.append(save,reset,status);editor.append(form);card.append(editor);root.append(card);
 }
}
async function init(){
 for(const [v,label] of Object.entries(GAME_LABELS)){if(v==='Casa')continue;const o=node('option',label);o.value=v;$('upgrade-game').append(o)}
 for(const [v,label] of Object.entries(UPGRADE_GROUPS)){const o=node('option',label);o.value=v;$('upgrade-group').append(o)}
 ['upgrade-game','upgrade-group','upgrade-search'].forEach(id=>$(id).addEventListener(id==='upgrade-search'?'input':'change',render));
 $('upgrade-clear').addEventListener('click',()=>{$('upgrade-game').value='';$('upgrade-group').value='';$('upgrade-search').value='';render()});
 const [{data:c,error:ce},{data:items,error:ie}]=await Promise.all([
 db.from('dh_upgrade_config').select('*').limit(1000),
 db.from('dh_catalog').select('id,name').eq('category','item').order('name').limit(1000)]);
 if(ce||ie){$('upgrade-count').textContent='Erro ao carregar: '+(ce||ie).message;return}
 configs=c||[];catalogItems=items||[];render();
}
init();
