import {db,getAuth} from './personagens-common.js';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),npcId=params.get('id'),roomId=params.get('room');
const sections={povo_comum:'O Povo Comum',nobreza:'A Nobreza',selvagens:'O Selvagem',notorios:'O Notório'};
const tiers={incidental:'Incidental',menor:'Menor',notavel:'Notável',principal:'Principal'};
const el=(tag,text,klass)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(klass)n.className=klass;return n};
const set=(id,value)=>$(id).textContent=value||'Não informado nesta ficha.';
function abilities(id,values){const root=$(id);root.replaceChildren();for(const x of values||[]){const div=el('div',null,'npc-ability');div.append(el('h3',x.label+' — '+x.value));root.append(div)}}
function actions(value){const root=$('npc-attacks');root.replaceChildren();const entries=String(value||'').split(';').map(v=>v.trim()).filter(Boolean);if(!entries.length)root.append(el('p','Nenhuma ação específica registrada.'));else for(const a of entries){const row=el('div',null,'npc-ability');row.append(el('p',a));root.append(row)}}
const valid=x=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x||'');
try{
 const user=await getAuth();
 if(!valid(npcId))throw Error('Ficha de inimigo inválida.');
 if(roomId){
  if(!valid(roomId))throw Error('Sala inválida.');
  const {data,error}=await db.from('dh_rooms').select('owner_id').eq('id',roomId).single();
  if(error||data?.owner_id!==user.id)throw Error('Esta ficha exige permissão de mestre da campanha.');
  $('back-bestiary').href='bestiario.html?room='+encodeURIComponent(roomId);
  $('back-table').href='mesa.html?id='+encodeURIComponent(roomId);
  $('back-table').textContent='Voltar à mesa';
  $('return-to-bestiary').href=$('back-bestiary').href;
  $('add-to-table').classList.remove('hidden');
 }
 const {data,error}=await db.from('dh_npc_templates').select('id,name,section,tier,description,book_page,sheet').eq('id',npcId).single();
 if(error||!data)throw Error('NPC não encontrado ou acesso não autorizado.');
 const sh=data.sheet||{};
 $('npc-name').textContent=data.name;
 $('npc-portrait').textContent=data.name.slice(0,1).toUpperCase();
 set('npc-section',sections[data.section]||data.section);set('npc-tier','NPC '+(tiers[data.tier]||data.tier));
 set('npc-page','Livro · p. '+(data.book_page??'—'));
 $('npc-subtitle').textContent=data.name;
 set('npc-description',data.description);
 $('npc-stress').textContent=sh.defeated_on_success?'Sem trilha':String(sh.stressMax??'—');
 $('npc-void').textContent=String(sh.void??0);
 $('npc-importance').textContent=tiers[data.tier]||data.tier;
 set('npc-truth',[sh.verdade1,sh.verdade2].filter(Boolean).join(' · '));
 set('npc-background',sh.background||data.description);
 abilities('npc-skills',sh.skills);abilities('npc-styles',sh.styles);
 set('npc-focus',sh.focos||sh.notas?.['nota-focos']);
 set('npc-items',sh.notas?.['nota-pertences']);
 actions(sh.ataques);
 set('npc-powers',sh.notas?.['nota-poderes']);
 set('npc-special',sh.regrasEspeciais);
 $('npc-sheet').classList.remove('hidden');
 $('npc-status').textContent='';
 $('add-to-table').addEventListener('click',async()=>{
  const button=$('add-to-table');button.disabled=true;
  const {data:enemy,error:spawnError}=await db.rpc('dh_room_enemy_create',{p_room:roomId,p_template:npcId});
  if(spawnError){$('npc-status').textContent=spawnError.message;button.disabled=false;return}
  location.href='mesa.html?id='+encodeURIComponent(roomId)+'&enemy='+encodeURIComponent(enemy);
 });
}catch(e){$('npc-status').textContent=e.message;$('npc-status').className='error'}
