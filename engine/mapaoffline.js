// Mapa de Costa Rica SIN señal: MapLibre + PMTiles (OpenStreetMap/Protomaps),
// rutas con engine/ruta.js, direcciones con engine/geocodificar.js y los
// establecimientos de salud con su horario (mapa/salud.json).
// Se descarga una sola vez (botón) y queda en el teléfono (Cache Storage).
import * as RUTA from './ruta.js';
import * as GEO from './geocodificar.js';

const CACHE='crcr-mapa-v1';
const ARCHIVOS=[['mapa/cr.pmtiles',49.3],['mapa/rutas.bin.gz',5.5],['mapa/salud.json',0.3],['mapa/lugares.json',1.6]];
const TIPOS={hospital:['🏥','Hospital','#DC2626'],clinica:['🏨','Clínica / Área de salud','#F59E0B'],area:['🏨','Área de salud','#F59E0B'],
  ebais:['🩺','EBAIS','#16A34A'],cruzroja:['➕','Cruz Roja','#FFFFFF'],ambulancia:['🚑','Base de ambulancias','#FFFFFF'],consultorio:['⚕️','Consultorio / privado','#64748B']};
const CAPS={hemodinamia:'❤️ Hemodinamia (Código Infarto)',pediatrico:'👶 Pediátrico',trauma:'🦴 Trauma (INS)',psiquiatrico:'🧠 Psiquiátrico',geriatrico:'👴 Geriátrico',mujeres:'🤰 Mujeres'};

let map=null,salud=null,proto=null,posicion=null,vigia=null,destino=null,marcaDestino=null,marcaYo=null,listo=null;
const $=id=>document.getElementById(id);
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ── Descarga para uso sin señal ──────────────────────────────────────────
export async function estadoDescarga(){
  try{const c=await caches.open(CACHE);const r=await Promise.all(ARCHIVOS.map(([p])=>c.match(p)));return r.every(Boolean);}catch{return false;}
}
export async function descargarTodo(onProg){
  const c=await caches.open(CACHE);
  const total=ARCHIVOS.reduce((s,[,mb])=>s+mb,0)*1e6;let hecho=0;
  for(const [p,mb] of ARCHIVOS){
    if(await c.match(p)){hecho+=mb*1e6;onProg?.(hecho/total);continue;}
    const r=await fetch(p,{cache:'no-store'});
    if(!r.ok)throw new Error(`No se pudo bajar ${p} (${r.status})`);
    const lector=r.body.getReader();const partes=[];
    for(;;){const {done,value}=await lector.read();if(done)break;partes.push(value);hecho+=value.length;onProg?.(Math.min(1,hecho/total));}
    await c.put(p,new Response(new Blob(partes),{headers:{'content-type':r.headers.get('content-type')||'application/octet-stream'}}));
  }
  try{await navigator.storage?.persist?.();}catch{}
}
async function obtener(p){
  try{const c=await caches.open(CACHE);const r=await c.match(p);if(r)return r;}catch{}
  const r=await fetch(p);if(!r.ok)throw new Error('Sin el mapa descargado y sin señal: '+p);return r;
}

// ── Librerías (se cargan solo al abrir el mapa) ──────────────────────────
function script(src){return new Promise((ok,mal)=>{if(document.querySelector(`script[src="${src}"]`))return ok();const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>mal(new Error('No cargó '+src));document.head.appendChild(s);});}
async function librerias(){
  if(!document.querySelector('link[href="vendor/maplibre-gl.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='vendor/maplibre-gl.css';document.head.appendChild(l);}
  await script('vendor/maplibre-gl.js');await script('vendor/pmtiles.js');await script('vendor/basemaps.js');
}

// ── Utilidades ───────────────────────────────────────────────────────────
function km(a,b){const x=(b.lon-a.lon)*Math.PI/180*Math.cos((a.lat+b.lat)/2*Math.PI/180),y=(b.lat-a.lat)*Math.PI/180;return 6371*Math.hypot(x,y);}
export function abiertoAhora(s,ahora=new Date()){
  if(s.h24)return true;
  const d=ahora.getDay(),h=ahora.getHours()+ahora.getMinutes()/60;
  if(s.f==='tipico'&&(s.t==='ebais'||s.t==='clinica'||s.t==='area'))return d>=1&&d<=5&&h>=7&&h<16;
  return null; // no se sabe
}
function minutos(seg){const m=Math.round(seg/60);return m<60?`${m} min`:`${Math.floor(m/60)} h ${m%60} min`;}

// ── Pantalla ─────────────────────────────────────────────────────────────
function pintarPanel(html){
  const p=$('mpPanel');p.classList.remove('min');
  p.innerHTML=html?`<button class="mp-asa" aria-label="Achicar o agrandar el panel">▾</button>`+html:'';p.hidden=!html;
  const asa=p.querySelector('.mp-asa');if(asa)asa.onclick=()=>{p.classList.toggle('min');asa.textContent=p.classList.contains('min')?'▴':'▾';};
}
function estado(t){$('mpEstado').textContent=t||'';}

async function iniciarMapa(){
  await librerias();
  const ml=window.maplibregl,pm=window.pmtiles,bm=window.basemaps;
  proto=new pm.Protocol();ml.addProtocol('pmtiles',proto.tile);
  let url;
  const c=await caches.open(CACHE).catch(()=>null);const guardado=c&&await c.match('mapa/cr.pmtiles');
  if(guardado){
    const archivo=new File([await guardado.blob()],'cr.pmtiles');
    const p=new pm.PMTiles(new pm.FileSource(archivo));proto.add(p);url='pmtiles://cr.pmtiles';
  }else{
    const abs=location.origin+location.pathname.replace(/[^/]*$/,'')+'mapa/cr.pmtiles';
    proto.add(new pm.PMTiles(abs));url='pmtiles://'+abs;
  }
  const base=location.origin+location.pathname.replace(/[^/]*$/,'');
  map=new ml.Map({container:'mpMapa',center:[-84.08,9.93],zoom:8,minZoom:6,maxZoom:18,attributionControl:{compact:true},
    maxBounds:[[-87.5,7.2],[-81.5,12.0]],
    style:{version:8,glyphs:base+'mapa/fonts/{fontstack}/{range}.pbf',sprite:base+'mapa/sprites/light',
      sources:{protomaps:{type:'vector',url,attribution:'© OpenStreetMap · Protomaps'}},
      layers:bm.layers('protomaps',bm.namedFlavor('light'),{lang:'es'})}});
  map.addControl(new ml.NavigationControl({showCompass:false}),'top-right');
  await new Promise(r=>map.on('load',r));
  // Establecimientos de salud
  salud=await (await obtener('mapa/salud.json')).json();
  map.addSource('salud',{type:'geojson',data:{type:'FeatureCollection',features:salud.map((s,i)=>({type:'Feature',id:i,
    geometry:{type:'Point',coordinates:[s.lo,s.la]},properties:{i,t:s.t,n:s.n,h24:s.h24?1:0}}))}});
  map.addLayer({id:'salud-c',type:'circle',source:'salud',filter:['any',['==',['get','t'],'hospital'],['all',['==',['get','h24'],1],['>=',['zoom'],11]],['all',['!=',['get','t'],'consultorio'],['>=',['zoom'],14]],['>=',['zoom'],15]],
    paint:{'circle-radius':['interpolate',['linear'],['zoom'],7,['match',['get','t'],'hospital',5,2.5],14,['match',['get','t'],'hospital',11,7]],
      'circle-color':['match',['get','t'],'hospital','#DC2626','clinica','#F59E0B','area','#F59E0B','ebais','#16A34A','cruzroja','#FFFFFF','ambulancia','#FFFFFF','#64748B'],
      'circle-stroke-color':['case',['==',['get','h24'],1],'#7F1D1D','#0F172A'],'circle-stroke-width':['case',['==',['get','h24'],1],2.5,1]}});
  map.addLayer({id:'salud-t',type:'symbol',source:'salud',filter:['any',['==',['get','t'],'hospital'],['>=',['zoom'],12.5]],
    layout:{'text-field':['get','n'],'text-font':['Noto Sans Medium'],'text-size':12,'text-offset':[0,1.1],'text-anchor':'top','text-max-width':10},
    paint:{'text-color':'#111827','text-halo-color':'#fff','text-halo-width':1.5}});
  map.on('click','salud-c',e=>fichaSalud(salud[e.features[0].properties.i]));
  map.on('mouseenter','salud-c',()=>map.getCanvas().style.cursor='pointer');
  map.on('mouseleave','salud-c',()=>map.getCanvas().style.cursor='');
  // Ruta
  map.addSource('ruta',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  map.addLayer({id:'ruta-borde',type:'line',source:'ruta',paint:{'line-color':'#1E3A8A','line-width':9,'line-opacity':.9},layout:{'line-cap':'round','line-join':'round'}});
  map.addLayer({id:'ruta',type:'line',source:'ruta',paint:{'line-color':'#3B82F6','line-width':5},layout:{'line-cap':'round','line-join':'round'}});
  // Tocar el mapa = poner el destino ahí (p. ej. "Ruta 27 km 14")
  map.on('click',e=>{
    if(map.queryRenderedFeatures(e.point,{layers:['salud-c']}).length)return;
    if(!$('mpTocar').classList.contains('on'))return;
    $('mpTocar').classList.remove('on');
    ponerDestino({lat:e.lngLat.lat,lon:e.lngLat.lng,texto:'punto marcado en el mapa'});
  });
}

function seguirGPS(){
  if(!navigator.geolocation||vigia!=null)return;
  vigia=navigator.geolocation.watchPosition(p=>{
    posicion={lat:p.coords.latitude,lon:p.coords.longitude};
    if(!map)return;
    if(!marcaYo){const el=document.createElement('div');el.className='mp-yo';marcaYo=new window.maplibregl.Marker({element:el}).setLngLat([posicion.lon,posicion.lat]).addTo(map);}
    else marcaYo.setLngLat([posicion.lon,posicion.lat]);
  },()=>{},{enableHighAccuracy:true,maximumAge:15000,timeout:20000});
}

function ponerDestino(d){
  destino=d;
  if(marcaDestino)marcaDestino.remove();
  const el=document.createElement('div');el.className='mp-dest';el.innerHTML='<span class="mp-dest-pin">🚑</span><span class="mp-dest-tx">PACIENTE</span>';
  marcaDestino=new window.maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([d.lon,d.lat]).addTo(map);
  rutaA(d);
}

async function rutaA(d,nombre){
  if(!posicion){
    map.flyTo({center:[d.lon,d.lat],zoom:15});
    pintarPanel(`<b>📍 ${esc(nombre||d.texto)}</b><div class="nota">Sin ubicación GPS de la unidad: activá la ubicación para calcular la ruta.</div>`);
    return;
  }
  estado('Calculando la ruta sin señal…');
  try{
    await RUTA.cargarRed(obtener);
    const t0=performance.now();
    const r=RUTA.calcularRuta(posicion,d);
    estado('');
    if(!r){pintarPanel('<b>No encontré un camino por carretera.</b><div class="nota">Revisá el punto de destino.</div>');return;}
    map.getSource('ruta').setData({type:'Feature',geometry:{type:'LineString',coordinates:r.coords}});
    const b=r.coords.reduce((b,[x,y])=>[[Math.min(b[0][0],x),Math.min(b[0][1],y)],[Math.max(b[1][0],x),Math.max(b[1][1],y)]],[[180,90],[-180,-90]]);
    map.fitBounds(b,{padding:{top:100,bottom:110,left:50,right:50},maxZoom:16});   // arriba: alto del marcador PACIENTE
    pintarPanel(`<div class="mp-res"><b>${minutos(r.segundos)}</b> · ${(r.metros/1000).toFixed(1)} km <span class="nota">(sin tránsito; calculado en el teléfono en ${Math.round(performance.now()-t0)} ms)</span></div>
      <div class="mp-dst">📍 ${esc(nombre||d.texto)}</div>
      <ol class="mp-vias">${r.vias.slice(0,8).map(v=>`<li>${esc(v.nombre)} · ${v.km} km</li>`).join('')}</ol>
      ${r.fueraDeRed>300?`<div class="nota">⚠️ El punto queda a ${r.fueraDeRed} m de la carretera más cercana.</div>`:''}
      <div class="g2"><a class="btn-gray mp-btn" target="_blank" rel="noopener" href="https://waze.com/ul?ll=${d.lat},${d.lon}&navigate=yes">🚗 Waze (voz)</a><a class="btn-gray mp-btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lon}&travelmode=driving">🗺️ Maps (voz)</a></div>`);
    // Achicado: se ve el mapa con el paciente; el ▴ muestra las vías.
    $('mpPanel').classList.add('min');const asa=$('mpPanel').querySelector('.mp-asa');if(asa)asa.textContent='▴';
  }catch(e){estado('');pintarPanel(`<b>⚠️ ${esc(e.message)}</b>`);}
}

function fichaSalud(s){
  const [ic,nom]=TIPOS[s.t]||['⚕️','Centro de salud'];
  const ab=abiertoAhora(s);
  const fuente={osm:'según OpenStreetMap',ccss24:'lista CCSS 2025',tipico:'horario típico — confirmar'}[s.f]||'';
  pintarPanel(`<div class="mp-dst">${ic} <b>${esc(s.n)}</b></div><div class="nota">${nom}${s.d?' · '+esc(s.d):''}</div>
    <div>${ab===true?'🟢 Abierto ahora':ab===false?'🔴 Cerrado ahora':'⚪ Horario sin confirmar'} · ${esc(s.hor)} <span class="nota">(${fuente})</span></div>
    ${s.cap?.length?`<div>${s.cap.map(c=>CAPS[c]||c).join(' · ')}</div>`:''}
    ${s.tel?`<a href="tel:${esc(s.tel)}">📞 ${esc(s.tel)}</a>`:''}
    <button class="btn-blue" style="width:100%;margin-top:6px;" id="mpIrAqui">🛣️ Ruta hasta aquí</button>`);
  $('mpIrAqui').onclick=()=>{ponerDestino({lat:s.la,lon:s.lo,texto:s.n});};
}

// Los más cercanos POR TIEMPO DE RUTA (no en línea recta), con filtro.
async function masCercanos(filtro,titulo){
  if(!posicion){pintarPanel('<b>Activá la ubicación GPS</b> para buscar el más cercano.');return;}
  estado('Buscando el más cercano…');
  await RUTA.cargarRed(obtener);
  const cand=salud.filter(filtro).map(s=>({s,d:km(posicion,{lat:s.la,lon:s.lo})})).sort((a,b)=>a.d-b.d).slice(0,8);
  const res=cand.map(({s})=>({s,r:RUTA.calcularRuta(posicion,{lat:s.la,lon:s.lo})})).filter(x=>x.r).sort((a,b)=>a.r.segundos-b.r.segundos).slice(0,5);
  estado('');
  pintarPanel(`<b>${titulo}</b><ol class="mp-lista">${res.map(({s,r},i)=>{const ab=abiertoAhora(s);
    return `<li><button data-i="${salud.indexOf(s)}">${ab===true?'🟢':ab===false?'🔴':'⚪'} <b>${esc(s.n)}</b><br><span class="nota">${minutos(r.segundos)} · ${(r.metros/1000).toFixed(1)} km · ${esc(s.hor)}</span></button></li>`;}).join('')}</ol>
    <div class="nota">Tiempos sin tránsito. 🟢 abierto · 🔴 cerrado · ⚪ sin confirmar.</div>`);
  $('mpPanel').querySelectorAll('button[data-i]').forEach(b=>b.onclick=()=>{const s=salud[+b.dataset.i];ponerDestino({lat:s.la,lon:s.lo,texto:s.n});});
}

// Abre el mapa. opciones: {direccion, impresion} (impresión principal para sugerir destino)
let contextoDespacho='';
// Ubica al paciente con el texto del despacho y, si hay GPS y la red vial está
// guardada (o hay señal), calcula tiempo y distancia desde la unidad.
export async function ubicarPaciente(direccion,textoDespacho){
  await GEO.cargarLugares(obtener);
  const a=direccion?GEO.geocodificar(direccion):null,b=GEO.geocodificar(textoDespacho||direccion||'');
  const g=!a?b:(b&&b.precision==='referencia'&&a.precision!=='referencia'?b:a);
  if(!g)return null;
  let ruta=null;
  const pos=posicion||await new Promise(ok=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>ok({lat:p.coords.latitude,lon:p.coords.longitude}),()=>ok(null),{timeout:8000,maximumAge:60000}):ok(null));
  if(pos&&(await estadoDescarga()||navigator.onLine)){
    try{await RUTA.cargarRed(obtener);ruta=RUTA.calcularRuta(pos,g);}catch{}
  }
  return {...g,ruta:ruta&&{min:Math.round(ruta.segundos/60),km:Math.round(ruta.metros/100)/10}};
}
export async function abrirMapaOffline({direccion='',textoDespacho='',impresion=null}={}){
  contextoDespacho=textoDespacho;
  $('mpOverlay').hidden=false;document.body.classList.add('mp-abierto');
  $('mpBuscar').value=direccion;
  const bajado=await estadoDescarga();
  $('mpDescarga').hidden=true;   // la descarga va como botón chico arriba: no tapa al paciente
  if(!bajado&&!navigator.onLine){estado('');pintarPanel('<b>El mapa no está descargado y no hay señal.</b><div class="nota">Cuando tengas señal (mejor Wi-Fi), tocá "Descargar mapa" para tenerlo siempre.</div>');return;}
  seguirGPS();
  if(!listo)listo=iniciarMapa().catch(e=>{listo=null;throw e;});
  try{await listo;}catch(e){pintarPanel('⚠️ No se pudo abrir el mapa: '+esc(e.message));return;}
  map.resize();
  // Botones rápidos según la impresión diagnóstica
  const rapidos=[['🏥 Hospital más cercano',s=>s.t==='hospital']];
  if(impresion==='iam')rapidos.unshift(['❤️ Hemodinamia más cercana',s=>s.cap?.includes('hemodinamia')]);
  if(impresion==='politrauma'||impresion==='tce')rapidos.push(['🦴 Trauma',s=>s.cap?.includes('trauma')||['San Juan de Dios','México','Calderón Guardia'].some(n=>s.n.includes(n))]);
  rapidos.push(['🕐 Abierto 24 h más cercano',s=>s.h24&&s.t!=='cruzroja'&&s.t!=='ambulancia'],['➕ Cruz Roja más cercana',s=>s.t==='cruzroja']);
  $('mpRapidos').innerHTML=(bajado?'':`<button id="mpDescargar" class="mp-bajar">⬇️ Guardar mapa sin señal (57 MB)</button>`)+`<button id="mpVerPaciente">🚑 Paciente</button><button id="mpCentros">🏥 Centros: ver todos</button>`+rapidos.map(([t],i)=>`<button data-r="${i}">${t}</button>`).join('');
  if(!bajado)$('mpDescargar').onclick=iniciarDescarga;
  $('mpVerPaciente').onclick=()=>{if(destino)map.flyTo({center:[destino.lon,destino.lat],zoom:16});else buscarDireccion();};
  $('mpCentros').onclick=()=>{const todos=$('mpCentros').classList.toggle('on');
    map.setFilter('salud-c',todos?null:['any',['==',['get','t'],'hospital'],['all',['==',['get','h24'],1],['>=',['zoom'],11]],['all',['!=',['get','t'],'consultorio'],['>=',['zoom'],14]],['>=',['zoom'],15]]);
    $('mpCentros').textContent=todos?'🏥 Centros: menos':'🏥 Centros: ver todos';};
  $('mpRapidos').querySelectorAll('button[data-r]').forEach(b=>b.onclick=()=>{const [t,f]=rapidos[+b.dataset.r];masCercanos(f,t);});
  if(direccion||contextoDespacho)buscarDireccion();
  else if(posicion)map.flyTo({center:[posicion.lon,posicion.lat],zoom:14});
}
export async function buscarDireccion(){
  const q=$('mpBuscar').value.trim();if(!q&&!contextoDespacho)return;
  try{await GEO.cargarLugares(obtener);}catch(e){pintarPanel('⚠️ '+esc(e.message));return;}
  const conTodo=contextoDespacho&&!contextoDespacho.includes(q)?q+'. '+contextoDespacho:(contextoDespacho||q);
  const a=q?GEO.geocodificar(q,{cerca:posicion}):null,b=GEO.geocodificar(conTodo,{cerca:posicion});
  // El texto completo gana si es más preciso (referencia vs. solo localidad) o si la dirección sola no dio nada.
  const g=!a?b:(b&&b.precision==='referencia'&&a.precision!=='referencia'?b:a);
  if(!g){pintarPanel(`<b>No ubiqué "${esc(q||'la dirección del despacho')}".</b><div class="nota">Tocá "📌 Marcar en el mapa" y tocá el punto exacto.</div>`);return;}
  ponerDestino({lat:g.lat,lon:g.lon,texto:g.texto});
  estado(`Entendí: ${g.texto}${g.precision==='localidad'?' (aproximado: solo la localidad)':''}`);
}
export function cerrarMapaOffline(){$('mpOverlay').hidden=true;document.body.classList.remove('mp-abierto');}
export function activarTocar(){$('mpTocar').classList.toggle('on');estado($('mpTocar').classList.contains('on')?'Tocá en el mapa el punto del despacho.':'');}
export async function iniciarDescarga(){
  const b=$('mpDescargar');b.disabled=true;
  try{
    await descargarTodo(p=>{b.textContent=`⬇️ Descargando… ${Math.round(p*100)}%`;});
    b.textContent='✅ Mapa guardado: funciona sin señal';
    setTimeout(()=>b.remove(),2500);
  }catch(e){b.disabled=false;b.textContent='⬇️ Reintentar descarga';estado('⚠️ '+e.message);}
}
