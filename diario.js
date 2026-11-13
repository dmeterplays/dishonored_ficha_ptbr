import {db,getAuth} from './personagens-common.js';
const $=id=>document.getElementById(id),roomId=new URLSearchParams(location.search).get('room');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
let user,room=null,records=[],editing=null,master=false,busy=false,channel=null;
const el=(tag,text,cls)=>{const x=document.createElement(tag);if(text!=null)x.textContent=String(text);if(cls)x.className=cls;return x};
const status=(text,bad=false)=>{$('diary-status').textContent=text;$('diary-status').className=bad?'error':'status'};
const duration=mins=>{const h=Math.floor(mins/60),m=mins%60;return h?(h+'h'+(m?' '+m+'min':'')):m+'min'};
const dateText=value=>{const [y,m,d]=value.split('-');return d+'/'+m+'/'+y};
function clearForm(){
 editing=null;$('diary-form-title').textContent='Registrar sessão';$('diary-save').textContent='Publicar resumo';$('diary-cancel').classList.add('hidden');
 $('diary-form').reset();$('diary-number').value=records.reduce((n,r)=>Math.max(n,r.session_number),0)+1;
 $('diary-date').value=new Date().toLocaleDateString('en-CA');$('diary-duration').value='180';$('diary-form-status').textContent='';
}
function detailsBlock(root,title,value){
 if(!value?.trim())return;
 root.append(el('h3',title),el('p',value));
}
function draw(){
 $('diary-count').textContent=records.length+' sessão(ões)';
 const latest=$('diary-summary');latest.replaceChildren();
 if(records.length){
  const r=records[0],box=el('div',null,'diary-latest');
  box.append(el('span','ÚLTIMA SESSÃO · '+dateText(r.session_date)+' · '+duration(r.duration_minutes),'eyebrow'),el('h2','Sessão '+r.session_number+' — '+r.title));
  const p=el('p',r.summary.length>350?r.summary.slice(0,350)+'…':r.summary);box.append(p);
  const button=el('button','Continuar de onde paramos','secondary');button.type='button';
  button.addEventListener('click',()=>{document.getElementById('session-'+r.id)?.scrollIntoView({behavior:'smooth',block:'start'});document.getElementById('session-'+r.id).open=true});
  box.append(button);latest.append(box);
 }
 const root=$('diary-list');root.replaceChildren();
 if(!records.length){root.append(el('p',master?'Nenhuma sessão registrada. Use o formulário para criar o primeiro resumo.':'Ainda não há resumos publicados pelo mestre.','diary-empty'));return}
 for(const r of records){
  const item=el('details',null,'diary-entry');item.id='session-'+r.id;
  if(r.id===records[0].id)item.open=true;
  const summary=el('summary');summary.append(el('span','Sessão '+r.session_number+' — '+r.title,'diary-entry-title'),el('span',dateText(r.session_date)+' · '+duration(r.duration_minutes),'diary-entry-meta'));item.append(summary);
  const body=el('div',null,'diary-entry-body');
  detailsBlock(body,'O que aconteceu',r.summary);detailsBlock(body,'Pistas descobertas',r.clues);detailsBlock(body,'NPCs importantes',r.npcs);detailsBlock(body,'Para a próxima sessão',r.next_steps);
  if(master){
   const buttons=el('div',null,'diary-entry-actions');
   const edit=el('button','Editar sessão','secondary');edit.type='button';
   edit.addEventListener('click',()=>openEdit(r));
   const remove=el('button','Excluir registro','danger-button');remove.type='button';
   remove.addEventListener('click',async()=>{
    if(!confirm('Excluir o registro da sessão '+r.session_number+'? Esta ação não pode ser desfeita.'))return;
    remove.disabled=true;const {error}=await db.from('dh_room_journal').delete().eq('room_id',roomId).eq('id',r.id);
    if(error){status('Erro ao excluir: '+error.message,true);remove.disabled=false;return}
    if(editing===r.id)editing=null;await refresh();status('Sessão excluída.');
   });
   buttons.append(edit,remove);body.append(buttons);
  }
  item.append(body);root.append(item);
 }
}
function openEdit(r){
 editing=r.id;$('diary-form-title').textContent='Editar sessão '+r.session_number;$('diary-save').textContent='Salvar alterações';$('diary-cancel').classList.remove('hidden');
 for(const [field,value] of [['diary-number',r.session_number],['diary-date',r.session_date],['diary-duration',r.duration_minutes],['diary-title',r.title],['diary-text',r.summary],['diary-clues',r.clues],['diary-npcs',r.npcs],['diary-next',r.next_steps]])$(field).value=value??'';
 $('diary-editor').scrollIntoView({behavior:'smooth',block:'start'});
}
async function refresh(){
 const {data,error}=await db.from('dh_room_journal').select('id,room_id,session_number,session_date,duration_minutes,title,summary,clues,npcs,next_steps,updated_at').eq('room_id',roomId).order('session_number',{ascending:false}).limit(300);
 if(error){status('Não foi possível carregar o diário: '+error.message,true);return}
 records=data||[];draw();
 if(!editing)clearForm();
}
$('diary-cancel').addEventListener('click',clearForm);
$('diary-form').addEventListener('submit',async event=>{
 event.preventDefault();if(!master||busy)return;
 busy=true;$('diary-save').disabled=true;$('diary-form-status').textContent='Salvando...';
 const values={room_id:roomId,session_number:Number($('diary-number').value),session_date:$('diary-date').value,duration_minutes:Number($('diary-duration').value),title:$('diary-title').value.trim(),summary:$('diary-text').value.trim(),clues:$('diary-clues').value.trim(),npcs:$('diary-npcs').value.trim(),next_steps:$('diary-next').value.trim()};
 try{
  if(!Number.isInteger(values.session_number)||values.session_number<1||values.session_number>9999||!Number.isInteger(values.duration_minutes)||values.duration_minutes<1||values.duration_minutes>1440||!values.title||!values.summary)throw Error('Confira número, data, duração, título e resumo.');
  const result=editing?await db.from('dh_room_journal').update(values).eq('room_id',roomId).eq('id',editing):await db.from('dh_room_journal').insert(values);
  if(result.error)throw Error(result.error.message);
  editing=null;await refresh();status('Resumo salvo e disponível aos participantes.');
 }catch(e){$('diary-form-status').textContent='Erro: '+e.message}
 finally{busy=false;$('diary-save').disabled=false}
});
async function boot(){
 if(!uuid.test(roomId||''))throw Error('Endereço de diário inválido. Abra o diário pela campanha.');
 user=await getAuth();
 const [{data,error},{data:members,error:memberError}]=await Promise.all([
  db.from('dh_rooms').select('id,name,owner_id').eq('id',roomId).single(),
  db.from('dh_room_members').select('user_id').eq('room_id',roomId).eq('user_id',user.id).limit(1)
 ]);
 if(error||!data||memberError||!members?.length)throw Error('Você não participa dessa campanha.');
 room=data;master=data.owner_id===user.id;$('diary-room-name').textContent=data.name;
 $('diary-back').href='mesa.html?id='+encodeURIComponent(roomId);
 $('diary-editor').classList.toggle('hidden',!master);
 await refresh();status('');
 channel=db.channel('diary-'+roomId).on('postgres_changes',{event:'UPDATE',schema:'public',table:'dh_rooms',filter:'id=eq.'+roomId},()=>{if(!editing)refresh()}).subscribe();
 window.addEventListener('pagehide',()=>{if(channel)db.removeChannel(channel)});
}
try{await boot()}catch(e){status(e.message,true)}
