(()=>{
'use strict';
/* Your own drum sounds. A dropped file is decoded once and kept in IndexedDB, so it is still there
   tomorrow; a project file carries the bytes along, a link carries only the name. */
const Z=window.Z;
const DB='zinth',STORE='samples';
function db(){return new Promise((res,rej)=>{if(!window.indexedDB)return rej(new Error('no IndexedDB'));const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function put(id,rec){const d=await db();return new Promise((res,rej)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).put(rec,id);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
async function get(id){const d=await db();return new Promise((res,rej)=>{const t=d.transaction(STORE,'readonly'),q=t.objectStore(STORE).get(id);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}
const b64=ab=>{let s='';const u=new Uint8Array(ab);for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
const unb64=s=>{const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<u.length;i++)u[i]=bin.charCodeAt(i);return u.buffer};
let scratch=null;
function decode(ab){const ctx=Z.engine.ctx||scratch||(scratch=new (window.AudioContext||window.webkitAudioContext)());return ctx.decodeAudioData(ab.slice(0))}
const newId=()=>'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
// bring a File in: keep its bytes, decode it, hand back everything the engine and the project need
async function importFile(file){
  const ab=await file.arrayBuffer(),id=newId(),buffer=await decode(ab);
  try{await put(id,{name:file.name,data:ab,type:file.type||''})}catch(e){}
  return {id,name:file.name,buffer,data:ab};
}
// bring stored bytes in (from a project file): keep them under their own id, decode them
async function importBytes(id,name,ab){const buffer=await decode(ab);try{await put(id,{name,data:ab,type:''})}catch(e){}return {id,name,buffer,data:ab}}
async function load(id){try{const rec=await get(id);if(!rec)return null;return {id,name:rec.name,buffer:await decode(rec.data),data:rec.data}}catch(e){return null}}
Object.assign(Z,{samples:{importFile,importBytes,load,get,put,b64,unb64}});
})();
