import {UPGRADES,itemType} from './equipment-upgrades.js?v=wiki3';
const baseMap=new Map(UPGRADES.map(x=>[x.id,x]));
export function mergedUpgrade(id,configs=[]){
 const base=baseMap.get(id);if(!base)return null;
 const config=Array.isArray(configs)?configs.find(x=>x.upgrade_id===id):configs[id];
 return {...base,...(config?{name:config.name,effect:config.effect,cost:config.price,capacity_bonus:config.capacity_bonus||0,rule_note:config.rule_note||'',item_ids:config.item_ids,enabled:config.enabled}:{}),
  capacity_bonus:config?.capacity_bonus||0,rule_note:config?.rule_note||'',item_ids:config?.item_ids??null,enabled:config?.enabled??true};
}
export function compatibleUpgrade(item,upgrade){
 if(!upgrade||upgrade.enabled===false)return false;
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
 return {upgrades,capacityBonus:upgrades.reduce((sum,u)=>sum+Number(u.capacity_bonus||0),0)};
}
