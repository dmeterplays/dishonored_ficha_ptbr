import {db,el,validSheet,getAuth,imageFor} from './personagens-common.js';
const $=id=>document.getElementById(id);let user;
async function load(){
 const {data,error}=await db.from('dh_characters').select('id,name,archetype,xp,momentum,void_points,sheet,portrait_path').eq('owner_id',user.id).order('created_at',{ascending:false});
 const root=$('cards');root.replaceChildren();
 if(error){root.append(el('p','Não foi possível carregar: '+error.message,'error'));return}
 $('count').textContent=(data||[]).length+' personagem(ns)';
 if(!data?.length){root.append(el('p','Nenhuma ficha ainda. Importe seu JSON acima.'));return}
 for(const ch of data){
  const card=el('article',null,'preview');
  card.append(imageFor(ch));
  const body=el('div',null,'preview-content');
  body.append(el('h3',ch.name||'Personagem'),el('p','Arquétipo: '+(ch.archetype||'Não definido')),el('p','XP: '+ch.xp+' • Momentum: '+ch.momentum+' • Vazio: '+ch.void_points));
  const open=el('a','Abrir ficha →','btn');open.href='personagem.html?id='+encodeURIComponent(ch.id);
  body.append(open);card.append(body);root.append(card);
 }
}
$('import').addEventListener('click',async()=>{
 const file=$('upload-json').files?.[0];if(!file){$('status').textContent='Selecione um arquivo JSON.';return}
 const btn=$('import');btn.disabled=true;
 try{
  if(file.size>2000000)throw Error('JSON acima de 2 MB.');
  const sheet=JSON.parse(await file.text());if(!validSheet(sheet))throw Error('O arquivo não está no formato da ficha original.');
  const {data,error}=await db.from('dh_characters').insert({owner_id:user.id,name:sheet.nome||'Sem nome',archetype:sheet.arquetipo||null,sheet}).select('id').single();
  if(error)throw Error(error.message);
  $('status').textContent='Ficha importada. Abrindo personagem...';
  location.href='personagem.html?id='+encodeURIComponent(data.id);
 }catch(e){$('status').textContent=e.message;$('status').className='error';}
 finally{btn.disabled=false}
});
try{user=await getAuth();await load()}catch(e){$('status').textContent=e.message}
