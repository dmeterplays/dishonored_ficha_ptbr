import {db,getAuth} from './personagens-common.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),roomId=params.get('room');
const sections={povo_comum:'O Povo Comum',nobreza:'A Nobreza',selvagens:'O Selvagem',notorios:'O Notório'};
const tiers={menor:'NPC menor',notavel:'NPC notável',principal:'NPC principal'};
const create=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;return e};
let catalog=[],me,room;
const notice=(text,bad=false)=>{$('permission-message').textContent=text;$('permission-message').className=bad?'error':'status'};
function render(){
 const root=$('bestiary-list');root.replaceChildren();
 const query=$('bestiary-search').value.trim().toLocaleLowerCase('pt-BR'),section=$('bestiary-section').value,tier=$('bestiary-tier').value;
 let total=0;
 for(const [sectionId,title] of Object.entries(sections)){
  if(section&&section!==sectionId)continue;
  const matches=catalog.filter(t=>t.section===sectionId&&(!tier||t.tier===tier)&&(!query||(t.name+' '+t.description).toLocaleLowerCase('pt-BR').includes(query)));
  if(!matches.length)continue;
  root.append(create('h2',title,'bestiary-group'));const grid=create('div',null,'bestiary-grid');
  for(const t of matches){
   total++;
   const card=create('article',null,'bestiary-card');
   card.append(create('span',tiers[t.tier]+' · Livro p. '+t.book_page,'tag'),create('h3',t.name),create('p',t.description));
   const details=create('details'),sum=create('summary','Ver atributos e ficha de referência');details.append(sum);
   const stats=t.sheet?.skills||[],styles=t.sheet?.styles||[];
   const content=create('div');
   content.append(create('p','Perícias: '+stats.map(x=>x.label+' '+x.value).join(' · ')),create('p','Estilos: '+styles.map(x=>x.label+' '+x.value).join(' · ')),create('p',t.sheet?.defeated_on_success?'NPC menor: sem trilha de estresse; derrotado por ataque bem-sucedido.':'Trilha de estresse: '+(t.sheet?.stressMax??'Conforme o livro')));
   details.append(content);card.append(details);
   if(room){
    const add=create('button','Adicionar à mesa','secondary');add.type='button';
    add.addEventListener('click',async()=>{
     add.disabled=true;const {data,error}=await db.rpc('dh_room_enemy_create',{p_room:roomId,p_template:t.id});
     if(error){$('custom-status').textContent=error.message;$('custom-status').className='error';add.disabled=false;return}
     location.href='mesa.html?id='+encodeURIComponent(roomId)+'&enemy='+encodeURIComponent(data);
    });
    card.append(add);
   }
   grid.append(card);
  }
  root.append(grid);
 }
 $('bestiary-count').textContent=total+' modelo(s) do livro';
 if(!total)root.append(create('p','Nenhum NPC encontrado com esses filtros.'));
}
for(const key of ['bestiary-search','bestiary-section','bestiary-tier'])$(key).addEventListener(key==='bestiary-search'?'input':'change',render);
$('custom-form').addEventListener('submit',async event=>{
 event.preventDefault();
 if(!room)return $('custom-status').textContent='Abra o bestiário de dentro de uma mesa para criar inimigos.';
 const btn=$('create-custom');btn.disabled=true;
 const payload={p_room:roomId,p_name:$('custom-name').value.trim(),p_section:$('custom-section-value').value,p_tier:$('custom-tier').value};
 const {data,error}=await db.rpc('dh_room_enemy_create',payload);
 if(error){$('custom-status').textContent=error.message;$('custom-status').className='error';btn.disabled=false;return}
 location.href='mesa.html?id='+encodeURIComponent(roomId)+'&enemy='+encodeURIComponent(data);
});
try{
 me=await getAuth();
 if(roomId){
  const {data,error}=await db.from('dh_rooms').select('owner_id,name').eq('id',roomId).single();
  if(error||!data||data.owner_id!==me.id)throw Error('Somente o mestre da sala pode adicionar inimigos ao bestiário da campanha.');
  room=data;$('table-link').href='mesa.html?id='+encodeURIComponent(roomId);
 }else $('custom-section').classList.add('hidden');
 const {data,error}=await db.from('dh_npc_templates').select('id,name,section,tier,description,book_page,sheet').order('book_page').order('name').limit(250);
 if(error)throw Error(error.message);catalog=data||[];
 $('bestiary-workspace').classList.remove('hidden');
 notice(room?'Bestiário disponível para a campanha “'+room.name+'”.':'Bestiário do sistema. Abra pela mesa para adicionar inimigos.');
 render();
}catch(e){notice(e.message,true)}
