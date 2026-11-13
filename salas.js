import {db,getAuth} from './personagens-common.js';
const $=id=>document.getElementById(id);let me,role='player',roomList=[];
function msg(id,text,bad=false){$(id).textContent=text;$(id).className=bad?'error':'status'}
async function showRooms(){
 const {data,error}=await db.from('dh_rooms').select('id,code,name,shop_open,active,created_at').order('created_at',{ascending:false});
 const root=$('rooms');root.replaceChildren();
 if(error){msg('rooms-message',error.message,true);return}
 roomList=data||[];
 if(!roomList.length){const p=document.createElement('p');p.textContent='Você ainda não participa de nenhuma campanha.';root.append(p);return}
 for(const room of roomList){
  const row=document.createElement('div');row.className='room-entry';
  const info=document.createElement('div');
  const title=document.createElement('strong');title.textContent=room.name;
  const hint=document.createElement('span');hint.textContent='Código: '+room.code+' · '+(room.shop_open?'Loja aberta':'Loja fechada');
  info.append(title,hint);
  const a=document.createElement('a');a.className='btn';a.href='mesa.html?id='+encodeURIComponent(room.id);a.textContent='Abrir mesa';
  const actions=document.createElement('div');actions.className='room-entry-actions';
  const journal=document.createElement('a');journal.className='btn secondary';journal.href='diario.html?room='+encodeURIComponent(room.id);journal.textContent='Diário de Bordo';
  actions.append(a,journal);row.append(info,actions);root.append(row);
 }
}
$('join-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const code=$('code').value.trim(),character=$('character').value;
 if(!character){msg('join-message','Selecione uma ficha pronta.',true);return}
 const btn=event.target.querySelector('button[type=submit]');btn.disabled=true;
 try{const {data,error}=await db.rpc('dh_join_room',{p_code:code,p_character:character});if(error)throw Error(error.message);
  location.href='mesa.html?id='+encodeURIComponent(data);
 }catch(e){msg('join-message','Não foi possível entrar: '+e.message,true)}finally{btn.disabled=false}
});
$('create-form').addEventListener('submit',async event=>{
 event.preventDefault();const btn=event.target.querySelector('button[type=submit]');btn.disabled=true;
 try{const {data,error}=await db.rpc('dh_create_room',{p_name:$('room-name').value.trim()}).single();if(error)throw Error(error.message);
 msg('create-message','Sala criada! Código: '+data.room_code);
 location.href='mesa.html?id='+encodeURIComponent(data.room_id);
 }catch(e){msg('create-message','Erro ao criar sala: '+e.message,true)}finally{btn.disabled=false}
});
try{
 me=await getAuth();
 const [{data:profile},{data:chars,error:ce}]=await Promise.all([
  db.from('dh_profiles').select('role').eq('id',me.id).single(),
  db.from('dh_characters').select('id,name,archetype,creation_status').eq('owner_id',me.id).order('name')]);
 role=profile?.role||'player';if(!['master','admin'].includes(role))$('create-panel').classList.add('hidden');
 const select=$('character');select.replaceChildren();
 const first=document.createElement('option');first.value='';first.textContent='Selecione uma ficha pronta';select.append(first);
 if(ce)msg('join-message',ce.message,true);
 for(const ch of chars||[]){if(ch.creation_status!=='ready')continue;const opt=document.createElement('option');opt.value=ch.id;opt.textContent=ch.name+' — '+(ch.archetype||'Sem arquétipo');select.append(opt)}
 await showRooms();
}catch(e){msg('join-message',e.message,true)}
