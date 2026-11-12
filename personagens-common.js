import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';
export const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
export const el=(tag,txt,klass)=>{const x=document.createElement(tag);if(txt!==undefined&&txt!==null)x.textContent=String(txt);if(klass)x.className=klass;return x};
export const cleanString=x=>String(x??'').trim();
export const validSheet=d=>d&&typeof d==='object'&&!Array.isArray(d)&&typeof d.nome==='string'&&Array.isArray(d.skills)&&d.skills.length>0&&Array.isArray(d.styles)&&d.styles.length>0&&d.skills.every(x=>x&&typeof x.label==='string'&&Number.isFinite(Number(x.value)))&&d.styles.every(x=>x&&typeof x.label==='string'&&Number.isFinite(Number(x.value)));
export async function getAuth(){const {data:{user},error}=await db.auth.getUser();if(error||!user){window.location.assign('campanha.html');throw Error('Faça login para continuar.')}return user}
export function localJSON(ch){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify(ch,null,2)],{type:'application/json'}));a.href=url;a.download='ficha_dishonored_'+cleanString(ch.nome||'personagem').replace(/[^a-z0-9_-]/gi,'_')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
export async function portraitURL(path){if(!path)return null;const {data,error}=await db.storage.from('dh-portraits').createSignedUrl(path,3600);return error?null:data.signedUrl;}
export function placeholder(name){return cleanString(name).slice(0,1).toUpperCase()||'✧'}
export function imageFor(ch){const box=el('div',null,'portrait');box.append(el('span',placeholder(ch.name),'placeholder'));if(ch.portrait_path)portraitURL(ch.portrait_path).then(url=>{if(!url)return;const img=el('img');img.alt='Retrato de '+ch.name;img.src=url;box.replaceChildren(img)});return box}
