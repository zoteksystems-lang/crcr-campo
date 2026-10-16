// Persistencia local — IndexedDB para todo (estado + audio + fotos + historial).
// Nada de esto sale del dispositivo; es la base para que "automático" no se
// pierda si se cierra la pestaña o se cae la batería en pleno servicio.
const DB_NAME='crcr_campo';
const DB_VERSION=1;
const STORES=['estado','grabaciones','historial'];

let dbPromise=null;
function openDB(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      STORES.forEach(s=>{ if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'id'}); });
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  return dbPromise;
}

async function tx(storeName, mode, fn){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const t=db.transaction(storeName, mode);
    const store=t.objectStore(storeName);
    const result=fn(store);
    t.oncomplete=()=>resolve(result);
    t.onerror=()=>reject(t.error);
  });
}

export async function guardarEstado(id, data){
  return tx('estado','readwrite',store=>store.put({id, data, ts:Date.now()}));
}
export async function cargarEstado(id){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction('estado','readonly').objectStore('estado').get(id);
    req.onsuccess=()=>resolve(req.result?req.result.data:null);
    req.onerror=()=>reject(req.error);
  });
}

export async function guardarGrabacion(rec){
  return tx('grabaciones','readwrite',store=>store.put(rec));
}
export async function borrarGrabacion(id){
  return tx('grabaciones','readwrite',store=>store.delete(id));
}
// Pide al navegador que no borre las grabaciones aunque falte espacio.
export async function pedirAlmacenamientoPersistente(){
  try{return navigator.storage?.persist?await navigator.storage.persist():false;}catch{return false;}
}
export async function listarGrabaciones(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction('grabaciones','readonly').objectStore('grabaciones').getAll();
    req.onsuccess=()=>resolve(req.result||[]);
    req.onerror=()=>reject(req.error);
  });
}

export async function archivarIncidente(boletaSnapshot){
  const registro={id:'inc_'+Date.now(), ts:Date.now(), boleta:boletaSnapshot};
  await tx('historial','readwrite',store=>store.put(registro));
  return registro;
}
export async function listarHistorial(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction('historial','readonly').objectStore('historial').getAll();
    req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>b.ts-a.ts));
    req.onerror=()=>reject(req.error);
  });
}

export function debounce(fn, ms){
  let h=null;
  return (...args)=>{ clearTimeout(h); h=setTimeout(()=>fn(...args), ms); };
}
