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
function line(card,label,value){labeled(card,label,value)}
function cardBase(name,badge){const card=make('article','', 'card');card.append(make('span',badge,'pill'),make('h2',name));return card}

const translations={
'Footwork':'Jogo de pés','Self-made':'Por conta própria','Fieldcraft':'Conhecimento de campo','Forager':'Coletor','Trapper':'Armadilheiro','Surveyor':'Agrimensor','Rally':'Reagrupar','Marketeer negro':'Comerciante do mercado negro',
'March of the Brave':'Marcha dos Bravos','Cautious Tune':'Melodia Cautelosa','Nil Whispers':'Sussurros do Nada','Stinging Whistle':'Assobio Cortante','Darkened Edges':'Bordas Escurecidas',
'Rock\'s Rumble':'Estrondo da Rocha','Void\'s Seedling':'Semente do Vazio','Wrathful Scream':'Grito Furioso','Song of Inspiration':'Canção da Inspiração','Kinseeker':'Buscador de Parentes','Arpejo rápido':'Arpejo Rápido','Chamado do Camaleão':'Chamado do Camaleão','Blink':'Piscar',
'Into the Void':'No Vazio','Vazio':'Vazio'};
const translateName=name=>translations[name]||name;
const glossary={
'Bagunçado':{short:'Arma barulhenta ou destrutiva',detail:'Qualidade de arma: é barulhenta, extremamente destrutiva ou deixa muita bagunça. Sempre que atacar com uma arma com essa qualidade, acrescente 1 ponto ao Caos do mestre. O Caos é gerado pelo ataque, mesmo que ele não acerte.',source:'Livro, capítulo 6, pág. 84'},
'Dano':{short:'Estresse provocado ao acertar',detail:'O valor de dano indica quanto estresse um ataque bem-sucedido inflige na trilha de estresse do alvo. Proteção e outras regras podem modificar o resultado.',source:'Livro, capítulo 6, pág. 83'},
'Corpo a corpo':{short:'Ataque em distância de contato',detail:'A arma é usada contra inimigos ao alcance corporal, isto é, próximos o bastante para se atingir fisicamente.',source:'Livro, capítulo 6, pág. 84'},
'Alcance (próximo)':{short:'Somente alvos próximos',detail:'Permite atirar em qualquer alvo visível que esteja perto, mas não em alvos distantes.',source:'Livro, capítulo 6, pág. 84'},
'Alcance (distante)':{short:'Próximo ou distante, com penalidade',detail:'Permite atirar em um alvo visível próximo. Para atingir um alvo distante, a dificuldade do ataque aumenta em 1.',source:'Livro, capítulo 6, pág. 84'},
'Desajeitado':{short:'Difícil de manejar',detail:'Uma arma desajeitada aumenta em 1 a dificuldade de todo ataque feito com ela.',source:'Livro, capítulo 6, pág. 83'},
'Perfuração de armadura':{short:'Ignora benefício de armadura',detail:'Os alvos não se beneficiam de Verdades ou benefícios concedidos pela armadura contra esse ataque.',source:'Livro, capítulo 6, pág. 83'},
'Explosão':{short:'Pode atingir vários alvos',detail:'A arma pode afetar múltiplos alvos. O mestre decide quantos podem ser atingidos e se isso aumenta a dificuldade.',source:'Livro, capítulo 6, pág. 83'},
'Queimadura':{short:'Provoca a Verdade Em chamas',detail:'O alvo recebe a Verdade situacional “Em chamas”. Segundo o livro, ele morrerá no início do turno seguinte caso não consiga extinguir o fogo rapidamente.',source:'Livro, capítulo 6, pág. 84'},
'Mina':{short:'Armadilha acionada por proximidade',detail:'A arma é colocada em uma superfície e dispara quando alguém se aproxima.',source:'Livro, capítulo 6, pág. 84'},
'Proteção':{short:'Reduz o impacto dos ataques',detail:'Valor de proteção fornecido por armaduras e outros itens. Sua aplicação depende das regras de defesa e das qualidades de cada arma.',source:'Livro, capítulo 6'},
'Perícia':{short:'O que seu personagem sabe fazer',detail:'Lutar, Mover, Estudar, Sobreviver, Falar e Consertar. Para um teste, escolha uma perícia e um estilo; some seus valores para obter o número-alvo.',source:'Livro, regras 2d20'},
'Estilo':{short:'Como seu personagem age',detail:'Os estilos representam a abordagem do personagem: Ousadamente, Cuidadosamente, Habilmente, Forçosamente, Silenciosamente e Rapidamente. É combinado com a perícia em cada teste.',source:'Nomenclatura usada na ficha do site'},
'Foco':{short:'Especialidade dentro de uma perícia',detail:'Representa uma especialização específica. Quando aplicável, resultados dos dados iguais ou menores que sua classificação de foco produzem dois sucessos.',source:'Livro, regras 2d20'},
'Momentum':{short:'Recurso gerado por sucessos extras',detail:'Sucessos acima da dificuldade podem gerar Momentum. Ele pode ser gasto para obter vantagens, comprar dados e ativar efeitos conforme as regras e o critério do mestre.',source:'Livro, regras 2d20'},
'Caos':{short:'Recurso gerenciado pelo mestre',detail:'O mestre utiliza Caos para representar complicações e consequências. Algumas armas, como as que têm a qualidade Bagunçado, geram Caos sempre que são usadas para atacar.',source:'Livro, regras 2d20 e capítulo 6'},
'Pontos do Vazio':{short:'Recurso para habilidades sobrenaturais',detail:'Usados para ativar poderes sobrenaturais e outras habilidades relacionadas ao Vazio. O custo depende do poder e de suas condições.',source:'Livro, capítulo 7'},
'Arquétipo':{short:'Origem e aptidões do personagem',detail:'Determina bônus iniciais de perícias e estilos, escolhas de focos, talentos, equipamentos e contatos. Os talentos são escolhidos entre os oferecidos pelo arquétipo.',source:'Livro, capítulo 5'},
'Verdade':{short:'Fato relevante na história ou cena',detail:'Uma Verdade registra uma condição que altera a ficção e pode influenciar testes e consequências. Pode ser pessoal, situacional ou ligada ao ambiente.',source:'Livro, regras 2d20'},
'XP':{short:'Experiência gasta em avanços',detail:'Pontos de experiência são gastos entre aventuras para evoluir perícias, estilos, focos, talentos e o máximo de Vazio. O custo varia de acordo com o avanço.',source:'Livro, capítulo 5'}
};
let dialog;
function helpButton(term){
 const b=make('button','?','help-button');b.type='button';b.title='O que significa '+term+'?';b.setAttribute('aria-label','Explicar '+term);
 b.addEventListener('click',()=>openHelp(term));return b;
}
function openHelp(term){
 const info=glossary[term];if(!info)return;
 if(!dialog){dialog=document.createElement('dialog');dialog.className='glossary-dialog';
 const wrap=make('div','','glossary-body');dialog.appendChild(wrap);document.body.appendChild(dialog);
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});}
 const wrap=dialog.firstElementChild;wrap.replaceChildren();
 const top=make('div','','glossary-top');top.append(make('h2',term));
 const close=make('button','Fechar','secondary');close.type='button';close.addEventListener('click',()=>dialog.close());top.append(close);
 wrap.append(top,make('p',info.short,'glossary-short'),make('p',info.detail),make('small',info.source));
 if(!dialog.open)dialog.showModal();
}
function labeled(card,term,value){
 const row=make('div','','statline');row.append(make('strong',term+': '));
 if(glossary[term])row.append(helpButton(term));
 row.append(document.createTextNode(' '+value));card.appendChild(row);
}
const qualitiesByItem={
'Pistola':['Bagunçado','Alcance (próximo)'],'Rifle':['Bagunçado','Alcance (distante)'],
'Espada':['Corpo a corpo'],'Porrete':['Corpo a corpo','Desajeitado'],'Faca':['Corpo a corpo'],
'Soqueiras':['Corpo a corpo'],'Besta':['Alcance (próximo)'],'Granada':['Explosão','Alcance (próximo)'],
'Granada de poeira sufocante':['Explosão','Alcance (próximo)'],
'Navalha de mola':['Mina'],'Mina de arco':['Mina'],'Dardo sonífero':['Alcance (próximo)']
};
function showQualities(card,item){
 const list=qualitiesByItem[item.nome]||[];
 if(!list.length)return;
 const row=make('div','','qualities');row.append(make('strong','Qualidades: '));
 for(const term of list){const group=make('span','','quality');group.append(make('span',term),helpButton(term));row.appendChild(group)}
 card.appendChild(row);
}

const talentData=Object.entries(talentGroups).flatMap(([archetype,talents])=>talents.map(([name,description])=>({archetype,name,description})));
if(page==='arquetipos')entries=archetypes;
else if(page==='amuletos')entries=bonecharms;
else if(page==='poderes')entries=powers;
else if(page==='pericias')entries=[...skills.map(x=>({...x,tipo:'Perícia'})),...styles.map(x=>({...x,tipo:'Estilo'}))];
else if(page==='loja')entries=items;
const filter=$('category-filter');
const types=page==='amuletos'?[...new Set(entries.map(e=>e.tipo))]:page==='poderes'?[...new Set(entries.map(e=>e.tipo))]:page==='pericias'?['Perícia','Estilo']:page==='loja'?[...new Set(entries.map(e=>e.categoria))]:[];
if(types.length){for(const type of types){const o=make('option',type);o.value=type;filter.appendChild(o)}}else filter.style.display='none';
const matches=(entry,q,cat)=>{const text=(JSON.stringify(entry)+' '+translateName(entry.nome||'')).toLocaleLowerCase('pt-BR');const t=(entry.tipo||entry.categoria||'');return (!cat||cat===t)&&(!q||text.includes(q.toLocaleLowerCase('pt-BR')))};
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
 line(card,'Perícia',e.pericias);line(card,'Estilo',e.estilos.replaceAll('Inteligentemente','Habilmente'));line(card,'Foco',e.focos);
 line(card,'Equipamento inicial',e.pertences);line(card,'Contatos',e.contatos);
 const info=make('p','Na criação, escolha 2 focos e distribua 8 pontos entre eles, segundo as regras gerais do arquétipo. Escolha também 1 dos talentos abaixo.');
 card.append(info);const tip=make('p','Saiba mais: ','muted');for(const term of ['Arquétipo','Foco','XP']){tip.append(document.createTextNode(' '+term+' '),helpButton(term))}card.append(tip);
 const det=make('details');const sum=make('summary','Ver os 4 talentos e seus efeitos');det.appendChild(sum);
 for(const t of (talentGroups[e.nome]||[])){const div=make('div','','talent');div.append(make('h3',translateName(t[0])),make('p',t[1].replaceAll('Inteligentemente','Habilmente')));det.appendChild(div)}
 card.appendChild(det);
 }else if(page==='amuletos'){
 card=cardBase(translateName(e.nome),e.tipo+' • pág. '+e.pagina);card.append(make('p',e.descricao));
 }else if(page==='poderes'){
 card=cardBase(e.nome,e.tipo+' • pág. '+e.pagina);
 if(e.tipo==='Poder ativo'){const cost=make('div','', 'price');cost.append(document.createTextNode(e.custo+' Ponto'+(e.custo===1?'':'s')+' do Vazio para usar '),helpButton('Pontos do Vazio'));card.append(cost)}
 else card.append(make('div','Passivo • sem custo de uso','price'));
 card.append(make('p',e.descricao));
 }else if(page==='pericias'){
 card=cardBase(translateName(e.nome),e.tipo);card.append(make('p',e.descricao));
 card.append(make('p','Valor inicial normal: 4. Avanço de +1 custa 10 XP pelas regras padrão.'));const terms=make('div','','statline');terms.append(document.createTextNode('O que é '+e.tipo+'? '),helpButton(e.tipo));card.append(terms);
 }else{
 card=cardBase(e.nome,e.categoria+' • pág. '+e.pagina);
 card.append(make('div',e.preco.toLocaleString('pt-BR')+' moedas','price'));
 if(e.dano!==null)line(card,'Dano',String(e.dano));showQualities(card,e);
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
