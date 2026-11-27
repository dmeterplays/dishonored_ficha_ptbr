import {db,el,validSheet,getAuth,imageFor} from './personagens-common.js';
const $=id=>document.getElementById(id);let user,knownCharacters=[],localCandidates=[];
async function load(){
 const {data,error}=await db.from('dh_characters').select('id,name,archetype,xp,momentum,void_points,sheet,portrait_path,creation_status').eq('owner_id',user.id).order('created_at',{ascending:false});
 const root=$('cards');root.replaceChildren();
 if(error){root.append(el('p','Não foi possível carregar: '+error.message,'error'));return}
 $('count').textContent=(data||[]).length+' personagem(ns)';
 knownCharacters=data||[];
 if(!data?.length){root.append(el('p','Nenhuma ficha ainda. Você pode trazer uma ficha antiga ou criar um personagem novo.'));return}
 for(const ch of data){
  const card=el('a',null,'preview');card.href='personagem.html?id='+encodeURIComponent(ch.id);card.style.textDecoration='none';card.style.color='inherit';
  card.append(imageFor(ch));
  const body=el('div',null,'preview-content');
  body.append(el('h3',ch.name||'Personagem'),el('p',ch.creation_status==='ready'?'✓ Pronto para jogar':'◷ Rascunho — falta concluir a ficha',ch.creation_status==='ready'?'status':'error'),el('p','Arquétipo: '+(ch.archetype||'Não definido')),el('p','Estresse: '+(ch.sheet?.stressAtual??0)+' / '+(ch.sheet?.stressMax??12)),el('p','XP: '+ch.xp+' • Momentum: '+ch.momentum+' • Vazio: '+ch.void_points));
  const open=el('span','Abrir ficha →','btn');
  body.append(open);card.append(body);root.append(card);
 }
 renderLocalCandidates();
}
// As duas versões antigas usam o mesmo origin do GitHub Pages: ficha ativa e biblioteca pessoal.
const legacyStores=['dishonored-ficha-v1','dishonored-personagens-v1'];
const normal=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
const stableSheet=sheet=>({
 nome:sheet.nome,arquetipo:sheet.arquetipo,idade:sheet.idade,verdade1:sheet.verdade1,
 verdade2:sheet.verdade2,skills:sheet.skills,styles:sheet.styles,notas:sheet.notas,
 stressAtual:sheet.stressAtual,stressMax:sheet.stressMax,catalogSelections:sheet.catalogSelections
});
async function fingerprint(sheet){
 const bytes=new TextEncoder().encode(JSON.stringify(stableSheet(sheet)));
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
function normalizeLegacy(sheet){
 const normalized=structuredClone(sheet);
 if(!normalized.notas||typeof normalized.notas!=='object'||Array.isArray(normalized.notas))normalized.notas={};
 // A ficha legada não tinha campos para todos os dados novos: preserve os existentes.
 if(!normalized.catalogSelections||typeof normalized.catalogSelections!=='object'||Array.isArray(normalized.catalogSelections))normalized.catalogSelections={};
 for(const kind of ['focus','power','talent']){
  if(!Array.isArray(normalized.catalogSelections[kind]))normalized.catalogSelections[kind]=[];
 }
 if(!Array.isArray(normalized.focuses)){
  const original=Array.isArray(normalized.creation?.focus)?normalized.creation.focus:[];
  normalized.focuses=original.filter(x=>x&&(x.nome||x.name))
    .map(x=>({name:x.nome||x.name,rank:Number(x.valor??x.rank)||2}));
  if(!normalized.focuses.length)normalized.focuses=normalized.catalogSelections.focus
    .filter(x=>x?.name&&Number.isInteger(Number(x.rank))&&Number(x.rank)>=1&&Number(x.rank)<=8)
    .map(x=>({name:x.name,rank:Number(x.rank)}));
 }
 if(!normalized.background)normalized.background='';
 return normalized;
}
async function scanLegacy(){
 const list=[],errors=[];
 try{
  const active=localStorage.getItem(legacyStores[0]);
  if(active){const sheet=JSON.parse(active);if(validSheet(sheet))list.push({sheet,source:'Ficha antiga aberta',origin:'active'});else errors.push('A ficha aberta está incompleta ou incompatível.')}
 }catch(e){errors.push('Não foi possível ler a ficha antiga aberta.')}
 try{
  const raw=localStorage.getItem(legacyStores[1]);
  if(raw){
   const library=JSON.parse(raw);
   if(Array.isArray(library))for(let i=0;i<library.length;i++){
    const sheet=library[i]?.data;
    if(validSheet(sheet))list.push({sheet,source:'Biblioteca antiga',origin:'library',libraryId:library[i].id||null});
   }
  }
 }catch(e){errors.push('Não foi possível ler a biblioteca antiga.')}
 const unique=new Map();
 for(const item of list){
  try{const hash=await fingerprint(item.sheet);if(!unique.has(hash))unique.set(hash,{...item,hash})}catch(e){errors.push('Não foi possível verificar uma ficha antiga.')}
 }
 localCandidates=[...unique.values()];
 renderLocalCandidates();
 const count=localCandidates.length;
 $('local-import-message').textContent=count?
   count+' ficha(s) antiga(s) encontrada(s) neste navegador. Escolha qual deseja transferir.':
   'Nenhuma ficha antiga encontrada aqui. '+(errors.join(' ')||'Se você usava outro navegador ou aparelho, importe seu arquivo JSON.');
}
async function transferLegacy(candidate,button){
 button.disabled=true;
 const msg=$('local-import-message');
 try{
  const sheet=normalizeLegacy(candidate.sheet);
  if(!validSheet(sheet))throw Error('A ficha antiga não possui os dados mínimos necessários.');
  if(JSON.stringify(sheet).length>240000)throw Error('Ficha grande demais para importar. Tente exportar o JSON e revisar os dados.');
  const exact=knownCharacters.find(ch=>ch.sheet?.legacyImportHash===candidate.hash);
  if(exact){location.href='personagem.html?id='+encodeURIComponent(exact.id);return}
  const likely=knownCharacters.find(ch=>normal(ch.name)===normal(sheet.nome)&&normal(ch.archetype)===normal(sheet.arquetipo));
  if(likely&&!confirm('Você já tem uma ficha chamada “'+(likely.name||'Personagem')+'” nesta conta. Importar outra cópia mesmo assim?'))return;
  sheet.legacyImportHash=candidate.hash;
  sheet.legacyImportSource=candidate.origin;
  // Deixe como rascunho caso não existam background e verdades: nenhum dado será inventado.
  const ready=!!(sheet.nome?.trim()&&sheet.arquetipo?.trim()&&sheet.verdade1?.trim()&&sheet.verdade2?.trim()&&sheet.background?.trim());
  const {data,error}=await db.from('dh_characters').insert({
   owner_id:user.id,name:sheet.nome?.trim()||'Sem nome',
   archetype:sheet.arquetipo?.trim()||null,sheet,
   creation_status:ready?'ready':'draft'
  }).select('id').single();
  if(error)throw Error(error.message);
  msg.className='status';msg.textContent='Personagem importado! Abrindo sua ficha...';
  location.href='personagem.html?id='+encodeURIComponent(data.id);
 }catch(e){msg.className='error';msg.textContent='Falha ao transferir: '+e.message}
 finally{button.disabled=false}
}
function renderLocalCandidates(){
 const root=$('local-import-list');if(!root)return;root.replaceChildren();
 for(const candidate of localCandidates){
  const sheet=candidate.sheet;
  const item=el('div',null,'legacy-transfer-entry');
  item.append(el('h3',sheet.nome?.trim()||'Personagem sem nome'));
  item.append(el('p','Arquétipo: '+(sheet.arquetipo||'Não informado')+' · '+candidate.source));
  item.append(el('p','Perícias: '+sheet.skills.length+' · Estilos: '+sheet.styles.length+
   ' · Focos selecionados: '+(sheet.focuses?.length||sheet.catalogSelections?.focus?.length||sheet.creation?.focus?.length||0)));
  const notes=Object.values(sheet.notas||{}).filter(v=>typeof v==='string'&&v.trim()).length;
  item.append(el('p','Campos de anotações preenchidos: '+notes));
  const actions=el('div',null,'row');
  const existing=knownCharacters.find(ch=>ch.sheet?.legacyImportHash===candidate.hash);
  if(existing){
   actions.append(el('span','Já transferida para esta conta ✓','status'));
   const open=el('a','Abrir ficha','btn secondary');open.href='personagem.html?id='+encodeURIComponent(existing.id);actions.append(open);
  }else{
   const duplicate=knownCharacters.find(ch=>normal(ch.name)===normal(sheet.nome)&&normal(ch.archetype)===normal(sheet.arquetipo));
   if(duplicate)item.append(el('p','Já existe uma ficha com este nome na conta. Confira antes de criar uma cópia.','legacy-transfer-warning'));
   const transfer=el('button','Transferir esta ficha');
   transfer.type='button';transfer.addEventListener('click',()=>transferLegacy(candidate,transfer));actions.append(transfer);
  }
  item.append(actions);root.append(item);
 }
}
$('scan-local').addEventListener('click',scanLegacy);

$('import').addEventListener('click',async()=>{
 const file=$('upload-json').files?.[0];if(!file){$('status').textContent='Selecione um arquivo JSON.';return}
 const btn=$('import');btn.disabled=true;
 try{
  if(file.size>2000000)throw Error('JSON acima de 2 MB.');
  const source=JSON.parse(await file.text());if(!validSheet(source))throw Error('O arquivo não está no formato da ficha original.');
  const sheet=normalizeLegacy(source);
  const hash=await fingerprint(source);
  const existing=knownCharacters.find(ch=>ch.sheet?.legacyImportHash===hash);
  if(existing){location.href='personagem.html?id='+encodeURIComponent(existing.id);return}
  const duplicate=knownCharacters.find(ch=>normal(ch.name)===normal(sheet.nome)&&normal(ch.archetype)===normal(sheet.arquetipo));
  if(duplicate&&!confirm('Já existe uma ficha com este nome na sua conta. Importar outra cópia mesmo assim?'))return;
  sheet.legacyImportHash=hash;sheet.legacyImportSource='json';
  const ready=!!(sheet.nome?.trim()&&sheet.arquetipo?.trim()&&sheet.verdade1?.trim()&&sheet.verdade2?.trim()&&sheet.background?.trim());
  const {data,error}=await db.from('dh_characters').insert({owner_id:user.id,name:sheet.nome||'Sem nome',archetype:sheet.arquetipo||null,sheet,creation_status:ready?'ready':'draft'}).select('id').single();
  if(error)throw Error(error.message);
  $('status').textContent='Ficha importada. Abrindo personagem...';
  location.href='personagem.html?id='+encodeURIComponent(data.id);
 }catch(e){$('status').textContent=e.message;$('status').className='error';}
 finally{btn.disabled=false}
});
try{user=await getAuth();await load();await scanLegacy();if(new URLSearchParams(location.search).get('deleted')==='1'){$('status').textContent='Ficha excluída com sucesso.';$('status').className='status';history.replaceState(null,'',location.pathname)}}catch(e){$('status').textContent=e.message}
