import {db,el,validSheet,getAuth,imageFor} from './personagens-common.js';
const $=id=>document.getElementById(id);let user;
async function load(){
 const {data,error}=await db.from('dh_characters').select('id,name,archetype,xp,momentum,void_points,sheet,portrait_path,creation_status').eq('owner_id',user.id).order('created_at',{ascending:false});
 const root=$('cards');root.replaceChildren();
 if(error){root.append(el('p','Não foi possível carregar: '+error.message,'error'));return}
 $('count').textContent=(data||[]).length+' personagem(ns)';
 if(!data?.length){root.append(el('p','Nenhuma ficha ainda. Clique em Criar personagem ou importe seu JSON.'));return}
 for(const ch of data){
  const card=el('a',null,'preview');card.href='personagem.html?id='+encodeURIComponent(ch.id);card.style.textDecoration='none';card.style.color='inherit';
  card.append(imageFor(ch));
  const body=el('div',null,'preview-content');
  body.append(el('h3',ch.name||'Personagem'),el('p',ch.creation_status==='ready'?'✓ Pronto para jogar':'◷ Rascunho — falta concluir a ficha',ch.creation_status==='ready'?'status':'error'),el('p','Arquétipo: '+(ch.archetype||'Não definido')),el('p','Estresse: '+(ch.sheet?.stressAtual??0)+' / '+(ch.sheet?.stressMax??12)),el('p','XP: '+ch.xp+' • Momentum: '+ch.momentum+' • Vazio: '+ch.void_points));
  const open=el('span','Abrir ficha →','btn');
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
try{user=await getAuth();await load();if(new URLSearchParams(location.search).get('deleted')==='1'){$('status').textContent='Ficha excluída com sucesso.';$('status').className='status';history.replaceState(null,'',location.pathname)}}catch(e){$('status').textContent=e.message}
