import {db,getAuth} from './personagens-common.js';
import {archetypes,talentGroups,skills as skillData,styles as styleData} from './catalogo-dados.js';
const $=id=>document.getElementById(id);
const canonicalStyles=['Ousadamente','Cuidadosamente','Habilmente','Forçosamente','Silenciosamente','Rapidamente'];
const skillNames=['Lutar','Mover','Estudar','Sobreviver','Falar','Consertar'];
const normalizeStyle=s=>s==='Inteligentemente'?'Habilmente':s.trim();
let user,step=1,entryId=null,saving=false,initialized=false;
function options(select,values){select.replaceChildren();for(const v of values){const o=document.createElement('option');o.value=v;o.textContent=v;select.append(o)}}
function current(){return archetypes.find(a=>a.nome===$('archetype').value)||archetypes[0]}
function skillBonus(a){return [...a.pericias.matchAll(/(Lutar|Mover|Estudar|Sobreviver|Falar|Consertar)\s*\+2/g)].map(m=>m[1])}
function secondarySkills(a){const tail=a.pericias.split(';')[1]||'';return [...tail.matchAll(/(Lutar|Mover|Estudar|Sobreviver|Falar|Consertar)/g)].map(m=>m[1])}
function allowedStyles(a){const after=a.estilos.split(':')[1]||'';return after.split(',').map(normalizeStyle).filter(s=>canonicalStyles.includes(s))}
function contactCount(a){return a.contatos.startsWith('2')?2:1}
function setStep(next){
 step=next;
 for(let i=1;i<=3;i++)$('step-'+i).classList.toggle('hidden',i!==step);
 for(const b of document.querySelectorAll('[data-step]')){const selected=Number(b.dataset.step)===step;b.classList.toggle('on',selected);b.setAttribute('aria-current',selected?'step':'false')}
 $('previous').disabled=step===1;
 $('next').classList.toggle('hidden',step===3);
 $('finish').classList.toggle('hidden',step!==3);
 $('message').textContent='';
 window.scrollTo({top:0,behavior:'smooth'});
}
function benefitRows(){
 const a=current();const primary=skillBonus(a),bonus=$('bonus-skill').value;
 const first=$('first-style').value,second=$('second-style').value;
 const write=(id,names,fn)=>{const root=$(id);root.replaceChildren();for(const name of names){const p=document.createElement('div');p.className='stat-box';const x=document.createElement('strong');x.textContent=name;const val=document.createElement('p');val.textContent='Valor '+fn(name);p.append(x,val);root.append(p)}};
 write('skill-preview',skillNames,n=>4+(primary.includes(n)?2:0)+(n===bonus?1:0));
 write('style-preview',canonicalStyles,n=>4+(n===first?1:0)+(n===second&&second!==first?1:0));
}
function updateFocus(){
 const x=Number($('rank-one').value),y=Number($('rank-two').value),good=Number.isInteger(x)&&Number.isInteger(y)&&x>=2&&x<=6&&y>=2&&y<=6&&x+y===8;
 $('focus-total').textContent=x+y+'/8 pontos distribuídos'+(good?' ✓':' — distribua exatamente 8, com 2 a 6 por foco');
 $('focus-total').className=good?'status':'error';
}
function updateReady(){
 const ok=!!$('background').value.trim()&&!!$('name').value.trim()&&!!$('truth-one').value.trim()&&!!$('truth-two').value.trim();
 $('ready-check').textContent=ok?'Pronto para jogar ✓':'Rascunho';
 $('ready-help').textContent=ok?'Todas as informações essenciais foram preenchidas. Você pode concluir sua ficha.':'Você pode salvar um rascunho agora. Para marcar como pronto, preencha nome, duas Verdades e background.';
 $('finish').disabled=!ok;
}

async function resumeDraft(){
 const id=new URLSearchParams(location.search).get('id');
 if(!id)return;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw Error('Identificador inválido.');
 const {data,error}=await db.from('dh_characters').select('id,sheet,creation_status').eq('id',id).eq('owner_id',user.id).single();
 if(error||!data)throw Error('Rascunho não encontrado na sua conta.');
 if(data.creation_status!=='draft'||!data.sheet?.creation)throw Error('Esta ficha não possui uma criação em etapas pendente. Edite-a pela ficha completa.');
 const sheet=data.sheet,config=sheet.creation;
 entryId=data.id;
 if(archetypes.some(x=>x.nome===sheet.arquetipo)){$('archetype').value=sheet.arquetipo;updateArchetype();}
 if(secondarySkills(current()).includes(config.bonusSkill))$('bonus-skill').value=config.bonusSkill;
 const allowed=allowedStyles(current());
 if(Array.isArray(config.styles)){
  if(allowed.includes(config.styles[0]))$('first-style').value=config.styles[0];
  if(allowed.includes(config.styles[1]))$('second-style').value=config.styles[1];
 }
 for(const radio of document.querySelectorAll('input[name="starting-talent"]'))radio.checked=radio.value===config.talent;
 if(Array.isArray(config.focus)&&config.focus.length===2){
  $('focus-one').value=config.focus[0].nome||'';$('rank-one').value=config.focus[0].valor||4;
  $('focus-two').value=config.focus[1].nome||'';$('rank-two').value=config.focus[1].valor||4;
 }
 $('name').value=sheet.nome||'';$('age').value=sheet.idade||'';
 $('truth-one').value=sheet.verdade1||'';$('truth-two').value=sheet.verdade2||'';
 $('background').value=sheet.background||'';
 (config.contacts||[]).forEach((c,i)=>{if($('contact-'+i))$('contact-'+i).value=c.nome||'';if($('relation-'+i))$('relation-'+i).value=c.relacionamento||'Neutro'});
 benefitRows();updateFocus();updateReady();setStep(Math.max(1,Math.min(3,Number(config.stage)||1)));
}

function updateArchetype(){
 const a=current();
 const bonus=secondarySkills(a),styleOptions=allowedStyles(a);
 options($('bonus-skill'),bonus);options($('first-style'),styleOptions);options($('second-style'),styleOptions);
 if(styleOptions.length>1)$('second-style').value=styleOptions[1];
 const benefits=$('archetype-benefits');benefits.replaceChildren();
 for(const [label,value] of [['Perícias',a.pericias],['Estilos',a.estilos.replaceAll('Inteligentemente','Habilmente')],['Focos sugeridos',a.focos],['Equipamento inicial',a.pertences],['Contatos',a.contatos]]){
 const p=document.createElement('p');const strong=document.createElement('strong');strong.textContent=label+': ';p.append(strong,document.createTextNode(value));benefits.append(p);
 }
 const d=$('focus-suggestions');d.replaceChildren();
 for(const f of a.focos.split(',').map(x=>x.trim())){const o=document.createElement('option');o.value=f;d.append(o)}
 const talents=talentGroups[a.nome]||[];
 const root=$('talent-options');root.replaceChildren();
 talents.forEach(([name,description],i)=>{
 const box=document.createElement('label');box.className='wizard-talent';
 const radio=document.createElement('input');radio.type='radio';radio.name='starting-talent';radio.value=name;radio.checked=i===0;
 const title=document.createElement('strong');title.textContent=name;
 const detail=document.createElement('p');detail.textContent=description;
 box.append(radio,title,detail);root.append(box);
 });
 $('contact-help').textContent='Este arquétipo concede '+contactCount(a)+' contato(s) com relacionamento neutro. Você pode detalhar o vínculo do personagem com cada um.';
 const contacts=$('contacts');contacts.replaceChildren();
 for(let i=0;i<contactCount(a);i++){
 const wrap=document.createElement('div');wrap.className='two';
 const n=document.createElement('div'),r=document.createElement('div');
 const nameLabel=document.createElement('label');nameLabel.htmlFor='contact-'+i;nameLabel.textContent='Nome ou identidade do contato '+(i+1);
 const name=document.createElement('input');name.id='contact-'+i;name.placeholder='Ex.: Informante das docas';
 const relLabel=document.createElement('label');relLabel.htmlFor='relation-'+i;relLabel.textContent='Relacionamento';
 const rel=document.createElement('select');rel.id='relation-'+i;
 for(const v of ['Neutro','Aliado','Rival']){const o=document.createElement('option');o.value=v;o.textContent=v;rel.append(o)}
 rel.value='Neutro';n.append(nameLabel,name);r.append(relLabel,rel);wrap.append(n,r);contacts.append(wrap);
 }
 benefitRows();updateReady();
}
function validateStage1(){
 const a=current();
 if(!secondarySkills(a).includes($('bonus-skill').value))throw Error('Escolha uma perícia adicional válida.');
 const available=allowedStyles(a);
 const s1=$('first-style').value,s2=$('second-style').value;
 if(!available.includes(s1)||!available.includes(s2)||s1===s2)throw Error('Escolha dois estilos diferentes dentre as opções do arquétipo.');
 const talent=document.querySelector('input[name="starting-talent"]:checked')?.value;
 if(!(talentGroups[a.nome]||[]).some(x=>x[0]===talent))throw Error('Escolha um talento do arquétipo.');
 const f1=$('focus-one').value.trim(),f2=$('focus-two').value.trim();
 const r1=Number($('rank-one').value),r2=Number($('rank-two').value);
 if(!f1||!f2||f1.toLowerCase()===f2.toLowerCase())throw Error('Escolha dois focos diferentes.');
 if(!Number.isInteger(r1)||!Number.isInteger(r2)||r1<2||r1>6||r2<2||r2>6||r1+r2!==8)throw Error('Distribua 8 pontos entre os dois focos (mínimo 2, máximo 6).');
 return {a,talent,f1,f2,r1,r2};
}
function validateStage2(){if(!$('name').value.trim())throw Error('Informe o nome do personagem.');if(!$('truth-one').value.trim()||!$('truth-two').value.trim())throw Error('Preencha as duas Verdades pessoais.');}
function buildSheet(){
 const {a,talent,f1,f2,r1,r2}=validateStage1();
 const bonus=$('bonus-skill').value,primary=skillBonus(a),s1=$('first-style').value,s2=$('second-style').value;
 const skillIds=['fight','move','study','survive','talk','tinker'],styleIds=['boldly','carefully','cleverly','forcefully','quietly','swiftly'];
 const skills=skillNames.map((label,i)=>({id:skillIds[i],label,value:4+(primary.includes(label)?2:0)+(label===bonus?1:0)}));
 const styles=canonicalStyles.map((label,i)=>({id:styleIds[i],label,value:4+(label===s1||label===s2?1:0)}));
 const contacts=Array.from({length:contactCount(a)},(_,i)=>({nome:$('contact-'+i).value.trim(),relacionamento:$('relation-'+i).value}));
 const notes={
 'nota-contatos':contacts.map((c,i)=>'Contato '+(i+1)+': '+(c.nome||'A definir')+' ('+c.relacionamento+')').join('\n'),
 'nota-focos':f1+' ('+r1+'), '+f2+' ('+r2+')',
 'nota-talentos':talent,
 'nota-pertences':a.pertences,
 'nota-poderes':'',
 'nota-gerais':''
 };
 return {
 nome:$('name').value.trim(),idade:$('age').value.trim(),arquetipo:a.nome,verdade1:$('truth-one').value.trim(),verdade2:$('truth-two').value.trim(),
 background:$('background').value.trim(),creation:{stage:step,bonusSkill:bonus,styles:[s1,s2],talent,focus:[{nome:f1,valor:r1},{nome:f2,valor:r2}],contacts},
 stressAtual:'0',stressMax:String(skills.find(x=>x.label==='Sobreviver').value),
 momentum:'0',void:'3',skills,styles,notas:notes
 };
}
async function persist(ready){
 if(saving)return;
 let sheet;try{sheet=buildSheet();if(ready){validateStage2();if(!sheet.background)throw Error('Escreva o background para concluir o personagem.')}}catch(e){$('message').textContent=e.message;$('message').className='error';if(ready&&step===3){$('message').textContent=e.message+' Revise as etapas anteriores.'}return}
 saving=true;$('draft').disabled=true;$('finish').disabled=true;
 try{
 const payload={owner_id:user.id,name:sheet.nome||'Personagem em criação',archetype:sheet.arquetipo,sheet,creation_status:ready?'ready':'draft'};
 const q=entryId?db.from('dh_characters').update({name:payload.name,archetype:payload.archetype,sheet:payload.sheet,creation_status:payload.creation_status}).eq('id',entryId).eq('owner_id',user.id):db.from('dh_characters').insert(payload);
 const {data,error}=await q.select('id').single();if(error)throw Error(error.message);
 entryId=data.id;$('message').className='status';$('message').textContent=ready?'Personagem concluído!':'Rascunho salvo com sucesso!';
 location.href='personagem.html?id='+encodeURIComponent(entryId);
 }catch(e){$('message').className='error';$('message').textContent='Falha ao salvar: '+e.message}
 finally{saving=false;$('draft').disabled=false;updateReady()}
}
$('archetype').addEventListener('change',updateArchetype);
for(const id of ['bonus-skill','first-style','second-style'])$(id).addEventListener('change',benefitRows);
for(const id of ['rank-one','rank-two'])$(id).addEventListener('input',updateFocus);
for(const id of ['background','name','truth-one','truth-two'])$(id).addEventListener('input',updateReady);
$('next').addEventListener('click',()=>{
 try{if(step===1)validateStage1();if(step===2)validateStage2();setStep(Math.min(3,step+1))}catch(e){$('message').textContent=e.message;$('message').className='error'}
});
$('previous').addEventListener('click',()=>setStep(Math.max(1,step-1)));
$('draft').addEventListener('click',()=>persist(false));
$('finish').addEventListener('click',()=>persist(true));
for(const b of document.querySelectorAll('[data-step]'))b.addEventListener('click',()=>{
 const n=Number(b.dataset.step);
 if(n<step)setStep(n);
 else if(n===step)return;
 else{$('next').click()}
});
try{user=await getAuth();options($('archetype'),archetypes.map(x=>x.nome));updateArchetype();updateFocus();setStep(1);await resumeDraft();initialized=true}catch(e){$('message').textContent=e.message;$('message').className='error'}
