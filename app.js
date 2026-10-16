// CRCR Campo — app.js
// Script clásico (no type="module") a propósito: así los onclick="..." inline del
// HTML (estilo del archivo original) siguen viendo las variables globales tal
// cual. Los módulos ES (data.js, engine/*.js) se cargan con import() dinámico
// al arrancar y se vuelcan a estas variables.
'use strict';

let CODS,TNIV,TSTEPS,TSTEPS_NINO,trModo='ad',TACC,SCAMPOS,OCAMPOS,ENF,PROT,EQP,BOT,QPROMPTS,EPP_POR_TIPO,SIGNOS={},ZONAS={};
let arriboAgente, impresionAgente, herrAgente, despachoAgente, vitalsAgente, entrevistaAgente, diagnosticoAgente, documentacionAgente, chatAgente, whisperAgente, ocrAgente, storeAgente;

// ═══════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════
let notas=[],recs=[],recsOn=false,recsOn2=false,mr=null,mr2=null,chunks=[],chunks2=[],
trans='',trans2='',
trStep=0,trCts={r:0,a:0,v:0,n:0},
bolTab='veh',
boleta=boletaVacia(),
boletaAuto=new Set(), // rutas ("cod","sam.S",...) que llenó el motor — se marcan 🤖 en la UI
eqp=[],bot=[],
eqFil='todos',enfSel=null,enfTag='todos',
repKey='quemaduras',repSec=null,
chatHist=[],
timerSec=0,timerOn=false,timerInt=null,
whisperListo=false;

function boletaVacia(){
  return {un:'',pl:'',tu:'USVB',co:'',fo:'',
   trip:[{p:'APA',n:''},{p:'AEM',n:''},{p:'TEC',n:''},{p:'ENF',n:''}],
   hsal:'',hle:'',hlh:'',hba:'',des:'',cod:'',pr:'1',
   prov:'',cant:'',cal:'',av:'',os:'',td:'Medico',id:'',ent:'',
   nom:'',ced:'',fnac:'',edad:'',gen:'M',
   dp:'',dc:'',do_:'',ac:'',tel:'',
   sv1:{h:'',gcs:'',pO:'',pV:'',pM:'',fc:'',fr:'',pa1:'',pa2:'',spo2:'',glu:'',et:'',temp:'',pe:'',ta:''},
   sv2:{h:'',gcs:'',pO:'',pV:'',pM:'',fc:'',fr:'',pa1:'',pa2:'',spo2:'',glu:'',et:''},
   dx1:'',dx2:'',dx3:'',
   ant:{al:false,ps:false,as:false,vi:false,ca:false,cd:false,hp:false,ht:false,dm:false,di:false,ep:false,ec:false,ne:false,nf:false},
   hal:'',xab:{x:'',a:'',b:'',c:'',d:'',e:''},
   sam:{S:'',A:'',M:'',P:'',L:'',E:''},opr:{O:'',P:'',Q:'',R:'',S:'',T:''},
   int:'',obs:'',dest:'',med:'',trc:'',fotos:[]};
}

const nowStr=()=>new Date().toLocaleTimeString('es-CR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
const ge=id=>document.getElementById(id);

// ═══════════════════════════════════════════════════
// ARRANQUE — carga de módulos ES (motor local) + estado guardado
// ═══════════════════════════════════════════════════
async function cargarMotores(){
  const [data, despacho, vitals, entrevista, diagnostico, documentacion, chat, store] = await Promise.all([
    import('./data.js'),
    import('./engine/despacho.js'),
    import('./engine/vitals.js'),
    import('./engine/entrevista.js'),
    import('./engine/diagnostico.js'),
    import('./engine/documentacion.js'),
    import('./engine/chat.js'),
    import('./engine/store.js'),
  ]);
  try{({SIGNOS,ZONAS}=await import('./engine/signos.js'));}catch(e){console.error(e);}
  try{arriboAgente=await import('./engine/arribo.js');impresionAgente=await import('./engine/impresion.js');herrAgente=await import('./engine/herramientas.js');}catch(e){console.error(e);}
  ({CODS,TNIV,TSTEPS,TSTEPS_NINO,TACC,SCAMPOS,OCAMPOS,ENF,PROT,EQP,BOT,QPROMPTS,EPP_POR_TIPO}=data);
  despachoAgente=despacho; vitalsAgente=vitals; entrevistaAgente=entrevista;
  diagnosticoAgente=diagnostico; documentacionAgente=documentacion; chatAgente=chat;
  storeAgente=store;
  eqp=EQP.map(e=>({...e})); bot=BOT.map(b=>({...b}));
  await restaurarEstado();
  storeAgente.pedirAlmacenamientoPersistente();
  pintarRevision();setTimeout(subirPendientes,3000);
  initUI();
  precargarWhisper();
}

async function restaurarEstado(){
  try{
    const guardado=await storeAgente.cargarEstado('app');
    if(guardado){
      if(guardado.boleta)boleta=guardado.boleta;
      if(guardado.notas)notas=guardado.notas;
      if(guardado.trCts)trCts=guardado.trCts;
      if(guardado.eqp)eqp=guardado.eqp;
      if(guardado.bot)bot=guardado.bot;
      if(guardado.boletaAuto)boletaAuto=new Set(guardado.boletaAuto);
      if(guardado.incidente){
        // Los inputs del Home son estáticos (están en el HTML desde el arranque),
        // así que ya existen en el DOM para cuando esto corre (tras DOMContentLoaded).
        if(ge('inc-u'))ge('inc-u').value=guardado.incidente.u||'';
        if(ge('inc-s'))ge('inc-s').value=guardado.incidente.s||'';
        if(ge('inc-hd'))ge('inc-hd').value=guardado.incidente.hd||'';
        if(ge('inc-hl'))ge('inc-hl').value=guardado.incidente.hl||'';
      }
    }
    const grabaciones=await storeAgente.listarGrabaciones();
    recs=grabaciones.map(r=>({...r, url:URL.createObjectURL(r.blob)}));
  }catch(e){ console.warn('No se pudo restaurar el estado local:',e); }
}

let guardarEstadoDebounced;
function guardarEstado(){
  if(!guardarEstadoDebounced)guardarEstadoDebounced=storeAgente.debounce(()=>{
    storeAgente.guardarEstado('app',{
      boleta, notas, trCts, eqp, bot, boletaAuto:[...boletaAuto],
      incidente:{u:(ge('inc-u')||{}).value,s:(ge('inc-s')||{}).value,hd:(ge('inc-hd')||{}).value,hl:(ge('inc-hl')||{}).value}
    });
  },600);
  guardarEstadoDebounced();
}

async function precargarWhisper(){
  const st=ge('motorStatus');
  try{
    whisperAgente=await import('./engine/whisper.js');
    await whisperAgente.precargarModelo(p=>{
      if(st && p.status==='progress')st.textContent=`⏳ Preparando el motor de voz (solo la primera vez)… ${Math.round(p.progress||0)}%`;
    });
    whisperListo=true;
    if(st){st.textContent='🎙️ Motor de voz listo: funciona sin señal.';st.className='motor-status listo barra-estado';setTimeout(()=>{st.hidden=true;},4000);}
  }catch(e){
    if(st){st.textContent='⚠️ No se pudo cargar el motor de voz. Puedes grabar, pero no se transcribe.';st.className='motor-status barra-estado';}
    console.error(e);
  }
}

document.addEventListener('DOMContentLoaded', cargarMotores);

// ═══════════════════════════════════════════════════
// NAVEGACIÓN
// ═══════════════════════════════════════════════════
function initUI(){
  updOnlineLabel();initQBtns();initSO();renderCods();renderNotas();renderTr();renderTrLevels();renderEnf();renderRep();
  // "input" (no "change") — así se guarda mientras se escribe, sin depender de
  // que el campo pierda el foco (relevante si la app se cierra de golpe en campo).
  ['inc-u','inc-s','inc-hd','inc-hl'].forEach(id=>{ const el=ge(id); if(el)el.addEventListener('input',guardarEstado); });
}
function updOnlineLabel(){
  const d=ge('dot'); if(d){d.textContent='● Funciona sin señal'; d.style.color='#4ADE80';}
}
function go(name){
  document.querySelectorAll('.screen,.chat-wrap').forEach(s=>s.classList.remove('active'));
  const scr=ge('s-'+name); if(scr)scr.classList.add('active');
  cerrarMas();
  // Las secciones secundarias se marcan en "Más".
  const nb=ge('n-'+name)||ge('n-mas');
  document.querySelectorAll('.nav-btn').forEach(b=>{b.classList.toggle('on',b===nb);if(b===nb)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  if(scr)scr.scrollTop=0;
  if(name==='triage'){renderTr();renderTrLevels();}
  if(name==='boleta')renderBol();
  if(name==='equipo'){renderEq();renderBot();}
  if(name==='enf')renderEnf();
  if(name==='repaso')renderRep();
  if(name==='desp')renderCods();
  if(name==='hist')renderHistorial();
  if(name==='herr')import('./engine/calculadoras.js').then(m=>m.pintarHerramientas(ge('herrPage'),{boleta,guardar:guardarEstado,aviso:t=>alert(t)}));
  if(name==='chat'){setTimeout(()=>{const c=ge('chatmsgs');if(c)c.scrollTop=99999;},100);}
}

function abrirMas(){const h=ge('hojaMas');if(h)h.hidden=false;}
function cerrarMas(){const h=ge('hojaMas');if(h)h.hidden=true;}
document.addEventListener('keydown',e=>{if(e.key==='Escape')cerrarMas();});

// ═══════════════════════════════════════════════════
// TIMER
// ═══════════════════════════════════════════════════
function toggleTimer(){
  timerOn=!timerOn;
  const btn=ge('tbtn'),d=ge('tdisp');
  if(timerOn){btn.textContent='⏸';d.style.background='#DC2626';
    timerInt=setInterval(()=>{timerSec++;const h=Math.floor(timerSec/3600).toString().padStart(2,'0'),m=Math.floor((timerSec%3600)/60).toString().padStart(2,'0'),s=(timerSec%60).toString().padStart(2,'0');d.textContent='⏱'+h+':'+m+':'+s;},1000);
  }else{btn.textContent='▶';d.style.background='#1E293B';clearInterval(timerInt);}
}
function resetTimer(){clearInterval(timerInt);timerOn=false;timerSec=0;ge('tbtn').textContent='▶';ge('tdisp').textContent='⏱00:00:00';ge('tdisp').style.background='#1E293B';}

// ═══════════════════════════════════════════════════
// NOTAS
// ═══════════════════════════════════════════════════
function addN(){const i=ge('ni');if(!i||!i.value.trim())return;notas.push({ts:nowStr(),txt:i.value.trim()});i.value='';renderNotas();guardarEstado();}
function renderNotas(){
  const l=ge('nl'),c=ge('nc');if(!l)return;
  if(c)c.textContent=notas.length;
  l.innerHTML=notas.slice().reverse().slice(0,5).map(n=>`<div style="background:#1E293B;border-radius:5px;padding:5px 9px;font-size:13px;color:#CBD5E1;display:flex;gap:8px;margin-top:4px;"><span style="color:#475569;font-family:monospace;font-size:12px;flex-shrink:0;">${n.ts}</span>${n.txt}</div>`).join('');
}

// ═══════════════════════════════════════════════════
// INCIDENTE — cerrar y archivar en el historial local
// ═══════════════════════════════════════════════════
async function cerrarIncidente(){
  if(!confirm('¿Cerrar este incidente? Se archiva la boleta actual y se abre una en blanco.'))return;
  await storeAgente.archivarIncidente(JSON.parse(JSON.stringify(boleta)));
  boleta=boletaVacia();boletaAuto=new Set();notas=[];trCts={r:0,a:0,v:0,n:0};trStep=0;marcas=[];if(metroOn)metronomo();
  trans='';trans2='';
  renderNotas();resetC();resetTriage();renderBol();guardarEstado();
  alert('Incidente archivado. Boleta lista para el siguiente llamado.');
}
async function renderHistorial(){
  const el=ge('histlist');if(!el)return;
  const items=await storeAgente.listarHistorial();
  if(items.length===0){el.innerHTML='<div class="card"><div style="font-size:13px;color:#475569;">Todavía no hay incidentes archivados.</div></div>';return;}
  el.innerHTML=items.map(it=>{
    const b=it.boleta,f=new Date(it.ts);
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;"><span style="font-weight:700;font-size:14px;">${b.nom||'Paciente sin nombre'}</span><span style="font-size:12px;color:#475569;">${f.toLocaleDateString('es-CR')} ${f.toLocaleTimeString('es-CR',{hour:'2-digit',minute:'2-digit'})}</span></div>
      <div style="font-size:13px;color:#94A3B8;">Triage: ${b.trc||'—'} · Unidad: ${b.un||'—'} · Dx: ${b.dx1||'—'}</div>
      <button onclick="exportarHistorial('${it.id}')" class="btn-gray" style="font-size:13px;padding:7px;">📄 Exportar texto</button>
    </div>`;
  }).join('');
}
async function exportarHistorial(id){
  const items=await storeAgente.listarHistorial();
  const it=items.find(x=>x.id===id);if(!it)return;
  descargarTexto(documentacionAgente.exportarBoletaTexto(it.boleta), `boleta_${id}.txt`);
}
function descargarTexto(texto,nombre){
  const blob=new Blob([texto],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=nombre;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}

// ═══════════════════════════════════════════════════
// QUICK PROMPTS (protocolos rápidos → buscador local)
// ═══════════════════════════════════════════════════
function initQBtns(){
  const el=ge('qbtns');if(!el)return;
  el.innerHTML=QPROMPTS.map(q=>`<button onclick="quickChat('${q.replace(/'/g,"\\'")}');" style="background:#1E293B;border:1px solid #334155;border-radius:7px;color:#CBD5E1;font-size:13px;padding:8px;text-align:left;line-height:1.4;">${q}</button>`).join('');
}
function quickChat(q){go('chat');setTimeout(()=>{const i=ge('cinput');if(i){i.value=q;sendChat();}},50);}

// ═══════════════════════════════════════════════════
// CÓDIGOS CRC
// ═══════════════════════════════════════════════════
function renderCods(){
  const search=(ge('csearch')||{value:''}).value.toLowerCase(),list=ge('clist');if(!list)return;
  list.innerHTML=Object.entries(CODS).filter(([k,v])=>!search||k.toLowerCase().includes(search)||v.toLowerCase().includes(search)).map(([k,v])=>{
    const isE=k.startsWith('E');
    return `<div style="display:flex;gap:10px;align-items:center;padding:7px 9px;background:${isE?'#1A0606':'#1E293B'};border-radius:5px;border-left:3px solid ${isE?'#DC2626':'#334155'};"><span style="font-family:monospace;color:${isE?'#FCA5A5':'#94A3B8'};font-weight:800;min-width:40px;font-size:13px;">${k}</span><span style="font-size:13px;color:${isE?'#F1F5F9':'#94A3B8'};flex:1;">${v}</span>${isE?'<span style="font-size:12px;color:#DC2626;font-weight:800;">🔴</span>':''}</div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════
// GRABACIÓN + TRANSCRIPCIÓN LOCAL (Whisper)
// ═══════════════════════════════════════════════════
async function transcribirYProcesar(blob, destino){
  const statusEl=ge(destino==='desp'?'rtxt':'rtxt2');
  if(!whisperAgente || !whisperListo){
    if(statusEl){statusEl.style.display='block';statusEl.textContent='⚠️ El motor de voz local todavía no terminó de cargar. El audio quedó grabado igual.';}
    return;
  }
  if(statusEl){statusEl.style.display='block';statusEl.textContent='⏳ Transcribiendo localmente…';}
  try{
    const texto=await whisperAgente.transcribir(blob);
    if(destino==='desp'){
      trans=texto;
      if(statusEl)statusEl.textContent=texto||'(sin voz detectada)';
      if(texto){ const dt=ge('dtxt'); if(dt && (!dt.value.trim()||dt.dataset.vivo)){dt.value=texto;delete dt.dataset.vivo;autoUbicacion(texto);} }
      vivoTexto='';
      if(texto)procesarDespacho(ge('dtxt').value);else pintarGuia();
    }else{
      trans2=texto;vivoTexto='';
      if(statusEl)statusEl.textContent=texto||'(sin voz detectada)';
      if(texto)aplicarExtraccionEntrevista(texto);
    }
  }catch(e){
    console.error(e);
    if(statusEl)statusEl.textContent='⚠️ No se pudo transcribir localmente.';
  }
}

async function toggleRec(){
  if(!recsOn){
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mime=MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':'audio/ogg';
      chunks=[];mr=new MediaRecorder(stream,{mimeType:mime});
      mr.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};
      mr.onstop=async()=>{
        detenerVivo();
        const blob=new Blob(chunks,{type:mime});
        const lbl=(ge('rlbl')||{value:'Despacho'}).value;
        const rec={id:'r'+Date.now(),lbl,ts:nowStr(),blob,tx:'',sz:Math.round(blob.size/1024)+'KB'};
        recs.push({...rec, url:URL.createObjectURL(blob)});
        storeAgente.guardarGrabacion(rec);
        stream.getTracks().forEach(t=>t.stop());recsOn=false;
        const b=ge('rbtn');if(b){b.textContent='🎙️ Grabar';b.style.background='#DC2626';}
        const hb=ge('btnHeroRec');if(hb)hb.classList.remove('grabando');
        const rs=ge('rstat');if(rs)rs.style.display='none';
        const rp=ge('recpill');if(rp)rp.style.display='none';
        renderRecs();
        await transcribirYProcesar(blob,'desp');
        const found=recs.find(r=>r.id===rec.id); if(found){found.tx=trans; storeAgente.guardarGrabacion({...rec,tx:trans});}
        renderRecs();subirPendientes();
      };
      mr.start(500);
      iniciarVivo(()=>chunks,mime,'desp');
      recsOn=true;
      const b=ge('rbtn');if(b){b.textContent='⏹ Detener';b.style.background='#374151';}
      const hb=ge('btnHeroRec');if(hb)hb.classList.add('grabando');
      const rs=ge('rstat');if(rs)rs.style.display='block';
      const rp=ge('recpill');if(rp)rp.style.display='flex';
    }catch(err){alert('Micrófono no disponible: '+err.message);}
  }else{if(mr)mr.stop();}
}
async function toggleRec2(){
  if(!recsOn2){
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mime=MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':'audio/ogg';
      chunks2=[];mr2=new MediaRecorder(stream,{mimeType:mime});
      mr2.ondataavailable=e=>{if(e.data.size>0)chunks2.push(e.data);};
      mr2.onstop=async()=>{
        detenerVivo();
        const blob=new Blob(chunks2,{type:mime});
        const rec={id:'r'+Date.now(),lbl:'Entrevista',ts:nowStr(),blob,tx:'',sz:Math.round(blob.size/1024)+'KB'};
        recs.push({...rec, url:URL.createObjectURL(blob)});
        storeAgente.guardarGrabacion(rec);
        stream.getTracks().forEach(t=>t.stop());recsOn2=false;
        const b=ge('rbtn2');if(b){b.textContent='🎙️ Grabar entrevista';b.style.background='#DC2626';}
        const rs=ge('rstat2');if(rs)rs.style.display='none';
        const rp=ge('recpill');if(rp)rp.style.display='none';
        await transcribirYProcesar(blob,'entrev');
        const f2=recs.find(r=>r.id===rec.id);if(f2){f2.tx=trans2;storeAgente.guardarGrabacion({...rec,tx:trans2});}
        renderRecs();subirPendientes();
      };
      mr2.start(500);
      iniciarVivo(()=>chunks2,mime,'entrev');
      recsOn2=true;
      const b=ge('rbtn2');if(b){b.textContent='⏹ Detener';b.style.background='#374151';}
      const rs=ge('rstat2');if(rs)rs.style.display='block';
      const rp=ge('recpill');if(rp)rp.style.display='flex';
    }catch(err){alert('Micrófono: '+err.message);}
  }else{if(mr2)mr2.stop();}
}
function renderRecs(){
  const c=ge('recsbox');if(!c)return;
  if(recs.length===0){c.style.display='none';return;}
  c.style.display='block';
  const cab=ge('recsCab');if(cab)cab.textContent=`📼 Grabaciones guardadas en este teléfono (${recs.length})`;
  ge('recsl').innerHTML=`<button class="btn-blue" style="width:100%;margin-bottom:8px;" onclick="enviarRevision()">📤 Enviar todas para revisión (audio + transcripción)</button>`+recs.slice().reverse().map(r=>`<div style="background:#1E293B;border-radius:8px;padding:10px;margin-bottom:6px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-weight:700;font-size:14px;">${r.lbl}</span><span style="font-size:12px;color:#475569;">${r.ts}·${r.sz}${r.subido?' · ☁️ en revisión':''}</span></div>
    <audio controls src="${r.url}" style="width:100%;height:36px;"></audio>
    ${r.tx?`<div style="background:#080E1A;border-radius:5px;padding:6px;margin-top:4px;font-size:13px;color:#94A3B8;line-height:1.5;">${r.tx.slice(0,200)}</div>`:''}
    ${r.tx?`<button onclick="analyzeRec('${r.id}')" style="background:#1E3A5F;border:1px solid #2563EB;color:#93C5FD;border-radius:6px;padding:7px 10px;font-size:13px;margin-top:4px;width:100%;">🧭 Analizar (motor local)</button>`:''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
      <button onclick="guardarAudio('${r.id}')" class="btn-gray" style="padding:9px;">⬇️ Guardar audio</button>
      <button onclick="enviarRevision(['${r.id}'])" class="btn-gray" style="padding:9px;">📤 Compartir</button>
    </div>
    <button onclick="borrarRec('${r.id}')" class="btn-gray" style="padding:7px;width:100%;margin-top:6px;font-size:13px;color:#FCA5A5;">🗑️ Borrar</button>
  </div>`).join('');
}
// Sacar una grabación del teléfono (decisión explícita de quien la grabó).
// Nombre claro con fecha y hora: crcr_despacho_2026-10-16_08-42.webm
function nombreGrabacion(r){
  const d=new Date(+String(r.id).replace(/\D/g,'')||Date.now());
  const p=n=>String(n).padStart(2,'0');
  return `crcr_${(r.lbl||'grabacion').toLowerCase()}_${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}
function archivoDeGrabacion(r){
  const ext=(r.blob?.type||'').includes('ogg')?'ogg':'webm';
  return new File([r.blob],nombreGrabacion(r)+'.'+ext,{type:r.blob?.type||'audio/webm'});
}
// La transcripción viaja con el audio, para poder revisar las dos cosas juntas.
function archivoTranscripcion(r){
  return new File([`Grabación: ${r.lbl} · ${r.ts}\n\nTranscripción automática (Whisper local):\n${r.tx||'(sin transcripción)'}\n`],nombreGrabacion(r)+'.txt',{type:'text/plain'});
}
async function enviarRevision(ids){
  const lista=recs.filter(r=>(!ids||ids.includes(r.id))&&r.blob);
  if(!lista.length)return;
  if(!confirm(`Vas a sacar ${lista.length} grabación(es) de la app. Pueden tener datos del paciente. ¿Continuar?`))return;
  const files=lista.flatMap(r=>[archivoDeGrabacion(r),archivoTranscripcion(r)]);
  if(navigator.canShare?.({files})){
    try{await navigator.share({files,title:'CRCR Campo — grabaciones para revisión',text:'Guardalas en Google Drive (carpeta "CRCR audios") para revisarlas.'});return;}
    catch(e){if(e.name==='AbortError')return;}
  }
  // Sin "compartir archivos": se descargan uno por uno.
  for(const f of files){const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();a.remove();await new Promise(r=>setTimeout(r,400));}
}
async function borrarRec(id){
  if(!confirm('¿Borrar esta grabación del teléfono? No se puede deshacer.'))return;
  await storeAgente.borrarGrabacion(id);
  recs=recs.filter(r=>r.id!==id);renderRecs();
}
function avisoPrivacidad(){
  return confirm('Este audio puede tener datos del paciente (nombre, condición, ubicación). ¿Seguro que querés sacarlo de la app?');
}
function guardarAudio(id){
  const r=recs.find(x=>x.id===id);if(!r?.blob||!avisoPrivacidad())return;
  const f=archivoDeGrabacion(r);
  const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();a.remove();
}
async function compartirAudio(id){
  const r=recs.find(x=>x.id===id);if(!r?.blob||!avisoPrivacidad())return;
  const f=archivoDeGrabacion(r);
  if(navigator.canShare?.({files:[f]})){
    try{await navigator.share({files:[f],title:'Grabación CRCR Campo',text:r.tx?('Transcripción: '+r.tx):''});}catch(e){if(e.name!=='AbortError')alert('No se pudo compartir: '+e.message);}
  }else{alert('Este navegador no permite compartir archivos; usá ⬇️ Guardar audio.');}
}
function analyzeRec(id){
  const r=recs.find(x=>x.id===id);if(!r||!r.tx)return;
  const desp=despachoAgente.interpretarDespacho(r.tx,{CODS,ENF,EPP_POR_TIPO});
  const dx=diagnosticoAgente.sugerirDiagnosticos(r.tx,ENF);
  const texto=desp.resumen+(dx.length?`\n🩺 Posibles cuadros relacionados: ${dx.map(d=>d.t).join(', ')}`:'');
  addMsg('assistant','🎙️ ANÁLISIS DE GRABACIÓN\n\n'+texto);
  go('desp');pintarGuia(r.tx+'. '+textoDelCaso());ge('guiaCard')?.scrollIntoView({block:'start'});
}

// ═══════════════════════════════════════════════════
// DESPACHO — Agente local
// ═══════════════════════════════════════════════════
let ultimoDespacho=null;
// Botones para ir a la ubicación: se arman con lo que diga el campo (editable).
// ── Mapa dentro de la app ──
let mapaModo=null,posUnidad=null;
function ubicacionUnidad(){
  return new Promise(res=>{
    if(!navigator.geolocation)return res(null);
    navigator.geolocation.getCurrentPosition(p=>res({lat:+p.coords.latitude.toFixed(5),lon:+p.coords.longitude.toFixed(5)}),()=>res(null),{enableHighAccuracy:true,timeout:8000,maximumAge:60000});
  });
}
function destinoActual(){
  const v=(ge('dubic')||{value:''}).value.trim();if(!v)return null;
  const c=v.match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{2,3}\.\d+)$/);
  return c?{texto:v,lat:+c[1],lon:+c[2]}:{texto:v};
}
async function abrirMapa(modo){
  const dest=destinoActual();
  if(!dest){alert('Primero escribí o dictá la ubicación del despacho.');return;}
  if(!navigator.onLine){alert('Sin señal: el mapa necesita internet. La ubicación queda guardada para cuando haya señal.');return;}
  mapaModo=modo;
  const box=ge('mapaBox'),fr=ge('mapaFrame'),nota=ge('mapaNota');
  box.hidden=false;ge('btnMapaAqui').hidden=true;
  ge('mt-ruta').classList.toggle('on',modo==='ruta');ge('mt-transito').classList.toggle('on',modo==='transito');
  nota.textContent='📡 Buscando la ubicación de la unidad…';
  posUnidad=await ubicacionUnidad()||posUnidad;
  if(modo==='ruta'){
    fr.src=despachoAgente.mapaRuta(dest,posUnidad);
    nota.textContent=posUnidad?'Ruta desde la unidad (GPS) hasta el despacho, con tiempo estimado.':'Sin GPS: se muestra el destino. Activá la ubicación para ver la ruta y el tiempo.';
  }else{
    const p=dest.lat!=null?dest:posUnidad;
    if(!p){nota.textContent='Para el tránsito de Waze hacen falta coordenadas (GPS de la unidad o del despacho).';fr.removeAttribute('src');return;}
    fr.src=despachoAgente.mapaTransito(p.lat,p.lon,dest.lat!=null?15:13);
    nota.textContent=dest.lat!=null?'Tránsito en vivo alrededor del despacho.':'Tránsito en vivo alrededor de la unidad. Si Waze pide verificación, usá el botón 🚗 Waze de abajo.';
  }
}
function cerrarMapa(){ge('mapaBox').hidden=true;ge('btnMapaAqui').hidden=false;ge('mapaFrame').removeAttribute('src');mapaModo=null;}
// ── De la grabación sale todo ──
function grabarDesdeInicio(){go('desp');if(!recsOn)toggleRec();else toggleRec();}
const TIPO_DESPACHO=d=>!d?null:['politrauma','tce','trauma_col','trauma_tx','trauma_abd'].includes(d.id)&&/(colisi|choque|atropell|moto|vehic|carro)/i.test(ge('dtxt')?.value||'')?'Accidente Tránsito'
  :d.g==='Trauma'?'Trauma':d.g==='Gineco-obstétrico'?'GinecoObstétrico':'Medico';
let ubicPaciente=null;
// Interpreta el despacho, llena la boleta (marcado 🤖, editable) y ubica al paciente.
async function procesarDespacho(txt){
  if(!txt?.trim()||!despachoAgente)return;
  ultimoDespacho=despachoAgente.interpretarDespacho(txt,{CODS,ENF,EPP_POR_TIPO});
  documentacionAgente.autocompletarBoleta(boleta,{despacho:ultimoDespacho}).forEach(p=>boletaAuto.add(p));
  pintarGuia();
  const ppal=ultimaGuia?.impresiones?.find(d=>d.conf!=='descartar');
  const ctx=ultimaGuia?.contexto||{};
  const tipo=ctx.nino?'Pediátrico':TIPO_DESPACHO(ppal);
  if(tipo&&(!boleta.td||boletaAuto.has('td')||boleta.td==='Medico')){boleta.td=tipo;boletaAuto.add('td');}
  const dir=(ge('dubic')||{value:''}).value.trim();
  if(dir&&!boleta.os){boleta.os=dir;boletaAuto.add('os');}
  guardarEstado();
  // Ubicación del paciente (sin señal si el mapa está guardado)
  try{
    mapaOff=mapaOff||await import('./engine/mapaoffline.js');
    ubicPaciente=await mapaOff.ubicarPaciente(dir,txt);
    // Si de la grabación no salió una frase de dirección pero igual se ubicó (p. ej. solo "Alajuela centro"), se llena.
    const du=ge('dubic');
    if(ubicPaciente&&du&&!du.value.trim()){du.value=ubicPaciente.texto;du.classList.add('auto-field');pintarNav();if(!boleta.os)boletaAuto.add('os');}
    if(ubicPaciente&&boletaAuto.has('os'))boleta.os=`${dir||ubicPaciente.texto} — ${ubicPaciente.texto} (${ubicPaciente.lat}, ${ubicPaciente.lon})`;
    guardarEstado();pintarGuia();
  }catch(e){console.warn('ubicar',e);}
}
// ── Mapa sin señal ──
let mapaOff=null;
async function abrirMapaSinSenal(){
  mapaOff=mapaOff||await import('./engine/mapaoffline.js');
  const imp=ultimaGuia?.impresiones?.find(d=>d.conf!=='descartar')?.id||null;
  mapaOff.abrirMapaOffline({direccion:(ge('dubic')||{value:''}).value.trim(),textoDespacho:(ge('dtxt')||{value:''}).value.trim(),impresion:imp});
}
function cerrarMapaSinSenal(){mapaOff?.cerrarMapaOffline();}
function mpBuscarDir(){mapaOff?.buscarDireccion();}
function mpTocar(){mapaOff?.activarTocar();}
function mpDescargar(){mapaOff?.iniciarDescarga();}
function pintarNav(){
  const v=(ge('dubic')||{value:''}).value.trim();
  const c=v.match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{2,3}\.\d+)$/);
  const l=v&&despachoAgente?despachoAgente.enlacesNavegacion(c?{texto:v,lat:+c[1],lon:+c[2]}:{texto:v}):null;
  for(const [id,k] of [['btnWaze','waze'],['btnMaps','maps']]){
    const a=ge(id);if(!a)continue;
    if(l){a.href=l[k];a.classList.remove('off');a.removeAttribute('aria-disabled');}
    else{a.removeAttribute('href');a.classList.add('off');a.setAttribute('aria-disabled','true');}
  }
}
// Mientras se escribe el despacho, la ubicación se va llenando sola (si no la corrigieron a mano).
function autoUbicacion(texto){
  const du=ge('dubic');if(!du||du.dataset.manual||!despachoAgente)return;
  const u=despachoAgente.extraerUbicacion(texto);
  du.value=u?u.texto:'';du.classList.toggle('auto-field',!!u);pintarNav();
}
document.addEventListener('input',e=>{if(e.target.id==='dtxt')autoUbicacion(e.target.value);});
document.addEventListener('input',e=>{if(e.target.id==='dubic')e.target.dataset.manual=e.target.value?'1':'';});
function interpDesp(){
  const txt=(ge('dtxt')||{value:''}).value;if(!txt.trim()){alert('Ingresá el texto primero.');return;}
  ultimoDespacho=despachoAgente.interpretarDespacho(txt,{CODS,ENF,EPP_POR_TIPO});
  const du=ge('dubic');if(du&&ultimoDespacho.ubicacion){du.value=ultimoDespacho.ubicacion.texto;du.classList.add('auto-field');}
  pintarNav();
  addMsg('user','📻 Despacho: '+txt);addMsg('assistant','📻 DESPACHO INTERPRETADO (motor local)\n\n'+ultimoDespacho.resumen);
  procesarDespacho(txt);ge('guiaCard')?.scrollIntoView({behavior:'smooth',block:'start'});
  // autocompleta boleta automáticamente (marcado 🤖, editable)
  const auto=documentacionAgente.autocompletarBoleta(boleta,{despacho:ultimoDespacho});
  auto.forEach(p=>boletaAuto.add(p));
  guardarEstado();
}

// ═══════════════════════════════════════════════════
// GUÍA DE ARRIBO + 3 IMPRESIONES DIAGNÓSTICAS (motor local)
// ═══════════════════════════════════════════════════
// Análisis en vivo: mientras se graba, cada ~12 s se transcribe solo lo nuevo
// (Whisper local) y la guía de arribo se va actualizando.
let vivoTexto='',vivoHasta=0,vivoTimer=null,vivoOcupado=false;
function iniciarVivo(getChunks,mime,destino){
  vivoTexto='';vivoHasta=0;vivoOcupado=false;
  const marca=ge('guiaVivo');if(marca)marca.hidden=false;
  clearInterval(vivoTimer);
  vivoTimer=setInterval(async()=>{
    if(vivoOcupado||!whisperListo||!whisperAgente?.transcribirDesde)return;
    vivoOcupado=true;
    try{
      const r=await whisperAgente.transcribirDesde(new Blob(getChunks(),{type:mime}),vivoHasta);
      vivoHasta=r.hasta;
      if(r.texto){
        vivoTexto=(vivoTexto+' '+r.texto).trim();
        const st=ge(destino==='desp'?'rtxt':'rtxt2');if(st){st.style.display='block';st.textContent='🎧 '+vivoTexto;}
        const dt=ge('dtxt');
        if(destino==='desp'&&dt&&(!dt.value.trim()||dt.dataset.vivo)){dt.value=vivoTexto;dt.dataset.vivo='1';autoUbicacion(vivoTexto);}
        pintarGuia();
      }
    }catch(e){console.warn('vivo',e);}
    vivoOcupado=false;
  },12000);
}
function detenerVivo(){
  clearInterval(vivoTimer);vivoTimer=null;
  const marca=ge('guiaVivo');if(marca)marca.hidden=true;
}
// ── Marcas de hora, NEWS2, trauma ROJO, metrónomo RCP y prealerta ──
let marcas=[];   // {k,nombre,hora,ms}
function marcarHora(k,nombre){
  const ahora=new Date();
  const hora=ahora.toLocaleTimeString('es-CR',{hour:'2-digit',minute:'2-digit'});
  marcas=marcas.filter(m=>m.k!==k);
  marcas.push({k,nombre,hora,ms:ahora.getTime()});
  notas.push({ts:nowStr(),txt:`⏱️ ${nombre}: ${hora}`});renderNotas();
  guardarEstado();pintarGuia();
}
function haceCuanto(ms){const m=Math.floor((Date.now()-ms)/60000);return m<60?`hace ${m} min`:`hace ${Math.floor(m/60)} h ${m%60} min`;}
function htmlMarcas(impresiones){
  const ids=impresiones.filter(d=>d.conf!=='descartar').map(d=>d.id);
  const lista=[...herrAgente.MARCAS_SIEMPRE];
  for(const id of ids)for(const x of (herrAgente.MARCAS[id]||[]))if(!lista.some(y=>y[0]===x[0]))lista.push(x);
  const hechas=marcas.map(m=>{
    const alerta=m.k==='torniquete'&&Date.now()-m.ms>=2*3600000?' ⚠️ más de 2 h':'';
    return `<div class="marca-h"><b>${escHtml(m.nombre)}</b> ${m.hora} · ${haceCuanto(m.ms)}${alerta}</div>`;}).join('');
  return `<div class="g-sec"><h4>⏱️ Marcar la hora (un toque)</h4>
    <div class="marcas">${lista.map(([k,n])=>`<button class="btn-marca${marcas.some(m=>m.k===k)?' hecha':''}" onclick="marcarHora('${k}','${escHtml(n)}')">${escHtml(n)}</button>`).join('')}</div>${hechas}
    ${ids.includes('pcr')?`<button class="btn-red" style="margin-top:6px;" onclick="metronomo()" id="btnMetro">${metroOn?'⏹ Detener metrónomo':'🫀 Metrónomo RCP 110/min'}</button>`:''}</div>`;
}
function htmlGravedad(g){
  const sv=boleta.sv1||{};
  if(!Object.values(sv).some(v=>String(v||'').trim()))return '';
  const n=herrAgente.news2(sv,false);
  let h=`<div class="g-sec"><h4>📊 Gravedad con los signos vitales</h4>`;
  if(n.partes.length||n.completo)h+=`<div class="news ${n.riesgo}"><b>NEWS2 = ${n.total}</b> (riesgo ${n.riesgo})${n.falta.length?` · faltan: ${n.falta.join(', ')}`:''}<br>${escHtml(n.accion)}</div>`;
  const trauma=g.impresiones.some(d=>d.g==='Trauma'&&d.conf!=='descartar');
  if(trauma){
    const rojo=herrAgente.traumaRojo(sv,g.contexto.edad??null);
    h+=rojo.length?`<div class="news alto">🚨 <b>Trauma grave (criterio ROJO):</b> ${escHtml(rojo.join(', '))} → centro de trauma de mayor nivel.</div>`
      :`<div class="nota">Revisá también las lesiones que son criterio ROJO:</div>`;
    h+=herrAgente.TRAUMA_ROJO_LESIONES.map(x=>`<label><input type="checkbox" data-k="${escHtml('rojo|'+x)}" ${guiaHechos.has('rojo|'+x)?'checked':''}><span>${escHtml(x)}</span></label>`).join('');
  }
  return h+'</div>';
}
// Metrónomo de RCP: 110/min y aviso cada 2 min para cambiar de compresor y revisar con el DEA.
let metroOn=false,metroInt=null,metroCiclo=null,metroCtx=null;
function pitido(f=880,dur=0.05,vol=0.3){
  try{metroCtx=metroCtx||new (window.AudioContext||window.webkitAudioContext)();
    const o=metroCtx.createOscillator(),g=metroCtx.createGain();o.frequency.value=f;g.gain.value=vol;o.connect(g);g.connect(metroCtx.destination);o.start();o.stop(metroCtx.currentTime+dur);}catch{}
}
function metronomo(){
  metroOn=!metroOn;
  clearInterval(metroInt);clearInterval(metroCiclo);
  if(metroOn){
    if(!marcas.some(m=>m.k==='inicioRCP'))marcarHora('inicioRCP','🫀 Inicio RCP');
    metroInt=setInterval(()=>pitido(),545);
    metroCiclo=setInterval(()=>{pitido(440,0.6,0.5);navigator.vibrate?.([300,100,300]);
      alert('⏱️ 2 minutos: cambiar de compresor y analizar con el DEA.');},120000);
  }
  const b=ge('btnMetro');if(b)b.textContent=metroOn?'⏹ Detener metrónomo':'🫀 Metrónomo RCP 110/min';
}
function verPrealerta(){
  const texto=herrAgente.prealerta({boleta,impresiones:ultimaGuia?.impresiones||[],marcas,ctx:ultimaGuia?.contexto||{}});
  const el=ge('prealertaBox');if(!el)return;
  el.hidden=false;
  el.innerHTML=`<div class="lbl" style="color:#93C5FD;">📻 Prealerta IMIST-AMBO</div>
    <textarea id="prealertaTxt" rows="9" style="font-size:14px;line-height:1.5;">${escHtml(texto)}</textarea>
    <div class="g2"><button class="btn-gray" onclick="copiarPrealerta()">📋 Copiar</button><button class="btn-gray" onclick="compartirPrealerta()">📤 Compartir</button></div>
    <div class="nota">Leela por radio en este orden. Completá lo que diga (entre paréntesis).</div>`;
  el.scrollIntoView({behavior:'smooth',block:'start'});
}
async function copiarPrealerta(){try{await navigator.clipboard.writeText(ge('prealertaTxt').value);alert('Copiada.');}catch{ge('prealertaTxt').select();}}
async function compartirPrealerta(){
  const t=ge('prealertaTxt').value;
  if(!confirm('La prealerta puede tener datos del paciente. ¿Compartirla?'))return;
  try{if(navigator.share)await navigator.share({text:t});else copiarPrealerta();}catch(e){}
}
// ── Copia temporal para revisión (opcional, con PIN) ──
function revCfg(){try{return {on:localStorage.getItem('crcr-rev')==='1',pin:localStorage.getItem('crcr-rev-pin')||''};}catch{return {on:false,pin:''};}}
function pintarRevision(){
  const c=revCfg();const on=ge('revOn');if(!on)return;
  on.checked=c.on;ge('revPinBox').hidden=!c.on;ge('revPin').value=c.pin;
  ge('revNota').textContent=c.on&&c.pin.length<12?'⚠️ Falta el código de revisión (o es el viejo de 6 números): escribí el código nuevo completo para que se suban.':c.on?'Cada grabación (audio + transcripción) se sube a un almacenamiento privado para revisarla y después se borra. Necesita señal; si no hay, queda pendiente.':'Las grabaciones quedan solo en este teléfono.';
}
function cambiarRevision(){
  const on=ge('revOn').checked;
  if(on&&!confirm('Las grabaciones pueden tener datos del paciente (voz, nombre, ubicación). Se subirán a un almacenamiento privado solo para revisión y se borrarán después. ¿Activar?')){ge('revOn').checked=false;return;}
  try{localStorage.setItem('crcr-rev',on?'1':'0');}catch{}
  pintarRevision();if(on)subirPendientes();
}
function guardarPinRev(){try{localStorage.setItem('crcr-rev-pin',ge('revPin').value.trim().slice(0,40));}catch{}pintarRevision();subirPendientes();}
async function subirArchivo(f,pin){
  const r=await fetch('./api/subir',{method:'POST',headers:{'content-type':f.type||'application/octet-stream','x-pin':pin,'x-nombre':f.name},body:f});
  if(!r.ok){let m='';try{m=(await r.json()).error;}catch{}throw new Error(m||('HTTP '+r.status));}
}
let subiendo=false;
async function subirPendientes(){
  const c=revCfg();if(!c.on||c.pin.length<12||!navigator.onLine||subiendo)return;
  subiendo=true;
  try{
    for(const r of recs){
      if(r.subido||!r.blob)continue;
      try{
        await subirArchivo(archivoDeGrabacion(r),c.pin);
        await subirArchivo(archivoTranscripcion(r),c.pin);
        r.subido=true;
        const {url,...guardar}=r;storeAgente.guardarGrabacion(guardar);
      }catch(e){ge('revNota').textContent='⚠️ No se pudo subir: '+e.message;if(/C[oó]digo/.test(e.message))break;}
    }
    renderRecs();
  }finally{subiendo=false;}
}
window.addEventListener('online',subirPendientes);
function cambiarVoz(v){
  try{localStorage.setItem('crcr-voz',v);}catch{}
  whisperListo=false;
  const st=ge('rtxt');if(st){st.style.display='block';st.textContent=v==='preciso'?'⏳ Cargando el motor preciso (la primera vez descarga 77 MB; después funciona sin señal)…':'⏳ Cargando el motor rápido…';}
  whisperAgente?.precargarModelo().then(()=>{whisperListo=true;if(st)st.textContent='✅ Motor de voz listo.';}).catch(e=>{if(st)st.textContent='⚠️ No se pudo cargar el motor: '+e.message;});
}
document.addEventListener('DOMContentLoaded',()=>{try{const v=localStorage.getItem('crcr-voz');const s=ge('vozModo');if(s&&v)s.value=v;}catch{}});
let ultimaGuia=null,guiaTimer=null;
const guiaHechos=new Set();
const escHtml=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Todo lo que se sabe del caso: despacho, grabaciones, notas y entrevista.
function textoDelCaso(){
  return [(ge('dtxt')||{}).value,trans,trans2,vivoTexto,notas.map(n=>n.txt).join(' '),
    Object.values(boleta.sam||{}).join(' '),Object.values(boleta.opr||{}).join(' ')].filter(Boolean).join('. ');
}
function htmlImpresiones(imp,triadas,dondeBoton){
  if(!imp.length)return '<div class="guia-vacia">Todavía no hay datos suficientes para una impresión diagnóstica.</div>';
  const conf={alta:'Más probable',media:'Posible',baja:'Menos probable',descartar:'Descartar'};
  let h='';
  if(triadas.length)h+=triadas.map(t=>`<div class="triada">⚠️ <b>${escHtml(t.n)}</b> (${t.si.length}/3) → sospechá <b>${escHtml(t.que)}</b>.<br>Presente: ${escHtml(t.si.join(', '))}.${t.no.length?`<br><b>Buscá:</b> ${escHtml(t.no.join(', '))}.`:''}${t.extra?'<br>'+escHtml(t.extra):''}</div>`).join('');
  h+='<div class="imp">'+imp.map((d,i)=>`<div class="imp-it ${d.conf}">
    <div class="imp-c">Impresión ${i+1} · ${conf[d.conf]||''}</div>
    <div class="imp-n">${escHtml(d.n)}</div>
    <div class="imp-por">Por: ${escHtml(d.por.join(', '))}</div>
    <ul>${d.confirmar.slice(0,i===0?4:2).map(c=>`<li>${escHtml(c)}</li>`).join('')}</ul></div>`).join('')+'</div>';
  h+=`<button class="btn-blue" style="width:100%;" onclick="usarImpresiones('${dondeBoton}')">📋 Pasar estas 3 a la boleta</button>
    <div class="guia-vacia" style="font-size:12.5px;">Es una ayuda: confirmá con tu valoración antes de anotarlas.</div>`;
  return h;
}
function pintarGuia(texto){
  const el=ge('guiaCont');if(!el||!arriboAgente)return;
  texto=texto??textoDelCaso();
  if(!texto.trim()){ultimaGuia=null;return;}
  const g=arriboAgente.guiaArribo(texto,{ENF,SIGNOS,EPP_POR_TIPO,sv:boleta.sv1});
  ultimaGuia=g;
  const dondeEsta=(ge('dubic')||{value:''}).value.trim();
  const up=ubicPaciente;
  let h=dondeEsta?`<div class="donde"><div>📍 <b>Paciente:</b> ${escHtml(dondeEsta)}</div>${up?`<div class="nota">Ubicado: ${escHtml(up.texto)}${up.precision==='localidad'?' (aproximado)':''}${up.lejos>60?` <b class="c-a">⚠️ queda a ${up.lejos} km de la unidad: confirmá con la central o marcalo en el mapa</b>`:''}${up.ruta?` · <b>${up.ruta.min} min</b> (${up.ruta.km} km) desde la unidad, sin tránsito`:''}</div>`:''}<button class="btn-red" onclick="abrirMapaSinSenal()">🗺️ Ver al paciente en el mapa y la ruta</button></div>`:'';
  h+=htmlImpresiones(g.impresiones,g.triadas,'guia');
  if(herrAgente){h+=htmlMarcas(g.impresiones);h+=htmlGravedad(g);}
  for(const sec of g.secciones){
    if(sec.id==='triadas')continue;
    h+=`<div class="g-sec"><h4>${escHtml(sec.t)}</h4>${sec.items.map(it=>{
      const k=sec.id+'|'+it;
      return `<label><input type="checkbox" data-k="${escHtml(k)}" ${guiaHechos.has(k)?'checked':''}><span>${it}</span></label>`;}).join('')}
      ${sec.enf&&SIGNOS[sec.enf]?`<button class="btn-gray" style="width:100%;margin-top:4px;" onclick="verSignos('${sec.enf}')">🧍 Ver en el mapa del cuerpo</button>`:''}</div>`;
  }
  const dest=herrAgente&&g.impresiones.filter(d=>d.conf!=='descartar').map(d=>herrAgente.DESTINO[d.id]).find(Boolean);
  if(dest)h+=`<div class="g-sec"><h4>🏥 Destino</h4><div style="font-size:14px;line-height:1.5;">${escHtml(dest)}</div></div>`;
  if(herrAgente)h+=`<button class="btn-blue" style="width:100%;margin-top:8px;" onclick="verPrealerta()">📻 Armar prealerta para el hospital (IMIST-AMBO)</button>`;
  el.innerHTML=h;
}
document.addEventListener('change',e=>{
  const k=e.target?.dataset?.k;if(!k||!e.target.closest('#guiaCont'))return;
  if(e.target.checked)guiaHechos.add(k);else guiaHechos.delete(k);
});
function verSignos(id){go('enf');showEnfD(id);}
function usarImpresiones(origen){
  const imp=origen==='boleta'?impresionesBoleta:(ultimaGuia?.impresiones||[]);
  if(!imp.length)return;
  const ya=['dx1','dx2','dx3'].filter(f=>boleta[f]);
  if(ya.length&&!confirm('La boleta ya tiene impresión diagnóstica. ¿Reemplazarla por estas 3?'))return;
  imp.slice(0,3).forEach((d,i)=>{const f='dx'+(i+1);boleta[f]=d.n;boletaAuto.delete(f);});
  guardarEstado();
  if(origen==='boleta')renderBol();else alert('✅ Las 3 impresiones quedaron en la boleta (pestaña Signos vitales → Impresión diagnóstica). Podés editarlas ahí.');
}
let impresionesBoleta=[];
function sugerirEnBoleta(){
  const texto=textoDelCaso();
  const ctx=arriboAgente.contextoPaciente(texto);
  impresionesBoleta=impresionAgente.tresImpresiones(texto,{sv:boleta.sv1,ctx});
  const tri=impresionAgente.triadasPresentes(texto,{sv:boleta.sv1});
  const el=ge('bolImp');if(el)el.innerHTML=htmlImpresiones(impresionesBoleta,tri,'boleta');
}
// Mientras se escribe el despacho, la guía se actualiza sola.
document.addEventListener('input',e=>{
  if(e.target.id!=='dtxt')return;
  clearTimeout(guiaTimer);guiaTimer=setTimeout(()=>pintarGuia(),350);
});

// ═══════════════════════════════════════════════════
// TRIAGE
// ═══════════════════════════════════════════════════
function pasosTr(){return trModo==='ni'?TSTEPS_NINO:TSTEPS;}
function modoTriage(m){
  trModo=m;
  ge('trm-ad')?.classList.toggle('on',m==='ad');ge('trm-ni')?.classList.toggle('on',m==='ni');
  resetTriage();
}
function renderTr(){
  const q=pasosTr()[trStep];
  const l=ge('trlbl'),qe=ge('trq'),h=ge('trh'),r=ge('trres');
  if(l)l.textContent=(trModo==='ni'?'JumpSTART (niño)':'START (adulto)')+' — Paso '+(trStep+1);
  if(qe)qe.textContent=q?q.q:'';
  if(h){h.textContent=q?.h||'';h.style.display=q?.h?'block':'none';}
  if(r)r.style.display='none';
}
function renderTrLevels(){
  const el=ge('trlevels');if(!el)return;
  el.innerHTML=Object.entries(TNIV).map(([code,n])=>`<div style="display:flex;gap:10px;align-items:center;background:#1E293B;border-radius:7px;padding:8px 10px;border-left:4px solid ${n.c};margin-bottom:4px;"><div style="font-weight:800;color:${n.c};min-width:75px;font-size:14px;">${code}</div><div><div style="font-size:14px;font-weight:700;">${n.l}</div><div style="font-size:13px;color:#94A3B8;">${n.d}</div></div></div>`).join('');
}
function answTriage(si){
  const q=pasosTr()[trStep];if(!q)return;
  const next=si?q.si:q.no;
  if(typeof next==='string'){showTrRes(next);return;}
  trStep=next;renderTr();
}
function showTrRes(code){
  const n=TNIV[code];boleta.trc=code;guardarEstado();
  const r=ge('trres'),q=ge('trq'),b=ge('tbadge');
  const acciones=vitalsAgente.accionesTriage(code);
  if(r){r.style.display='block';r.style.border='2px solid '+n.c;r.style.background=n.bg;
    r.innerHTML=`<div style="text-align:center;gap:8px;display:flex;flex-direction:column;"><div style="font-size:34px;font-weight:900;color:${n.c};">${code}</div><div style="font-size:15px;font-weight:700;">${n.l}</div><div style="font-size:14px;color:#94A3B8;">${n.d}</div></div>
    <div style="margin-top:8px;font-size:13px;color:#F1F5F9;line-height:1.7;">${acciones.join('<br>')}</div>`;}
  if(q)q.style.display='none';
  const th=ge('trh');if(th)th.style.display='none';
  ge('trbuts').style.display='none';
  if(b){b.style.display='block';b.innerHTML=`<span style="background:${n.c};color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:800;">Triage: ${code}</span>`;}
}
function resetTriage(){
  trStep=0;
  const r=ge('trres'),q=ge('trq'),bt=ge('trbuts');
  if(r)r.style.display='none';if(q)q.style.display='block';if(bt)bt.style.display='flex';
  const b=ge('tbadge');if(b)b.style.display='none';
  renderTr();
}
function adj(c,d){trCts[c]=Math.max(0,(trCts[c]||0)+d);
  const m={r:'cr',a:'ca',v:'cv',n:'cn'};const el=ge(m[c]);if(el)el.textContent=trCts[c];
  const tot=Object.values(trCts).reduce((a,b)=>a+b,0);const tel=ge('ctotal');if(tel)tel.textContent='Total: '+tot+' víctimas';
  guardarEstado();}
function resetC(){Object.keys(trCts).forEach(c=>{trCts[c]=0;const m={r:'cr',a:'ca',v:'cv',n:'cn'};const el=ge(m[c]);if(el)el.textContent='0';});const t=ge('ctotal');if(t)t.textContent='Total: 0 víctimas';guardarEstado();}

// ═══════════════════════════════════════════════════
// SAMPLE / OPQRST — Agente de Entrevista
// ═══════════════════════════════════════════════════
function initSO(){
  const sf=ge('sfields');
  if(sf)sf.innerHTML=SCAMPOS.map(c=>`<div style="margin-bottom:7px;"><div style="font-size:13px;color:#DC2626;font-weight:800;text-transform:uppercase;margin-bottom:2px;">${c.l} ${boletaAuto.has('sam.'+c.k)?'<span class="auto-badge">🤖 auto</span>':''}</div><textarea id="sf-${c.k}" rows="2" placeholder="${c.h}" style="width:100%;" onchange="boleta.sam['${c.k}']=this.value;boletaAuto.delete('sam.${c.k}');guardarEstado();">${boleta.sam[c.k]||''}</textarea></div>`).join('');
  const of=ge('ofields');
  if(of)of.innerHTML=OCAMPOS.map(c=>`<div style="margin-bottom:7px;"><div style="font-size:13px;color:#DC2626;font-weight:800;text-transform:uppercase;margin-bottom:2px;">${c.l} ${boletaAuto.has('opr.'+c.k)?'<span class="auto-badge">🤖 auto</span>':''}</div><textarea id="of-${c.k}" rows="2" placeholder="${c.h}" style="width:100%;" onchange="boleta.opr['${c.k}']=this.value;boletaAuto.delete('opr.${c.k}');guardarEstado();">${boleta.opr[c.k]||''}</textarea></div>`).join('');
}
function aplicarExtraccionEntrevista(texto){
  const sam=entrevistaAgente.extraerSAMPLE(texto);
  const opr=entrevistaAgente.extraerOPQRST(texto);
  Object.entries(sam).forEach(([k,v])=>{ if(v && !boleta.sam[k]){boleta.sam[k]=v;boletaAuto.add('sam.'+k);} });
  Object.entries(opr).forEach(([k,v])=>{ if(v && !boleta.opr[k]){boleta.opr[k]=v;boletaAuto.add('opr.'+k);} });
  initSO();
  // La impresión diagnóstica no se autollena: se sugiere y el socorrista la confirma.
  pintarGuia();
  guardarEstado();
}
function analyzeSO(){
  const texto=SCAMPOS.map(c=>(ge('sf-'+c.k)||{value:''}).value).join(' ')+' '+OCAMPOS.map(c=>(ge('of-'+c.k)||{value:''}).value).join(' ');
  const dx=diagnosticoAgente.sugerirDiagnosticos(texto,ENF);
  const texto2='🧠 ANÁLISIS CLÍNICO (motor local)\n\n'+
    (dx.length?'Cuadros posibles según lo escrito: '+dx.map(d=>`${d.i} ${d.t} (${d.e||'—'})`).join(', ')
              :'No hay coincidencia clara con ningún cuadro conocido en la base offline — completá más SAMPLE/OPQRST o revisá manualmente en Enfermedades.');
  addMsg('assistant',texto2);go('chat');
}

// ═══════════════════════════════════════════════════
// BOLETA APA
// ═══════════════════════════════════════════════════
function setbt(t){
  bolTab=t;
  document.querySelectorAll('[id^="bt-"]').forEach(b=>{b.style.background='#1E293B';b.style.color='#94A3B8';});
  const btn=ge('bt-'+t);if(btn){btn.style.background='#DC2626';btn.style.color='#fff';}
  renderBol();
}
function campoEditado(path){ boletaAuto.delete(path); guardarEstado(); }
function badge(path){ return boletaAuto.has(path)?' <span class="auto-badge">🤖 auto — revisar</span>':''; }
function autoCls(path){ return boletaAuto.has(path)?' auto-field':''; }
function svI(fld,f,ph){return `<div style="display:flex;flex-direction:column;gap:2px;align-items:center;"><div style="font-size:11px;color:#475569;font-weight:700;text-transform:uppercase;text-align:center;">${ph}</div><input value="${boleta[fld][f]||''}" style="background:#080E1A;border:1px solid #334155;border-radius:5px;padding:6px 3px;color:#34D399;font-size:15px;font-family:monospace;text-align:center;width:100%;" onchange="boleta['${fld}']['${f}']=this.value;guardarEstado();renderBol();"></div>`;}
function renderBol(){
  const c=ge('bcontent');if(!c)return;
  const b=boleta,t=bolTab;let h='';
  if(t==='veh')h=`<div class="card"><div class="lbl">🚑 Vehículo</div>
    <div class="g2">
      <div class="fld"><div class="flbl">Unidad</div><input value="${b.un}" onchange="boleta.un=this.value;campoEditado('un')" class="${autoCls('un')}" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Placa</div><input value="${b.pl}" onchange="boleta.pl=this.value;guardarEstado()" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Consecutivo</div><input value="${b.co}" onchange="boleta.co=this.value;guardarEstado()" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Formulario #</div><input value="${b.fo}" onchange="boleta.fo=this.value;guardarEstado()" style="width:100%;"></div>
    </div>
    <div class="fld"><div class="flbl">Tipo unidad</div>
      <select onchange="boleta.tu=this.value;guardarEstado()" style="width:100%;">
        ${['USVB','USVA','USVM','Otro'].map(o=>`<option ${b.tu===o?'selected':''}>${o}</option>`).join('')}
      </select>
    </div></div>
    <div class="card"><div class="lbl">👥 Tripulación</div>
      ${b.trip.map((t2,i)=>`<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;"><div style="background:#DC2626;border-radius:5px;padding:4px 7px;font-size:13px;font-weight:800;color:#fff;flex-shrink:0;min-width:36px;text-align:center;">${t2.p}</div><input style="flex:1;" placeholder="${t2.p}" value="${t2.n}" onchange="boleta.trip[${i}].n=this.value;guardarEstado()"></div>`).join('')}
    </div>`;
  else if(t==='desp')h=`<div class="card"><div class="lbl">📻 Horas</div>
    <div class="g2">
      <div class="fld"><div class="flbl">Salida</div><input type="time" value="${b.hsal}" onchange="boleta.hsal=this.value;campoEditado('hsal')" class="${autoCls('hsal')}" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Llegada escena</div><input type="time" value="${b.hle}" onchange="boleta.hle=this.value;campoEditado('hle')" class="${autoCls('hle')}" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Llegada hospital</div><input type="time" value="${b.hlh}" onchange="boleta.hlh=this.value;guardarEstado()" style="width:100%;"></div>
      <div class="fld"><div class="flbl">En base</div><input type="time" value="${b.hba}" onchange="boleta.hba=this.value;guardarEstado()" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Despachador</div><input value="${b.des}" onchange="boleta.des=this.value;guardarEstado()" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Código CRC${badge('cod')}</div><input value="${b.cod}" onchange="boleta.cod=this.value;campoEditado('cod')" class="${autoCls('cod')}" style="width:100%;"></div>
    </div></div>
    <div class="card"><div class="lbl">📍 Dirección</div>
    <div class="g2">
      <div class="fld"><div class="flbl">Provincia</div><input value="${b.prov}" onchange="boleta.prov=this.value;guardarEstado()" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Cantón</div><input value="${b.cant}" onchange="boleta.cant=this.value;guardarEstado()" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Calle</div><input value="${b.cal}" onchange="boleta.cal=this.value;guardarEstado()" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Avenida</div><input value="${b.av}" onchange="boleta.av=this.value;guardarEstado()" style="width:100%;"></div>
    </div>
    <div class="fld"><div class="flbl">Otras señas</div><textarea rows="2" style="width:100%;" onchange="boleta.os=this.value;guardarEstado()">${b.os}</textarea></div>
    <div class="fld"><div class="flbl">Tipo despacho</div>
      <select onchange="boleta.td=this.value;guardarEstado()" style="width:100%;">
        ${['Medico','Accidente Tránsito','Trauma','GinecoObstétrico','Pediátrico','Alerta Aeropuerto','Administrativo'].map(o=>`<option ${b.td===o?'selected':''}>${o}</option>`).join('')}
      </select>
    </div>
    <div class="fld"><div class="flbl">Info Despacho${badge('id')}</div><textarea rows="2" style="width:100%;" class="${autoCls('id')}" onchange="boleta.id=this.value;campoEditado('id')">${b.id}</textarea></div>
    </div>`;
  else if(t==='pac')h=`<div class="card"><div class="lbl">👤 Paciente</div>
    <div class="fld"><div class="flbl">Nombre completo${badge('nom')}</div><input value="${b.nom}" onchange="boleta.nom=this.value;campoEditado('nom')" class="${autoCls('nom')}" style="width:100%;"></div>
    <div class="g2">
      <div class="fld"><div class="flbl">Cédula${badge('ced')}</div><input value="${b.ced}" onchange="boleta.ced=this.value;campoEditado('ced')" class="${autoCls('ced')}" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Fecha Nac.</div><input value="${b.fnac}" onchange="boleta.fnac=this.value;guardarEstado()" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Edad</div><input value="${b.edad}" onchange="boleta.edad=this.value;campoEditado('edad')" class="${autoCls('edad')}" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Género</div><select onchange="boleta.gen=this.value;guardarEstado()" style="width:100%;"><option ${b.gen==='M'?'selected':''}>M</option><option ${b.gen==='F'?'selected':''}>F</option><option ${b.gen==='Otro'?'selected':''}>Otro</option></select></div>
      <div class="fld"><div class="flbl">Dom. Provincia</div><input value="${b.dp}" onchange="boleta.dp=this.value;guardarEstado()" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Dom. Cantón</div><input value="${b.dc}" onchange="boleta.dc=this.value;guardarEstado()" style="width:100%;"></div>
    </div>
    <div class="fld"><div class="flbl">Otras señas domicilio</div><textarea rows="2" style="width:100%;" onchange="boleta.do_=this.value;guardarEstado()">${b.do_}</textarea></div>
    <div class="g2">
      <div class="fld"><div class="flbl">Acompañante</div><input value="${b.ac}" onchange="boleta.ac=this.value;guardarEstado()" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Teléfono</div><input value="${b.tel}" onchange="boleta.tel=this.value;guardarEstado()" style="width:100%;"></div>
    </div>
    ${b.trc?`<div style="background:${TNIV[b.trc].c};border-radius:8px;padding:9px;text-align:center;font-weight:800;font-size:15px;color:#fff;">TRIAGE: ${b.trc}</div>`:''}
    </div>
    <div class="card"><div class="lbl">📷 Fotos — OCR local (Tesseract.js)</div>
      <div style="display:flex;gap:6px;">
        <label style="background:#DC2626;color:#fff;border-radius:7px;padding:8px 12px;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">📷 Cédula<input type="file" accept="image/*" capture="environment" style="display:none;" onchange="handleFoto(event,'Cédula')"></label>
        <label style="background:#1E293B;border:1px solid #334155;color:#94A3B8;border-radius:7px;padding:8px 12px;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">📷 Escena<input type="file" accept="image/*" capture="environment" style="display:none;" onchange="handleFoto(event,'Escena')"></label>
      </div>
      <div id="fl"></div>
      <div id="ocrStat" style="display:none;font-size:13px;color:#93C5FD;"></div>
    </div>`;
  else if(t==='sv'){
    const resumen=vitalsAgente.resumenSignosVitales(b.sv1);
    h=`<div class="card"><div class="lbl">1ª Toma</div>
    <div class="fld"><div class="flbl">Hora</div><input type="time" value="${b.sv1.h}" onchange="boleta.sv1.h=this.value;guardarEstado()" style="width:100%;"></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:4px;">
      ${svI('sv1','fc','FC (lpm)')}${svI('sv1','fr','FR (rpm)')}${svI('sv1','pa1','PA Sist.')}
      ${svI('sv1','pa2','PA Diast.')}${svI('sv1','spo2','SpO₂ %')}${svI('sv1','gcs','Glasgow')}
      ${svI('sv1','glu','Glucosa')}${svI('sv1','et','EtCO₂')}${svI('sv1','temp','Temp °C')}
    </div>
    <div style="margin-top:6px;"><div class="lbl" style="margin-bottom:4px;">GCS Pupilas</div>
      <div style="display:flex;gap:6px;">${svI('sv1','pO','Ocular')}${svI('sv1','pV','Verbal')}${svI('sv1','pM','Motora')}</div>
    </div>
    <div class="g2" style="margin-top:6px;">
      <div class="fld"><div class="flbl">Peso (kg)</div><input value="${b.sv1.pe}" onchange="boleta.sv1.pe=this.value;guardarEstado()" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Talla (cm)</div><input value="${b.sv1.ta}" onchange="boleta.sv1.ta=this.value;guardarEstado()" style="width:100%;"></div>
    </div>
    ${Object.keys(resumen.evaluacion).length?`<div style="background:#080E1A;border-radius:6px;padding:8px;margin-top:6px;font-size:13px;color:#CBD5E1;white-space:pre-wrap;line-height:1.6;">${resumen.texto}</div>`:''}
    </div>
    <div class="card"><div class="lbl">2ª Toma</div>
    <div class="fld"><div class="flbl">Hora</div><input type="time" value="${b.sv2.h}" onchange="boleta.sv2.h=this.value;guardarEstado()" style="width:100%;"></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:4px;">
      ${svI('sv2','fc','FC')}${svI('sv2','fr','FR')}${svI('sv2','pa1','PA Sist.')}
      ${svI('sv2','pa2','PA Diast.')}${svI('sv2','spo2','SpO₂')}${svI('sv2','gcs','Glasgow')}
    </div></div>
    <div class="card"><div class="lbl">Impresión diagnóstica</div>
      <button class="btn-blue" onclick="sugerirEnBoleta()">🧠 Sugerir 3 impresiones con todo lo registrado</button>
      <div id="bolImp" style="display:flex;flex-direction:column;gap:8px;"></div>
      ${['dx1','dx2','dx3'].map((f,i)=>`<div class="fld"><div class="flbl">Dx ${i+1}${badge(f)}</div><input value="${b[f]}" onchange="boleta.${f}=this.value;campoEditado('${f}')" class="${autoCls(f)}" placeholder="CIE-10 / descripción" style="width:100%;"></div>`).join('')}
    </div>`;
  }
  else if(t==='exf')h=`<div class="card"><div class="lbl">📋 Antecedentes</div>
    <div class="g2">
      ${Object.entries({al:'Alergias',ps:'Psiquiátrico',as:'Asma',vi:'VIH',ca:'Cáncer',cd:'Cardiopatía',hp:'Hepatopatías',ht:'Hipertensión',dm:'D. Mellitus',di:'Digestivos',ep:'Epilepsia',ec:'EPOC',ne:'Neurológicos',nf:'Nefropatías'}).map(([k,l])=>
        `<label style="display:flex;align-items:center;gap:7px;background:${b.ant[k]?'#1A0606':'#1E293B'};border-radius:6px;padding:7px 9px;cursor:pointer;border:1px solid ${b.ant[k]?'#DC2626':'#334155'};"><input type="checkbox" ${b.ant[k]?'checked':''} style="width:15px;height:15px;accent-color:#DC2626;" onchange="boleta.ant['${k}']=this.checked;guardarEstado();renderBol()"><span style="font-size:13px;color:${b.ant[k]?'#FCA5A5':'#94A3B8'};">${l}</span></label>`
      ).join('')}
    </div></div>
    <div class="card"><div class="lbl">SAMPLE</div>
      ${SCAMPOS.map(sc=>`<div style="margin-bottom:6px;"><div style="font-size:13px;color:#DC2626;font-weight:800;margin-bottom:2px;">${sc.l}${badge('sam.'+sc.k)}</div><textarea rows="2" class="${autoCls('sam.'+sc.k)}" style="width:100%;" onchange="boleta.sam['${sc.k}']=this.value;campoEditado('sam.${sc.k}')">${b.sam[sc.k]||''}</textarea></div>`).join('')}
    </div>
    <div class="card"><div class="lbl">Hallazgos físicos${badge('hal')}</div><textarea rows="4" class="${autoCls('hal')}" style="width:100%;" onchange="boleta.hal=this.value;campoEditado('hal')">${b.hal||''}</textarea></div>
    <div class="card"><div class="lbl">Revisión primaria XABCDE</div>
      ${Object.entries({x:'X — Hemorragia masiva',a:'A — Vía aérea',b:'B — Ventilación',c:'C — Circulación',d:'D — Déficit neurológico',e:'E — Exposición'}).map(([k,l])=>
        `<div style="margin-bottom:6px;"><div style="font-size:13px;color:#DC2626;font-weight:800;margin-bottom:2px;">${l}</div><textarea rows="2" style="width:100%;" onchange="boleta.xab['${k}']=this.value;guardarEstado()">${b.xab[k]||''}</textarea></div>`
      ).join('')}
    </div>`;
  else if(t==='tto')h=`<div class="card"><div class="lbl">💉 Tratamiento</div><textarea rows="5" style="width:100%;" onchange="boleta.int=this.value;guardarEstado()">${b.int||''}</textarea></div>
    <div class="card"><div class="lbl">Observaciones</div><textarea rows="3" style="width:100%;" onchange="boleta.obs=this.value;guardarEstado()">${b.obs||''}</textarea></div>
    <div class="card"><div class="lbl">🏥 Destino</div>
    <div class="g2">
      <div class="fld"><div class="flbl">Hospital</div><input value="${b.dest}" onchange="boleta.dest=this.value;guardarEstado()" style="width:100%;"></div>
      <div class="fld"><div class="flbl">Médico receptor</div><input value="${b.med}" onchange="boleta.med=this.value;guardarEstado()" style="width:100%;"></div>
    </div></div>
    <button onclick="genSBAR()" class="btn-red">🏥 Generar reporte SBAR</button>
    <button onclick="exportarBoleta()" class="btn-gray" style="width:100%;">📄 Exportar boleta completa (.txt)</button>`;
  c.innerHTML=h;
  const fl=ge('fl');if(fl)renderFotos();
}
function autoBot(){
  const ctx={
    incidente:{u:(ge('inc-u')||{}).value,hd:(ge('inc-hd')||{}).value,hl:(ge('inc-hl')||{}).value},
    notas,
    despacho:ultimoDespacho,
  };
  const auto=documentacionAgente.autocompletarBoleta(boleta,ctx);
  auto.forEach(p=>boletaAuto.add(p));
  renderBol();guardarEstado();
  if(auto.size===0)alert('No había datos nuevos capturados para completar (despacho/notas/entrevista vacíos).');
}
function genSBAR(){
  const r=documentacionAgente.generarSBAR(boleta);
  addMsg('assistant',r);go('chat');
}
function exportarBoleta(){
  descargarTexto(documentacionAgente.exportarBoletaTexto(boleta), `boleta_${boleta.nom||'sin_nombre'}_${Date.now()}.txt`);
}
async function handleFoto(e,label){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async()=>{
    const id='f'+Date.now();boleta.fotos.push({id,label,d:reader.result,ts:nowStr()});renderFotos();guardarEstado();
    if(label==='Cédula')await ejecutarOCR(id,reader.result);
  };
  reader.readAsDataURL(file);
}
function renderFotos(){
  const el=ge('fl');if(!el)return;
  el.innerHTML=boleta.fotos.map(f=>`<div style="background:#1E293B;border-radius:8px;padding:8px;display:flex;gap:8px;align-items:center;margin-top:6px;"><img src="${f.d}" style="width:50px;height:50px;object-fit:cover;border-radius:5px;flex-shrink:0;"><div style="flex:1;"><div style="font-size:13px;font-weight:700;">${f.label} ${f.ok?'✅':''}</div><div style="font-size:12px;color:#475569;">${f.ts}</div></div><button onclick="boleta.fotos=boleta.fotos.filter(x=>x.id!=='${f.id}');renderFotos();guardarEstado()" style="background:transparent;color:#FCA5A5;font-size:16px;">×</button></div>`).join('');
}
async function ejecutarOCR(id,dataUrl){
  const st=ge('ocrStat');
  try{
    if(!ocrAgente)ocrAgente=await import('./engine/ocr.js');
    if(st){st.style.display='block';st.textContent='🔍 Leyendo cédula localmente (Tesseract)…';}
    const {nombre,cedula}=await ocrAgente.leerCedula(dataUrl);
    if(nombre && !boleta.nom){boleta.nom=nombre;boletaAuto.add('nom');}
    if(cedula && !boleta.ced){boleta.ced=cedula;boletaAuto.add('ced');}
    boleta.fotos=boleta.fotos.map(f=>f.id===id?{...f,ok:true}:f);
    if(st)st.textContent=(nombre||cedula)?`✅ OCR local detectó: ${nombre||'—'} ${cedula||''}`:'⚠️ OCR local no pudo leer datos claros — completá a mano.';
    renderBol();guardarEstado();
  }catch(e){
    console.error(e);
    if(st){st.style.display='block';st.textContent='⚠️ OCR local no disponible en este momento.';}
  }
}

// ═══════════════════════════════════════════════════
// ENFERMEDADES
// ═══════════════════════════════════════════════════
const ETAGS=['todos','cardíaco','neurológico','respiratorio','trauma','metabólico','obstétrico'];
const ETAGW={'cardíaco':['cardíaco','paro','infarto'],'neurológico':['AVC','convulsión','neurológico'],'respiratorio':['disnea','respiratorio','humo'],'trauma':['trauma','colisión','caída','blast'],'metabólico':['hipoglucemia','glucosa','sodio','metabólico'],'obstétrico':['parto','embarazo','obstétrico']};
function renderEnf(){
  if(enfSel){renderEnfD();return;}
  const search=(ge('esearch')||{value:''}).value.toLowerCase();
  const te=ge('etags');
  if(te)te.innerHTML=ETAGS.map(t=>`<button class="tab-btn" onclick="enfTag='${t}';renderEnf()" style="background:${enfTag===t?'#DC2626':'#1E293B'};color:${enfTag===t?'#fff':'#94A3B8'};flex-shrink:0;">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join('');
  const list=ge('elist');if(!list)return;
  const fil=ENF.filter(e=>{
    const ms=!search||e.t.toLowerCase().includes(search)||(e.e||'').toLowerCase().includes(search)||e.tags.some(tg=>tg.toLowerCase().includes(search));
    const mt=enfTag==='todos'||(ETAGW[enfTag]||[]).some(w=>e.tags.some(tg=>tg.toLowerCase().includes(w.toLowerCase())));
    return ms&&mt;
  });
  list.innerHTML=fil.map(e=>`<button onclick="showEnfD('${e.id}')" style="display:flex;align-items:center;gap:10px;background:#1E293B;border:1px solid #334155;border-radius:8px;padding:10px 12px;width:100%;margin-bottom:5px;text-align:left;font-family:inherit;cursor:pointer;"><span style="font-size:20px;flex-shrink:0;">${e.i}</span><div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:700;color:#F1F5F9;">${e.t}</div>${e.e?`<div style="font-size:12px;color:#DC2626;font-weight:800;margin-top:1px;">Código ${e.e}</div>`:''}</div><span style="color:#475569;font-size:16px;flex-shrink:0;">›</span></button>`).join('');
}
function showEnfD(id){enfSel=id;const lv=ge('elf'),dv=ge('edetail');if(lv)lv.style.display='none';if(dv){dv.style.display='block';renderEnfD();}}
// Mapa del cuerpo con los signos a ubicar en este código (dibujo propio, sin internet).
const SILUETA='<g fill="#1E293B" stroke="#334155" stroke-width="2">'+
  '<circle cx="100" cy="38" r="26"/>'+
  '<rect x="88" y="62" width="24" height="18" rx="6"/>'+
  '<path d="M58 84h84c10 0 18 8 18 18l-2 110c0 8-6 14-14 14h-6v-0H62h-6c-8 0-14-6-14-14l-2-110c0-10 8-18 18-18z"/>'+
  '<path d="M56 90c-12 2-18 12-20 24l-12 110c-1 8 10 10 12 2l18-104z"/>'+
  '<path d="M144 90c12 2 18 12 20 24l12 110c1 8-10 10-12 2l-18-104z"/>'+
  '<path d="M64 226h72l-4 186c0 8-14 8-16 0l-16-150-16 150c-2 8-16 8-16 0z"/>'+
  '</g>';
function mapaSignos(id){
  const lista=SIGNOS[id];
  if(!lista||!lista.length)return '';
  let marcas='',filas='';
  const usados={};
  lista.forEach(([zona,txt],i)=>{
    const n=i+1;
    (ZONAS[zona]||[]).forEach(([x,y])=>{
      const k=x+','+y,des=(usados[k]=(usados[k]||0)+1)-1;   // varias marcas en la misma zona se corren
      const cx=x+des*15,cy=y+des*4;
      marcas+=`<circle cx="${cx}" cy="${cy}" r="10" fill="#DC2626" stroke="#0F172A" stroke-width="2"/><text x="${cx}" y="${cy+4.5}" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">${n}</text>`;
    });
    const sinMarca=!ZONAS[zona];
    filas+=`<div class="signo"><span class="signo-n${sinMarca?' gen':''}">${sinMarca?(zona==='piel'?'🖐':'ℹ'):n}</span><span>${txt}</span></div>`;
  });
  return `<div class="card"><div class="lbl">🔍 Signos a ubicar</div>
    <div class="mapa-signos"><svg viewBox="0 0 200 420" role="img" aria-label="Dónde buscar los signos en el cuerpo">${SILUETA}${marcas}</svg>
    <div class="nota-mapa">El paciente de frente: su izquierda queda a tu derecha.</div></div>
    ${filas}</div>`;
}
function backEnf(){enfSel=null;const lv=ge('elf'),dv=ge('edetail');if(lv)lv.style.display='block';if(dv)dv.style.display='none';}
function renderEnfD(){
  const dv=ge('edetail');if(!dv)return;
  const e=ENF.find(x=>x.id===enfSel);if(!e){backEnf();return;}
  dv.innerHTML=`<div class="page"><button onclick="backEnf()" class="btn-gray" style="align-self:flex-start;width:auto;">‹ Volver</button>
  <div class="card" style="border:1px solid #DC2626;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;"><span style="font-size:28px;">${e.i}</span>
    <div><div style="font-size:16px;font-weight:800;">${e.t}</div>${e.e?`<div style="font-size:13px;color:#DC2626;font-weight:800;">Código CRC: ${e.e} — ${CODS[e.e]||''}</div>`:''}</div></div>
    <div class="lbl">Reconocimiento rápido</div>
    ${e.r.map(ri=>`<div style="background:#1E293B;border-radius:7px;padding:9px 11px;margin-bottom:5px;"><div style="font-size:13px;font-weight:800;color:${ri.s.startsWith('⚠️')?'#FCA5A5':'#60A5FA'};margin-bottom:3px;">${ri.s}</div><div style="font-size:14px;color:#94A3B8;line-height:1.6;">${ri.d}</div></div>`).join('')}
  </div>
  ${mapaSignos(e.id)}
  <div class="card"><div class="lbl">⚡ Acción inmediata</div>
    ${e.a.map(ai=>`<div style="font-size:14px;color:#F1F5F9;padding:6px 0;border-bottom:1px solid #1E293B;line-height:1.5;">${ai}</div>`).join('')}
  </div>
  ${e.al?`<div style="background:#1A0606;border:1px solid #DC2626;border-radius:9px;padding:11px 13px;"><div style="font-size:14px;color:#FCA5A5;line-height:1.6;font-weight:600;">${e.al}</div></div>`:''}
  </div>`;
}

// ═══════════════════════════════════════════════════
// REPASO
// ═══════════════════════════════════════════════════
function renderRep(){
  if(repSec!==null){renderRepD();return;}
  const cards=ge('rcards'),secs=ge('rsections');
  if(cards)cards.innerHTML=Object.entries(PROT).map(([k,p])=>`<button onclick="repKey='${k}';renderRep()" style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:12px 8px;background:${repKey===k?'#1E293B':'#0F172A'};border:1px solid ${repKey===k?'#DC2626':'#1E293B'};border-radius:9px;cursor:pointer;font-family:inherit;width:calc(33.3% - 4px);"><span style="font-size:22px;">${p.i}</span><span style="font-size:13px;font-weight:700;color:#F1F5F9;text-align:center;line-height:1.3;">${p.t}</span></button>`).join('');
  const pr=PROT[repKey];
  if(secs&&pr)secs.innerHTML=`<div class="lbl">${pr.i} ${pr.t}</div>`+pr.s.map((s,i)=>`<button onclick="repSec=${i};renderRep()" style="display:flex;justify-content:space-between;align-items:center;background:#1E293B;border:1px solid #334155;border-radius:7px;padding:10px 12px;cursor:pointer;color:#F1F5F9;font-size:14px;font-family:inherit;text-align:left;width:100%;margin-bottom:4px;"><span>${s.t}</span><span style="color:#475569;font-size:16px;">›</span></button>`).join('');
}
function renderRepD(){
  const pr=PROT[repKey],sec=pr.s[repSec],dv=ge('rdv'),lv=ge('rlv');
  if(lv)lv.style.display='none';
  if(dv){dv.style.display='block';dv.innerHTML=`<div class="page"><button onclick="repSec=null;renderRep();ge('rlv').style.display='block';ge('rdv').style.display='none';" class="btn-gray" style="width:auto;align-self:flex-start;">‹ Volver</button>
  <div class="card"><div class="lbl">${pr.i} ${pr.t}</div><div style="font-size:15px;font-weight:800;line-height:1.3;margin-bottom:6px;">${sec.t}</div>
  ${sec.items.map(it=>`<div style="background:#1E293B;border-radius:7px;padding:9px 11px;margin-bottom:5px;"><div style="font-size:13px;font-weight:800;color:#DC2626;margin-bottom:3px;">${it.t}</div><div style="font-size:14px;color:#94A3B8;line-height:1.65;">${it.d}</div></div>`).join('')}
  </div></div>`;}
}

// ═══════════════════════════════════════════════════
// EQUIPO / BOTIQUÍN
// ═══════════════════════════════════════════════════
function renderEq(){
  const search=(ge('eqsearch')||{value:''}).value.toLowerCase(),fil=ge('eqfil');
  const tipos=['todos','disponible','faltante',...new Set(eqp.map(e=>e.tipo))];
  if(fil)fil.innerHTML=tipos.map(t=>`<button class="tab-btn" onclick="eqFil='${t}';renderEq()" style="background:${eqFil===t?'#DC2626':'#1E293B'};color:${eqFil===t?'#fff':'#94A3B8'};flex-shrink:0;">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join('');
  const filtered=eqp.filter(e=>{const m=eqFil==='todos'||(eqFil==='disponible'&&e.ok)||(eqFil==='faltante'&&!e.ok)||e.tipo===eqFil;return m&&(!search||e.item.toLowerCase().includes(search));});
  const ok=eqp.filter(e=>e.ok).length,err=eqp.length-ok;
  const oe=ge('eqok');if(oe)oe.textContent='✅ '+ok+' disponible';
  const ee=ge('eqerr');if(ee)ee.textContent='⚠️ '+err+' faltante';
  const list=ge('eqlist');if(!list)return;
  list.innerHTML=filtered.map(eq=>`<div style="display:flex;align-items:center;gap:8px;background:#1E293B;border-radius:7px;padding:9px 10px;margin-bottom:4px;border-left:3px solid ${eq.ok?'#16A34A':'#DC2626'};"><button onclick="tgEq('${eq.id}')" style="width:24px;height:24px;border-radius:5px;border:none;background:${eq.ok?'#16A34A':'#374151'};color:#fff;font-size:15px;flex-shrink:0;">${eq.ok?'✓':'✗'}</button><div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:600;color:#F1F5F9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${eq.item}</div><div style="font-size:12px;color:#475569;">${eq.tipo}</div></div></div>`).join('');
}
function tgEq(id){eqp=eqp.map(e=>e.id===id?{...e,ok:!e.ok}:e);renderEq();guardarEstado();}
function renderBot(){
  const search=(ge('bsearch')||{value:''}).value.toLowerCase();
  const filtered=bot.filter(b=>!search||b.item.toLowerCase().includes(search));
  const ok=bot.filter(b=>b.ok).length,err=bot.length-ok;
  const oe=ge('bok');if(oe)oe.textContent='✅ '+ok+' disponible';
  const ee=ge('berr');if(ee)ee.textContent='⚠️ '+err+' faltante';
  const list=ge('blist');if(!list)return;
  list.innerHTML=filtered.map(b=>`<div style="display:flex;align-items:center;gap:8px;background:#1E293B;border-radius:7px;padding:8px 10px;margin-bottom:3px;border-left:3px solid ${b.ok?'#16A34A':'#DC2626'};"><button onclick="tgBot('${b.id}')" style="width:22px;height:22px;border-radius:4px;border:none;background:${b.ok?'#16A34A':'#374151'};color:#fff;font-size:14px;flex-shrink:0;">${b.ok?'✓':'✗'}</button><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:#F1F5F9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.item}</div><div style="font-size:12px;color:#475569;">${b.tipo}</div></div></div>`).join('');
}
function tgBot(id){bot=bot.map(b=>b.id===id?{...b,ok:!b.ok}:b);renderBot();guardarEstado();}
function regFalt(){
  const fe=eqp.filter(e=>!e.ok).map(e=>e.item),fb=bot.filter(b=>!b.ok).map(b=>b.item),all=[...fe,...fb];
  if(all.length===0){alert('Todo disponible ✅');return;}
  notas.push({ts:nowStr(),txt:'FALTANTE: '+all.join(', ')});renderNotas();guardarEstado();alert('Registrado en notas.');
}

// ═══════════════════════════════════════════════════
// BUSCADOR LOCAL (antes "Chat IA")
// ═══════════════════════════════════════════════════
function addMsg(role,content){
  const container=ge('chatmsgs');if(!container)return;
  const ph=ge('chatph');if(ph)ph.remove();
  const el=document.createElement('div');
  el.style.cssText=`max-width:88%;border-radius:10px;padding:9px 12px;${role==='user'?'background:#DC2626;align-self:flex-end;margin-left:auto;':'background:#1E293B;align-self:flex-start;border:1px solid #334155;'}`;
  if(role==='assistant'){const lbl=document.createElement('div');lbl.style.cssText='font-size:11px;color:#DC2626;font-weight:800;text-transform:uppercase;margin-bottom:5px;letter-spacing:.5px;';lbl.textContent='🧭 Motor local CRCR';el.appendChild(lbl);}
  const txt=document.createElement('div');txt.style.cssText='font-size:14px;line-height:1.7;white-space:pre-wrap;color:#F1F5F9;';txt.textContent=content;el.appendChild(txt);
  container.appendChild(el);container.scrollTop=container.scrollHeight;
}
function sendChat(){
  const inp=ge('cinput');const msg=inp?inp.value.trim():'';if(!msg)return;
  inp.value='';addMsg('user',msg);
  const resultados=chatAgente.buscarLocal(msg,{CODS,ENF,PROT});
  addMsg('assistant',chatAgente.formatearRespuesta(msg,resultados));
}
document.addEventListener('DOMContentLoaded',()=>{
  const ci=ge('cinput');if(ci)ci.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}});
});

// ═══════════════════════════════════════════════════
// Exponer al scope global — necesario para los onclick="..." inline del HTML
// (tanto el HTML estático como el que este mismo archivo genera dinámicamente).
// ═══════════════════════════════════════════════════
Object.assign(window, {grabarDesdeInicio,abrirMapaSinSenal,cerrarMapaSinSenal,mpBuscarDir,mpTocar,mpDescargar,cambiarRevision,guardarPinRev,subirPendientes,enviarRevision,borrarRec,abrirMapa,cerrarMapa,cambiarVoz,marcarHora,metronomo,verPrealerta,copiarPrealerta,compartirPrealerta,usarImpresiones,sugerirEnBoleta,verSignos,modoTriage,
  guardarAudio,compartirAudio,pintarNav,abrirMas,cerrarMas,go, toggleTimer, resetTimer, addN, cerrarIncidente, exportarHistorial,
  quickChat, renderCods, toggleRec, toggleRec2, analyzeRec, interpDesp,
  answTriage, resetTriage, adj, resetC, analyzeSO, setbt, campoEditado,
  autoBot, genSBAR, exportarBoleta, handleFoto, showEnfD, backEnf,
  tgEq, tgBot, regFalt, sendChat,
  ge, // usado en un par de onclick generados (ge('rlv')...)
});
// Estas necesitan reflejar la variable viva (no una copia), por eso quedan
// accesibles vía window directamente al ser `let` de nivel superior de este
// mismo script clásico — no requieren asignación explícita.
