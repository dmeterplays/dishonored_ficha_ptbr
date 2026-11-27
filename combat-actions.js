/* Ataques e ações de Dishonored: configurações pessoais + armas e poderes reconhecidos pelo catálogo.
 * Dano é fixo conforme o livro, não há segunda rolagem de dano. */
const clean=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n};
export const skillNames=['Lutar','Mover','Estudar','Sobreviver','Falar','Consertar'];
export const styleNames=['Ousadamente','Cuidadosamente','Habilmente','Forçosamente','Silenciosamente','Rapidamente'];
export const normalizeAction=action=>({
 id:String(action.id||'custom:'+crypto.randomUUID()),name:String(action.name||'').trim().slice(0,150),
 source:['item','power','custom'].includes(action.source)?action.source:'custom',
 sourceId:action.sourceId||null,sourceName:action.sourceName||null,
 skill:action.skill||'Lutar',style:action.style||'Ousadamente',focus:action.focus||'',
 damage:Math.max(0,Math.min(100,Number(action.damage)||0)),
 bonus:Math.max(-20,Math.min(20,Number(action.bonus)||0)),
 voidCost:Math.max(0,Math.min(20,Number(action.voidCost)||0))
});
export function catalogActions(sheet,catalog,extraOwned=[]){
 const owned=[...(sheet?.gmInventory||[]).filter(x=>Number(x.quantity)>0).map(x=>x.name),...extraOwned];
 const sources=[...(sheet?.catalogSelections?.power||[]).map(x=>x.name).filter(Boolean)];
 const list=[];
 // Um inventário como "Besta de pulso" deve corresponder à arma mais específica,
 // não gerar também uma segunda ação genérica chamada "Besta".
 const damageItems=(catalog||[]).filter(x=>x.category==='item'&&
  x.rules?.dano!=null&&Number.isFinite(Number(x.rules.dano))&&Number(x.rules.dano)>0);
 const bestItemIds=new Set();
 for(const ownedName of owned){
  const matches=damageItems.filter(x=>clean(ownedName)===clean(x.name)||
   clean(ownedName).startsWith(clean(x.name)+' '));
  matches.sort((a,b)=>clean(b.name).length-clean(a.name).length);
  if(matches.length)bestItemIds.add(matches[0].id);
 }
 for(const record of catalog||[]){
  const rules=record.rules||{},name=String(record.name||'');
  if(record.category==='item'){
   if(!Number.isFinite(Number(rules.dano))||rules.dano==null||Number(rules.dano)<=0)continue;
   if(!bestItemIds.has(record.id))continue;
   const ranged=/pistola|rifle|besta|arco|granada|revolver|revólver|bomba/i.test(name);
   list.push(normalizeAction({id:'item:'+record.id,name,source:'item',sourceId:record.id,sourceName:name,
    skill:'Lutar',style:ranged?'Cuidadosamente':'Ousadamente',damage:Number(rules.dano)}));
  }else if(record.category==='power'){
   if(/passivo/i.test(rules.tipo||''))continue;
   if(!sources.some(x=>clean(x)===clean(name)||clean(x).startsWith(clean(name)+' -')))continue;
   list.push(normalizeAction({id:'power:'+record.id,name,source:'power',sourceId:record.id,sourceName:name,
    skill:'Falar',style:'Forçosamente',damage:Number(rules.dano)||0,voidCost:Number(rules.custo_vazio)||0}));
  }
 }
 return list;
}
export function allActions(sheet,catalog,extraOwned=[]){
 const saved=(Array.isArray(sheet?.combatActions)?sheet.combatActions:[]).filter(x=>x&&x.id&&x.name).map(normalizeAction);
 const seen=new Set(saved.map(x=>x.id));
 for(const auto of catalogActions(sheet,catalog,extraOwned))if(!seen.has(auto.id)){saved.push(auto);seen.add(auto.id)}
 return saved;
}
export function mountActionEditor({root,sheet,catalog=[],onChange=()=>{},getFocuses=()=>[]}){
 let actions=(Array.isArray(sheet.combatActions)?structuredClone(sheet.combatActions):[]).map(normalizeAction);
 let records=catalog;let selectedId='',extraOwned=[],extraPowers=[];
 const current=()=>allActions({...sheet,combatActions:actions,
  catalogSelections:{...(sheet.catalogSelections||{}),
   power:[...(sheet.catalogSelections?.power||[]),...extraPowers.map(name=>({name}))]}},records,extraOwned);
 function tell(message,bad=false){
  const node=root.querySelector('.combat-editor-status');node.textContent=message;node.classList.toggle('error',bad);
 }
 function field(parent,label,control){const wrap=el('div');const lab=el('label',label);wrap.append(lab,control);parent.append(wrap);return control}
 function input(type,value){const n=el('input');n.type=type;n.value=String(value??'');return n}
 function select(values,value){const n=el('select');for(const [v,t] of values){const o=el('option',t);o.value=v;n.append(o)}n.value=value||'';return n}
 function draw(){
  root.replaceChildren();
  const intro=el('p','Os ataques fazem um teste de acerto 2d20. Ao acertar, aplicam dano fixo + bônus, sem rolagem extra. Armas do inventário e poderes ativos do catálogo aparecem automaticamente.','small');root.append(intro);
  const list=el('div',null,'combat-action-list'),data=current();
  if(!data.length)list.append(el('p','Nenhuma ação ainda. Crie uma ou equipe uma arma.','small'));
  for(const action of data){
   const card=el('div',null,'combat-action-card');
   const info=el('div',null,'combat-action-card-info');
   info.append(el('strong',action.name));
   info.append(el('small',action.skill+' + '+action.style+' · Dano '+action.damage+(action.bonus?' '+(action.bonus>0?'+':'')+action.bonus:'')+(action.voidCost?' · Vazio '+action.voidCost:'')));
   const edit=el('button','Configurar','secondary');edit.type='button';edit.addEventListener('click',()=>{selectedId=action.id;draw()});
   card.append(info,edit);list.append(card);
  }
  root.append(list);
  const accordion=el('details',null,'combat-action-accordion');
  const summary=el('summary','+ Adicionar ataque personalizado');
  accordion.append(summary);
  root.append(accordion);
  const status=el('p','','combat-editor-status');root.append(status);
  const panel=el('div',null,'combat-action-form');
  panel.append(el('h3',selectedId?'Configurar ataque / ação':'Adicionar ataque personalizado'));
  let action=data.find(x=>x.id===selectedId)||normalizeAction({id:'custom:new',name:'',source:'custom',skill:'Lutar',style:'Ousadamente'});
  const fields=el('div',null,'combat-action-fields');
  const name=field(fields,'Nome',input('text',action.name));name.maxLength=150;
  const skill=field(fields,'Perícia para acerto',select(skillNames.map(x=>[x,x]),action.skill));
  const style=field(fields,'Estilo para acerto',select(styleNames.map(x=>[x,x]),action.style));
  const focus=field(fields,'Foco opcional',select([['','Sem foco'],...getFocuses().filter(x=>x?.name).map(x=>[x.name,x.name+' ('+x.rank+')'])],action.focus));
  const damage=field(fields,action.source==='item'?'Dano base do catálogo':'Dano fixo',input('number',action.damage));damage.min=0;damage.max=100;damage.disabled=action.source!=='custom';
  const bonus=field(fields,'Bônus de dano',input('number',action.bonus));bonus.min=-20;bonus.max=20;
  const cost=field(fields,'Custo em Vazio',input('number',action.voidCost));cost.min=0;cost.max=20;cost.disabled=action.source!=='custom';
  panel.append(fields);
  if(action.source==='power'||action.source==='item')panel.append(el('p','Dano base e custo de Vazio são definidos pelo catálogo. Você pode escolher perícia, estilo, foco e bônus.','small'));
  const buttons=el('div',null,'combat-action-buttons');
  const save=el('button',selectedId?'Salvar configuração':'+ Adicionar ataque');save.type='button';
  save.addEventListener('click',()=>{
   const newName=name.value.trim(),vDamage=Number(damage.value),vBonus=Number(bonus.value),vCost=Number(cost.value);
   if(!newName||newName.length>150){tell('Dê um nome ao ataque.',true);return}
   if(![vDamage,vBonus,vCost].every(Number.isInteger)||vDamage<0||vDamage>100||vBonus < -20||vBonus>20||vCost<0||vCost>20){tell('Confira os valores de dano, bônus e Vazio.',true);return}
   const edit={...action,id:action.id==='custom:new'?'custom:'+crypto.randomUUID():action.id,name:newName,
    skill:skill.value,style:style.value,focus:focus.value,damage:vDamage,bonus:vBonus,voidCost:vCost};
   const idx=actions.findIndex(x=>x.id===edit.id);
   if(idx>=0)actions[idx]=edit;else actions.push(edit);
   selectedId='';onChange();draw();tell('Ação configurada. Salve a ficha para registrar.');
  });
  buttons.append(save);
  {
   const cancel=el('button','Cancelar','secondary');cancel.type='button';cancel.addEventListener('click',()=>{selectedId='';draw()});buttons.append(cancel);
  }
  if(selectedId){
   if(action.source==='custom'){
    const remove=el('button','Remover ataque','secondary');remove.type='button';
    remove.addEventListener('click',()=>{actions=actions.filter(x=>x.id!==selectedId);selectedId='';onChange();draw()});buttons.append(remove);
   }else{
    const reset=el('button','Usar padrão','secondary');reset.type='button';
    reset.addEventListener('click',()=>{actions=actions.filter(x=>x.id!==selectedId);selectedId='';onChange();draw()});buttons.append(reset);
   }
  }
  panel.append(buttons);
  if(selectedId){root.append(panel)}else{accordion.append(panel)}
 }
 draw();
 return {getActions:()=>structuredClone(actions),setCatalog:(next)=>{records=next||[];draw()},
 setOwned:({items=[],powers=[]}={})=>{extraOwned=items;extraPowers=powers;draw()},
 refresh:()=>draw()};
}
