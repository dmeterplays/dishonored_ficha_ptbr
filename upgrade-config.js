import {UPGRADES,itemType} from './equipment-upgrades.js?v=wiki4';
const baseMap=new Map(UPGRADES.map(x=>[x.id,x]));
// Valores base para melhorias com expansão explícita de munição.
// São efeitos de inventário do RPG, não alterações automáticas de rolagens.
const defaultCapacityBonus=(u)=>{
 if(!u)return 0;
 const id=u.id;
 if(/^d[12]-pistol-mag[123]$/.test(id))return 1;
 if(/^d2-(?:bolt|bullet)-storage[12]$/.test(id))return 5;
 if(/^doto-grenade-cap[12]$/.test(id)||id==='d2-razor-storage'||id==='doto-mine-cap')return 2;
 if(/^doto-voltaic-cap[12]$/.test(id))return 5;
 if(id==='d1-pistol-mag1'||id==='d1-pistol-mag2'||id==='d1-pistol-mag3')return 1;
 if(id==='pistol-mag-1'||id==='pistol-mag-2'||id==='pistol-mag-3')return 1;
 return 0;
};
export function mergedUpgrade(id,configs=[]){
 const base=baseMap.get(id);if(!base)return null;
 const config=Array.isArray(configs)?configs.find(x=>x.upgrade_id===id):configs[id];
 return {...base,...(config?{name:config.name,effect:config.effect,cost:config.price,capacity_bonus:config.capacity_bonus||0,rule_note:config.rule_note||'',item_ids:config.item_ids,enabled:config.enabled,bonus_skill:config.bonus_skill,bonus_style:config.bonus_style,bonus_value:config.bonus_value}:{}),
  capacity_bonus:config?.capacity_bonus??defaultCapacityBonus(base),rule_note:config?.rule_note||'',item_ids:config?.item_ids??null,enabled:config?.enabled??true,bonus_skill:config?.bonus_skill||'',bonus_style:config?.bonus_style||'',bonus_value:config?.bonus_value||0};
}
export function compatibleUpgrade(item,upgrade){
 if(!upgrade||upgrade.enabled===false||upgrade.hidden)return false;
 if(Array.isArray(upgrade.item_ids))return !!item.catalog_id&&upgrade.item_ids.includes(item.catalog_id);
 return itemType(item.name)===upgrade.type;
}
export function installedUpgradeIds(item){
 return (Array.isArray(item.upgrades)?item.upgrades:[]).map(v=>typeof v==='string'?v:v?.id).filter(Boolean);
}
export function activeUpgradeEffects(item,activeRows,configs){
 const installed=new Set(installedUpgradeIds(item));
 const active=(activeRows||[]).filter(row=>row.item_id===item.id&&row.active&&installed.has(row.upgrade_id));
 const upgrades=active.map(row=>mergedUpgrade(row.upgrade_id,configs)).filter(u=>u&&compatibleUpgrade(item,u));
 return {upgrades,capacityBonus:upgrades.reduce((sum,u)=>sum+Number(u.capacity_bonus||0),0),testBonuses:upgrades.filter(u=>(u.bonus_skill||u.bonus_style)&&u.bonus_value).map(u=>({skill:u.bonus_skill,style:u.bonus_style,value:u.bonus_value,name:u.name}))};
}
