import {archetypes,talentGroups,powers,bonecharms,items,skills,styles} from './catalogo-dados.js';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';
const $=id=>document.getElementById(id);
const page=document.body.dataset.page||'arquetipos';
const labels={arquetipos:'Arquétipos',amuletos:'Amuletos de osso',poderes:'Poderes do Vazio',pericias:'Perícias e estilos',loja:'Loja de itens'};
const urls={arquetipos:'arquetipos.html',amuletos:'amuletos.html',poderes:'poderes.html',pericias:'pericias.html',loja:'loja.html'};
const intro={
 arquetipos:'Os 13 arquétipos do capítulo 5, com bônus de criação, focos sugeridos, equipamentos iniciais, contatos e os quatro talentos disponíveis para cada um.',
 amuletos:'Poderes comuns, aprimorados e desvantagens de amuletos corrompidos, segundo o capítulo 7. Amuletos não são automaticamente vendidos na loja.',
 poderes:'Poderes ativos concedidos pela Marca do Estranho e aprimoramentos passivos. Os custos abaixo são de utilização em Pontos do Vazio, não preços em moeda.',
 pericias:'As seis perícias, seis estilos e custos de evolução do sistema 2d20. Testes combinam uma perícia com um estilo.',
 loja:'Equipamentos com preços base, efeitos e características descritos no capítulo 6 do livro. Os valores podem ser ajustados pelo administrador.'
};
const nav=$('catalog-nav');
for(const [key,label] of Object.entries(labels)){const a=document.createElement('a');a.href=urls[key];a.textContent=label;if(page===key){a.className='active';a.setAttribute('aria-current','page')}nav.appendChild(a)}
$('heading').textContent=labels[page]||'Catálogo';$('intro').textContent=intro[page]||'';
let entries=[];
const make=(tag,text,cls)=>{const el=document.createElement(tag);el.textContent=text??'';if(cls)el.className=cls;return el;};
function line(card,label,value){const p=make('div','', 'statline');p.append(make('strong',label+': '),document.createTextNode(value));card.appendChild(p)}
function cardBase(name,badge){const card=make('article','', 'card');card.append(make('span',badge,'pill'),make('h2',name));return card}
const talentData=Object.entries(talentGroups).flatMap(([archetype,talents])=>talents.map(([name,description])=>({archetype,name,description})));
if(page==='arquetipos')entries=archetypes;
else if(page==='amuletos')entries=bonecharms;
else if(page==='poderes')entries=powers;
else if(page==='pericias')entries=[...skills.map(x=>({...x,tipo:'Perícia'})),...styles.map(x=>({...x,tipo:'Estilo'}))];
else if(page==='loja')entries=items;
const filter=$('category-filter');
const types=page==='amuletos'?[...new Set(entries.map(e=>e.tipo))]:page==='poderes'?[...new Set(entries.map(e=>e.tipo))]:page==='pericias'?['Perícia','Estilo']:page==='loja'?[...new Set(entries.map(e=>e.categoria))]:[];
if(types.length){for(const type of types){const o=make('option',type);o.value=type;filter.appendChild(o)}}else filter.style.display='none';
const matches=(entry,q,cat)=>{const text=JSON.stringify(entry).toLocaleLowerCase('pt-BR');const t=(entry.tipo||entry.categoria||'');return (!cat||cat===t)&&(!q||text.includes(q.toLocaleLowerCase('pt-BR')))};
function render(){
 const root=$('results');root.replaceChildren();
 const q=$('search').value.trim(),cat=filter.value;
 const visible=entries.filter(x=>matches(x,q,cat));
 $('count').textContent=visible.length+' resultado'+(visible.length===1?'':'s');
 if(!visible.length){root.append(make('div','Nenhum resultado para os filtros selecionados.','empty'));return;}
 for(const e of visible){
 let card;
 if(page==='arquetipos'){
 card=cardBase(e.nome,'Arquétipo • pág. '+e.pagina);
 line(card,'Perícias iniciais',e.pericias);line(card,'Estilos iniciais',e.estilos);line(card,'Focos sugeridos',e.focos);
 line(card,'Equipamento inicial',e.pertences);line(card,'Contatos',e.contatos);
 const info=make('p','Na criação, escolha 2 focos e distribua 8 pontos entre eles, segundo as regras gerais do arquétipo. Escolha também 1 dos talentos abaixo.');
 card.append(info);
 const det=make('details');const sum=make('summary','Ver os 4 talentos e seus efeitos');det.appendChild(sum);
 for(const t of (talentGroups[e.nome]||[])){const div=make('div','','talent');div.append(make('h3',t[0]),make('p',t[1]));det.appendChild(div)}
 card.appendChild(det);
 }else if(page==='amuletos'){
 card=cardBase(e.nome,e.tipo+' • pág. '+e.pagina);card.append(make('p',e.descricao));
 }else if(page==='poderes'){
 card=cardBase(e.nome,e.tipo+' • pág. '+e.pagina);
 if(e.tipo==='Poder ativo')card.append(make('div',e.custo+' Ponto'+(e.custo===1?'':'s')+' do Vazio para usar','price'));
 else card.append(make('div','Passivo • sem custo de uso','price'));
 card.append(make('p',e.descricao));
 }else if(page==='pericias'){
 card=cardBase(e.nome,e.tipo);card.append(make('p',e.descricao));
 card.append(make('p','Valor inicial normal: 4. Avanço de +1 custa 10 XP pelas regras padrão.'));
 }else{
 card=cardBase(e.nome,e.categoria+' • pág. '+e.pagina);
 card.append(make('div',e.preco.toLocaleString('pt-BR')+' moedas','price'));
 if(e.dano!==null)line(card,'Dano',String(e.dano));
 card.append(make('p',e.descricao));
 }
 root.appendChild(card);
 }
}
$('search').addEventListener('input',render);filter.addEventListener('change',render);
render();
async function loadOverrides(){
 if(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY)return;
 try{
 const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
 const {data:{user}}=await db.auth.getUser();if(!user)return;
 const {data:records,error}=await db.from('dh_catalog').select('category,name,archetype,description,xp_cost,coins_cost,published');
 if(error)return;
 for(const record of records||[]){
 if(!record.published)continue;
 if(page==='loja'&&record.category==='item'){
 const existing=entries.find(x=>x.nome.toLowerCase()===record.name.toLowerCase());
 if(existing){if(record.coins_cost!==null)existing.preco=record.coins_cost;if(record.description)existing.descricao=record.description;}
 else if(record.coins_cost!==null)entries.push({nome:record.name,preco:record.coins_cost,descricao:record.description,categoria:'Itens personalizados',pagina:'Regra da campanha',dano:null});
 }
 if(page==='amuletos'&&record.category==='bonecharm'&&!entries.some(x=>x.nome===record.name))entries.push({nome:record.name,descricao:record.description,tipo:'Personalizado',pagina:'Campanha'});
 if(page==='poderes'&&record.category==='power'&&!entries.some(x=>x.nome===record.name))entries.push({nome:record.name,descricao:record.description,tipo:'Personalizado',custo:0,pagina:'Campanha'});
 }
 render();
 }catch(e){/* versão estática preservada quando a rede não está disponível */ }
}
loadOverrides();
