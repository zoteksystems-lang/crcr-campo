// Service Worker — precachea TODO (app + motor Whisper + OCR Tesseract) en la
// primera visita con red, para que después la app funcione 100% sin conexión.
// Subir la versión de CACHE_NAME cuando se publique una actualización real.
const CACHE_NAME='crcr-campo-v6';
const ARCHIVOS=[
  './',
  './index.html',
  './nutricion.html',
  './manifest-nutricion.webmanifest',
  './icon-nutricion.svg',
  './styles.css',
  './app.js',
  './data.js',
  './manifest.webmanifest',
  './icon.svg',
  './engine/bascula.js',
  './engine/bienestar.js',
  './engine/chat.js',
  './engine/codigobarras.js',
  './engine/despacho.js',
  './engine/diagnostico.js',
  './engine/documentacion.js',
  './engine/entrevista.js',
  './engine/escaner.js',
  './engine/nutricion.js',
  './engine/ocr.js',
  './engine/plan.js',
  './engine/recetas.js',
  './engine/seguimiento.js',
  './engine/store.js',
  './engine/util.js',
  './engine/vitals.js',
  './engine/whisper.js',
  './vendor/ort-wasm-simd.wasm',
  './vendor/fflate.mjs',
  './vendor/fonts/bricolage-grotesque-latin-wght-normal.woff2',
  './vendor/ort-wasm.wasm',
  './vendor/pdf.min.mjs',
  './vendor/pdf.worker.min.mjs',
  './vendor/tesseract-core-simd-lstm.wasm',
  './vendor/tesseract-core-simd-lstm.wasm.js',
  './vendor/tesseract-worker.min.js',
  './vendor/tesseract.esm.min.js',
  './vendor/transformers.min.js',
  './vendor/zxing.min.js',
  './models/tesseract/spa.traineddata.gz',
  './models/whisper-tiny/added_tokens.json',
  './models/whisper-tiny/config.json',
  './models/whisper-tiny/generation_config.json',
  './models/whisper-tiny/merges.txt',
  './models/whisper-tiny/normalizer.json',
  './models/whisper-tiny/preprocessor_config.json',
  './models/whisper-tiny/special_tokens_map.json',
  './models/whisper-tiny/tokenizer.json',
  './models/whisper-tiny/tokenizer_config.json',
  './models/whisper-tiny/vocab.json',
  './models/whisper-tiny/onnx/decoder_model_merged_quantized.onnx',
  './models/whisper-tiny/onnx/encoder_model_quantized.onnx',
];

self.addEventListener('install',(event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(ARCHIVOS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',(event)=>{
  event.waitUntil(
    caches.keys().then(nombres=>Promise.all(
      nombres.filter(n=>n!==CACHE_NAME&&n!=='crcr-config').map(n=>caches.delete(n))
    )).then(()=>self.clients.claim())
  );
});

// Cache-first: si ya está descargado, ni se intenta tocar la red.
self.addEventListener('fetch',(event)=>{
  if(event.request.method!=='GET')return;
  // APIs externas (Open Food Facts, USDA): siempre a la red, nunca a la caché.
  if(!event.request.url.startsWith(self.location.origin))return;
  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached)return cached;
      return fetch(event.request).then(resp=>{
        if(resp && resp.ok && event.request.url.startsWith(self.location.origin)){
          const copia=resp.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(event.request, copia));
        }
        return resp;
      }).catch(()=>cached);
    })
  );
});

// --- Recordatorios de Mi Bienestar (nutricion.html) -------------------------
// La página guarda la configuración en la caché 'crcr-config'; aquí se revisa
// qué aviso toca (al abrir la app, cada minuto con la app abierta y, en Android
// con la app instalada, con Periodic Background Sync). Todo sin internet.
async function leerConfig(clave){
  const c=await caches.open('crcr-config');
  const r=await c.match(clave);
  return r?r.json():null;
}
async function escribirConfig(clave,datos){
  const c=await caches.open('crcr-config');
  await c.put(clave,new Response(JSON.stringify(datos)));
}
function horaHoy(ahora,hhmm){
  const [h,m]=String(hhmm||'00:00').split(':').map(Number);
  const d=new Date(ahora);d.setHours(h||0,m||0,0,0);return d;
}
async function revisarRecordatorios(){
  if(self.Notification&&Notification.permission!=='granted')return;
  const conf=await leerConfig('./__recordatorios');
  if(!conf||!conf.cfg)return;
  const cfg=conf.cfg,ultimo=(await leerConfig('./__recordatorios-estado'))||{};
  const ahora=new Date(),avisos=[];
  if(cfg.pesar&&cfg.pesar.activo&&(cfg.pesar.dias||[1]).includes(ahora.getDay()))
    avisos.push({id:'pesar',t:horaHoy(ahora,cfg.pesar.hora),titulo:'⚖️ Hora de pesarte',cuerpo:'En ayunas y después de ir al baño. Toca para registrar.',url:'./nutricion.html#progreso'});
  const hoyTxt=ahora.getFullYear()+'-'+String(ahora.getMonth()+1).padStart(2,'0')+'-'+String(ahora.getDate()).padStart(2,'0');
  const agua=conf.agua&&conf.agua.fecha===hoyTxt?conf.agua:{ml:0,meta:2000};
  const pendiente=await leerConfig('./__agua-pendiente');
  const mlHoy=agua.ml+(pendiente&&pendiente.fecha===hoyTxt?pendiente.vasos*250:0);
  // Si ya cumpliste la meta de agua, no se insiste.
  if(cfg.agua&&cfg.agua.activo&&mlHoy<agua.meta)
    for(let h=cfg.agua.desde;h<=cfg.agua.hasta;h+=Math.max(1,cfg.agua.cadaHoras))
      avisos.push({id:'agua-'+h,t:horaHoy(ahora,h+':00'),titulo:'💧 Toma un vaso de agua',
        cuerpo:`Llevas ${Math.round(mlHoy/250)} de ${Math.ceil(agua.meta/250)} vasos hoy.`,url:'./nutricion.html#hoy',
        acciones:[{action:'vaso',title:'+1 vaso'}]});
  if(cfg.pausa&&cfg.pausa.activo&&(cfg.pausa.dias||[1,2,3,4,5]).includes(ahora.getDay()))
    for(let m=cfg.pausa.desde*60;m<=cfg.pausa.hasta*60;m+=Math.max(15,cfg.pausa.cadaMin)){
      const hhmm=Math.floor(m/60)+':'+String(m%60).padStart(2,'0');
      avisos.push({id:'pausa-'+hhmm,t:horaHoy(ahora,hhmm),titulo:'🧘 Pausa activa',
        cuerpo:'Levántate 3 minutos: cuello, hombros y piernas. Toca para la rutina guiada.',url:'./nutricion.html#pausa',
        acciones:[{action:'pausa',title:'Empezar'}]});
    }
  if(cfg.pasos&&cfg.pasos.activo)
    avisos.push({id:'pasos',t:horaHoy(ahora,cfg.pasos.hora),titulo:'🚶 ¿Ya caminaste hoy?',cuerpo:'15–20 minutos suman unos 2 000 pasos.',url:'./nutricion.html#progreso'});
  if(cfg.consejo&&cfg.consejo.activo)
    avisos.push({id:'consejo',t:horaHoy(ahora,cfg.consejo.hora),titulo:'💡 Consejo para hoy',cuerpo:conf.consejo||'Revisa tu progreso y tu plan.',url:'./nutricion.html#progreso'});
  let cambio=false;
  for(const a of avisos){
    const atraso=ahora-a.t;
    // Solo si ya es la hora, no pasaron más de 2 h y no se mostró hoy.
    // Pausas y agua: ventana corta (no tiene sentido avisar tarde); el resto, 2 h.
    const ventana=/^(pausa|agua)/.test(a.id)?20*60*1000:2*3600*1000;
    if(atraso<0||atraso>ventana||(ultimo[a.id]||0)>=+a.t)continue;
    await self.registration.showNotification(a.titulo,{body:a.cuerpo,tag:a.id.replace(/-.*$/,''),renotify:true,icon:'./icon-nutricion.svg',badge:'./icon-nutricion.svg',data:{url:a.url},actions:a.acciones||[]});
    ultimo[a.id]=Date.now();cambio=true;
  }
  if(cambio)await escribirConfig('./__recordatorios-estado',ultimo);
}
self.addEventListener('message',(event)=>{
  if(event.data&&event.data.tipo==='revisar-recordatorios')event.waitUntil(revisarRecordatorios());
});
self.addEventListener('periodicsync',(event)=>{
  if(event.tag==='crcr-recordatorios')event.waitUntil(revisarRecordatorios());
});
self.addEventListener('notificationclick',(event)=>{
  event.notification.close();
  if(event.action==='vaso'){
    // Se anota sin abrir la app; la página lo suma al abrirse.
    const d=new Date(),f=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    event.waitUntil(leerConfig('./__agua-pendiente').then(p=>escribirConfig('./__agua-pendiente',{fecha:f,vasos:(p&&p.fecha===f?p.vasos:0)+1})));
    return;
  }
  const url=(event.notification.data&&event.notification.data.url)||'./nutricion.html';
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(ventanas=>{
    const v=ventanas.find(w=>w.url.includes('nutricion.html'));
    if(v){v.navigate(url).catch(()=>{});return v.focus();}
    return self.clients.openWindow(url);
  }));
});
