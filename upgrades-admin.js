import {UPGRADES,GAME_LABELS,UPGRADE_GROUPS} from './equipment-upgrades.js?v=wiki2';
const $=id=>document.getElementById(id);
const filtered=()=>UPGRADES.filter(u=>!u.legacy && (!$('upgrade-game').value||u.game===$('upgrade-game').value) && (!$('upgrade-group').value||u.type===$('upgrade-group').value) && [u.name,u.effect,GAME_LABELS[u.game]||''].join(' ').toLocaleLowerCase('pt-BR').includes($('upgrade-search').value.toLocaleLowerCase('pt-BR').trim()));
function render(){
 const root=$('upgrade-catalog-list');root.replaceChildren();
 const all=filtered();$('upgrade-count').textContent=all.length+' melhoria(s) encontrada(s)';
 if(!all.length){const p=document.createElement('p');p.textContent='Nenhuma melhoria corresponde aos filtros.';root.append(p);return}
 const selectedIds=new Set(all.map(u=>u.id));
 for(const u of all){
  const card=document.createElement('article');card.className='upgrade-catalog-card';
  const title=document.createElement('h3');title.textContent=u.name;
  const details=document.createElement('div');details.className='upgrade-catalog-meta';
  const badge=document.createElement('span');badge.textContent=GAME_LABELS[u.game]+' · '+(UPGRADE_GROUPS[u.type]||u.type);
  const cost=document.createElement('span');cost.textContent=u.cost+' moedas (jogo)';
  details.append(badge,cost);
  const effect=document.createElement('p');effect.textContent=u.effect;
  card.append(title,details,effect);
  if(u.requires.length){
   const req=document.createElement('p');req.className='upgrade-requirements';
   req.textContent='Melhorias pré-requisito: '+u.requires.map(id=>UPGRADES.find(x=>x.id===id)?.name||id).join(', ');card.append(req);
  }
  if(u.name.startsWith('Obra-prima:')){const x=document.createElement('small');x.textContent='Obra-prima: variante exclusiva, escolha uma por família de equipamento. Alguns modelos pertencem a Corvo ou Emily.';card.append(x)}
  root.append(card);
 }
}
for(const [value,label] of Object.entries(GAME_LABELS)){if(value==='Casa')continue;const option=document.createElement('option');option.value=value;option.textContent=label;$('upgrade-game').append(option)}
for(const [value,label] of Object.entries(UPGRADE_GROUPS)){const option=document.createElement('option');option.value=value;option.textContent=label;$('upgrade-group').append(option)}
['upgrade-game','upgrade-group','upgrade-search'].forEach(id=>$(id).addEventListener(id==='upgrade-search'?'input':'change',render));
$('upgrade-clear').addEventListener('click',()=>{$('upgrade-game').value='';$('upgrade-group').value='';$('upgrade-search').value='';render()});
render();
