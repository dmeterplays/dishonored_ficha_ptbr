import {db,el,cleanString,getAuth,validSheet,portraitURL,localJSON,placeholder} from './personagens-common.js';
import {items,powers,bonecharms} from './catalogo-dados.js';
const $=id=>document.getElementById(id);
const id=new URLSearchParams(location.search).get('id');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let user,character,activeKind='item',selected=null,dirty=false,saving=false;
const noteKeys=[['nota-contatos','Contatos'],['nota-focos','Focos'],['nota-talentos','Talentos'],['nota-pertences','Pertences'],['nota-poderes','Poderes'],['nota-gerais','Notas gerais']];
function status(text,bad=false){$('status').textContent=text;$('status').className=bad?'error':'status'}
function formInput(parent,id,label,value,type='text'){
 const box=el('div');const lbl=el('label',label);lbl.htmlFor=id;
 const input=el('input');input.id=id;input.type=type;input.value=String(value??'');
 box.append(lbl,input);parent.append(box);return input;
}
function setDirty(){dirty=true;$('save-indicator').textContent='Alterações não salvas';$('save-indicator').className='error'}
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue=''}});
function updateHero(){
 $('title').textContent=$('name').value||'Personagem sem nome';
}
function renderStats(){
 for(const [container,key] of [['skill-fields','skills'],['style-fields','styles']]){
 const root=$(container);root.replaceChildren();
 (character.sheet[key]||[]).forEach((entry,i)=>{
 const box=el('div',null,'stat-box');
 const label=el('label',entry.label);label.htmlFor=key+'-'+i;
 const input=el('input');input.type='number';input.min='4';input.max='8';input.step='1';input.id=key+'-'+i;input.value=entry.value;input.dataset.group=key;input.dataset.index=i;
 box.append(label,input);root.append(box);
 });
 }
}
function renderNotes(){
 const root=$('notes-fields');root.replaceChildren();
 for(const [key,label] of noteKeys){
 const box=el('div');const lbl=el('label',label);lbl.htmlFor=key;
 const area=el('textarea');area.id=key;area.value=character.sheet.notas?.[key]||'';
 box.append(lbl,area);root.append(box);
 }
}
function renderPhoto(url){
 const root=$('photo-wrap');root.replaceChildren();
 if(url){const img=el('img');img.alt='Retrato de '+character.name;img.src=url;img.className='hero-photo';root.append(img);}
 else root.append(el('span',placeholder(character.name),'placeholder'));
}
function renderMain(){
 $('sheet').classList.remove('hidden');
 $('name').value=character.sheet.nome??character.name;
 $('age').value=character.sheet.idade??'';
 $('archetype').value=character.sheet.arquetipo??character.archetype??'';
 $('truth1').value=character.sheet.verdade1??'';
 $('truth2').value=character.sheet.verdade2??'';
 $('background').value=character.sheet.background??'';
 $('stress-now').value=character.sheet.stressAtual??0;
 $('stress-max').value=character.sheet.stressMax??12;
 $('resources').textContent='XP: '+character.xp+' • Momentum: '+character.momentum+' • Vazio: '+character.void_points;
 updateHero();renderStats();renderNotes();renderPhoto(null);renderReadiness();
 if(character.portrait_path)portraitURL(character.portrait_path).then(renderPhoto);
 renderCatalog();
}
function gather(){
 const data=structuredClone(character.sheet);
 data.nome=$('name').value.trim();
 data.idade=$('age').value.trim();
 data.arquetipo=$('archetype').value.trim();
 data.verdade1=$('truth1').value;
 data.verdade2=$('truth2').value;
 data.background=$('background').value.trim();
 const stressMax=Number($('stress-max').value),stressNow=Number($('stress-now').value);
 if(!Number.isInteger(stressMax)||stressMax<1||stressMax>20)throw Error('O estresse máximo deve estar entre 1 e 20.');
 if(!Number.isInteger(stressNow)||stressNow<0||stressNow>stressMax)throw Error('O estresse atual deve estar entre 0 e o máximo.');
 data.stressMax=String(stressMax);data.stressAtual=String(stressNow);
 for(const key of ['skills','styles']){
 data[key]=(character.sheet[key]||[]).map((entry,i)=>{
 const field=$(key+'-'+i);const val=Number(field.value);
 if(!Number.isInteger(val)||val<4||val>8)throw Error('As perícias e estilos devem ter valores entre 4 e 8.');
 return {...entry,value:val};
 });
 }
 data.notas={...(character.sheet.notas||{})};
 for(const [key] of noteKeys)data.notas[key]=$(key).value;
 return data;
}
function ready(data){return !!(data.nome?.trim()&&data.arquetipo?.trim()&&data.verdade1?.trim()&&data.verdade2?.trim()&&data.background?.trim());}
function renderReadiness(){const done=character.creation_status==='ready';$('creation-status').textContent=done?'✓ Personagem pronto para a campanha.':'◷ Rascunho — conclua nome, Verdades e background para ficar pronto.';$('ready-button').disabled=done;}
async function save(markReady=false){
 if(saving)return;
 saving=true;$('save-top').disabled=true;$('save-bottom').disabled=true;$('ready-button').disabled=true;
 try{
 const data=gather();if(!validSheet(data))throw Error('A ficha não possui valores válidos.');
 if(markReady&&!ready(data))throw Error('Para ficar pronto, preencha nome, arquétipo, as duas Verdades e o background.');
 const nextStatus=markReady?'ready':(character.creation_status==='ready'&&ready(data)?'ready':'draft');
 const payload={name:data.nome||'Sem nome',archetype:data.arquetipo||null,sheet:data,creation_status:nextStatus};
 const {data:updated,error}=await db.from('dh_characters').update(payload).eq('id',id).eq('owner_id',user.id).select('id,name,archetype,sheet,creation_status').single();
 if(error)throw Error(error.message);
 character={...character,...updated};dirty=false;$('save-indicator').textContent='Ficha salva na sua conta ✓';$('save-indicator').className='status';status(markReady?'Personagem pronto para jogar!':'Ficha salva no Supabase.');updateHero();renderReadiness();renderCatalog();
 }catch(e){status('Erro ao salvar: '+e.message,true)}
 finally{saving=false;$('save-top').disabled=false;$('save-bottom').disabled=false;renderReadiness()}
}
$('save-top').addEventListener('click',()=>save());$('save-bottom').addEventListener('click',()=>save());$('ready-button').addEventListener('click',()=>save(true));
$('sheet').addEventListener('input',event=>{
 if(event.target.matches('input,textarea,select')&&event.target.id!=='catalog-search'&&!event.target.id.startsWith('test-')&&event.target.id!=='portrait-upload')setDirty();
 if(event.target.id==='name')updateHero();
 if(event.target.dataset.group==='skills'||event.target.dataset.group==='styles')refreshSelects();
});
$('export').addEventListener('click',()=>{
 try{const sheet=gather();localJSON(sheet)}catch(e){status(e.message,true)}
});
$('portrait-upload').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Escolha PNG, JPG ou WebP.');
 if(file.size>2*1024*1024)throw Error('Imagem acima de 2 MB.');
 const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[file.type];
 const path=user.id+'/'+id+'/'+Date.now()+'.'+ext;
 status('Enviando retrato...');
 const {error:uploadError}=await db.storage.from('dh-portraits').upload(path,file,{contentType:file.type,upsert:false});
 if(uploadError)throw Error(uploadError.message);
 const {error:updateError}=await db.from('dh_characters').update({portrait_path:path}).eq('id',id).eq('owner_id',user.id);
 if(updateError){await db.storage.from('dh-portraits').remove([path]);throw Error(updateError.message)}
 character.portrait_path=path;const url=await portraitURL(path);renderPhoto(url);status('Retrato salvo! Ele aparecerá também na galeria.');
 }catch(e){status('Falha ao enviar retrato: '+e.message,true)}
 finally{event.target.value=''}
});
const catalogs={item:items.map(x=>({...x})),power:powers.map(x=>({...x})),bonecharm:bonecharms.map(x=>({...x}))};
async function loadCatalogOverrides(){
 try{
  const {data,error}=await db.from('dh_catalog').select('category,name,description,coins_cost,rules,published').in('category',['item','power','bonecharm']).eq('published',true).limit(500);
  if(error)return;
  for(const row of data||[]){
   const list=catalogs[row.category];if(!list)continue;
   const found=list.find(x=>x.nome.toLocaleLowerCase('pt-BR')===row.name.toLocaleLowerCase('pt-BR'));
   if(found){
    if(row.description)found.descricao=row.description;
    if(row.category==='item'&&row.coins_cost!==null)found.preco=row.coins_cost;
   }else if(row.category==='item'){
    list.push({nome:row.name,descricao:row.description,preco:row.coins_cost,dano:row.rules?.dano??null,categoria:row.rules?.categoria||'Itens da campanha'});
   }else if(row.category==='power'){
    list.push({nome:row.name,descricao:row.description,tipo:row.rules?.tipo||'Poder ativo',custo:row.rules?.custo_vazio??null});
   }else{
    list.push({nome:row.name,descricao:row.description,tipo:row.rules?.tipo||'Amuleto da campanha'});
   }
  }
  renderCatalog();
 }catch(e){/* O catálogo básico funciona mesmo se estiver offline. */}
}
function renderCatalog(){
 const root=$('catalog-preview');root.replaceChildren();
 const search=$('catalog-search').value.trim().toLowerCase();
 const entries=(catalogs[activeKind]||[]).filter(x=>(x.nome+' '+x.descricao).toLowerCase().includes(search)).slice(0,60);
 if(!entries.length)root.append(el('p','Nenhum resultado.'));
 for(const e of entries){
 const card=el('article',null,'catalog-card');card.append(el('h4',e.nome));
 const badge=activeKind==='item'?(e.preco===null?'Preço sob consulta':e.preco+' moedas'):activeKind==='power'?(e.tipo==='Poder ativo'?(e.custo===null?'Custo definido pelo mestre':e.custo+' Ponto(s) do Vazio'):'Passivo'):e.tipo;
 card.append(el('p',badge),el('p',e.descricao));
 const buttons=el('div',null,'action-group');
 const test=el('button','Testar '+(activeKind==='item'?'item':activeKind==='power'?'poder':'amuleto'));
 test.type='button';test.addEventListener('click',()=>selectForTest(e));
 buttons.append(test);card.append(buttons);root.append(card);
 }
}
function refreshSelects(){
 for(const [id,key] of [['test-skill','skills'],['test-style','styles']]){
 const select=$(id);const old=select.value;select.replaceChildren();
 for(const [i,entry] of (character?.sheet[key]||[]).entries()){
 const edited=$(key+'-'+i);const val=edited?Number(edited.value):Number(entry.value);
 const opt=el('option',entry.label+' ('+val+')');opt.value=String(i);select.append(opt);
 }
 if([...select.options].some(o=>o.value===old))select.value=old;
 }
}
function selectForTest(entry){
 selected={entry,kind:activeKind};
 $('test-panel').classList.remove('hidden');
 $('test-name').textContent='Simular: '+entry.nome;
 $('test-description').textContent=entry.descricao+(selected.kind==='item'&&entry.dano!==null?' • Dano base: '+entry.dano+'.':'');
 refreshSelects();$('roll-output').textContent='Escolha perícia, estilo e dificuldade. O item não será adquirido e nenhum recurso será gasto.';
 $('test-panel').scrollIntoView({behavior:'smooth',block:'center'});
}
for(const b of document.querySelectorAll('[data-kind]'))b.addEventListener('click',()=>{
 activeKind=b.dataset.kind;
 for(const other of document.querySelectorAll('[data-kind]'))other.setAttribute('aria-selected',String(other===b));
 $('test-panel').classList.add('hidden');selected=null;renderCatalog();
});
$('catalog-search').addEventListener('input',renderCatalog);
function roll20(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%20+1}
$('roll').addEventListener('click',()=>{
 if(!selected)return;
 const skillIndex=Number($('test-skill').value),styleIndex=Number($('test-style').value);
 const v=group=>{const node=$(group+'-'+(group==='skills'?skillIndex:styleIndex));return node?Number(node.value):4};
 const skill=v('skills'),style=v('styles'),focus=Number($('test-focus').value),dice=Number($('test-dice').value),difficulty=Number($('test-difficulty').value);
 if(![skill,style,focus,dice,difficulty].every(Number.isInteger)||skill<4||skill>8||style<4||style>8||focus<0||focus>8||dice<2||dice>5||difficulty<0||difficulty>5){$('roll-output').textContent='Corrija os valores do teste antes de rolar.';return}
 const target=skill+style;const rolls=Array.from({length:dice},roll20);
 const successes=rolls.reduce((n,r)=>n+(r===1||(focus>0&&r<=focus)?2:r<=target?1:0),0);
 const complications=rolls.filter(n=>n===20).length;
 const won=successes>=difficulty;
 const base=selected.kind==='item'&&selected.entry.dano!==null&&selected.entry.dano!==undefined?' Dano base do item: '+selected.entry.dano+' (se houver acerto e efeito aplicável).':'';
 const text='Rolagem: '+rolls.join(' · ')+' | Alvo '+target+' (perícia '+skill+' + estilo '+style+') • Foco '+focus+' • Dificuldade '+difficulty+'. Resultado: '+successes+' sucesso(s), '+complications+' complicação(ões). '+(won?'Teste bem-sucedido!':'Teste não atingiu a dificuldade.')+(successes>difficulty?' Excedente: '+(successes-difficulty)+' sucesso(s).':'')+base+' Simulação: ficha e recursos intactos.';
 $('roll-output').textContent=text;
});
async function init(){
 if(!uuid.test(id||'')){status('Endereço da ficha inválido.',true);return}
 user=await getAuth();
 const {data,error}=await db.from('dh_characters').select('id,name,owner_id,archetype,xp,momentum,void_points,sheet,portrait_path,creation_status').eq('id',id).eq('owner_id',user.id).single();
 if(error||!data){status('Esta ficha não foi encontrada na sua conta.',true);return}
 character=data;if(!validSheet(character.sheet)){status('Os dados desta ficha estão incompletos; reimporte o JSON original.',true);return}
 renderMain();await loadCatalogOverrides();
}
try{await init()}catch(e){status(e.message,true)}
