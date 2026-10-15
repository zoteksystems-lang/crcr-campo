// CRCR Campo — app.js
// Script clásico (no type="module") a propósito: así los onclick="..." inline del
// HTML (estilo del archivo original) siguen viendo las variables globales tal
// cual. Los módulos ES (data.js, engine/*.js) se cargan con import() dinámico
// al arrancar y se vuelcan a estas variables.
'use strict';

let CODS,TNIV,TSTEPS,TACC,SCAMPOS,OCAMPOS,ENF,PROT,EQP,BOT,QPROMPTS,EPP_POR_TIPO;
let despachoAgente, vitalsAgente, entrevistaAgente, diagnosticoAgente, documentacionAgente, chatAgente, whisperAgente, ocrAgente, storeAgente;

// ═══════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════
let notas=[],recs=[],recsOn=false,recsOn2=false,mr=null,mr2=null,chunks=[],chunks2=[],
trans='',trans2='',
trStep=0,trABR=false,trCts={r:0,a:0,v:0,n:0},
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
  ({CODS,TNIV,TSTEPS,TACC,SCAMPOS,OCAMPOS,ENF,PROT,EQP,BOT,QPROMPTS,EPP_POR_TIPO}=data);
  despachoAgente=despacho; vitalsAgente=vitals; entrevistaAgente=entrevista;
  diagnosticoAgente=diagnostico; documentacionAgente=documentacion; chatAgente=chat;
  storeAgente=store;
  eqp=EQP.map(e=>({...e})); bot=BOT.map(b=>({...b}));
  await restaurarEstado();
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
  boleta=boletaVacia();boletaAuto=new Set();notas=[];trCts={r:0,a:0,v:0,n:0};trStep=0;trABR=false;
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
      if(texto){ const dt=ge('dtxt'); if(dt && !dt.value.trim())dt.value=texto; }
    }else{
      trans2=texto;
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
        const blob=new Blob(chunks,{type:mime});
        const lbl=(ge('rlbl')||{value:'Despacho'}).value;
        const rec={id:'r'+Date.now(),lbl,ts:nowStr(),blob,tx:'',sz:Math.round(blob.size/1024)+'KB'};
        recs.push({...rec, url:URL.createObjectURL(blob)});
        storeAgente.guardarGrabacion(rec);
        stream.getTracks().forEach(t=>t.stop());recsOn=false;
        const b=ge('rbtn');if(b){b.textContent='🎙️ Grabar';b.style.background='#DC2626';}
        const rs=ge('rstat');if(rs)rs.style.display='none';
        const rp=ge('recpill');if(rp)rp.style.display='none';
        renderRecs();
        await transcribirYProcesar(blob,'desp');
        const found=recs.find(r=>r.id===rec.id); if(found){found.tx=trans; storeAgente.guardarGrabacion({...rec,tx:trans});}
        renderRecs();
      };
      mr.start(500);
      recsOn=true;
      const b=ge('rbtn');if(b){b.textContent='⏹ Detener';b.style.background='#374151';}
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
        const blob=new Blob(chunks2,{type:mime});
        const rec={id:'r'+Date.now(),lbl:'Entrevista',ts:nowStr(),blob,tx:'',sz:Math.round(blob.size/1024)+'KB'};
        recs.push({...rec, url:URL.createObjectURL(blob)});
        storeAgente.guardarGrabacion(rec);
        stream.getTracks().forEach(t=>t.stop());recsOn2=false;
        const b=ge('rbtn2');if(b){b.textContent='🎙️ Grabar entrevista';b.style.background='#DC2626';}
        const rs=ge('rstat2');if(rs)rs.style.display='none';
        const rp=ge('recpill');if(rp)rp.style.display='none';
        await transcribirYProcesar(blob,'entrev');
      };
      mr2.start(500);
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
  ge('recsl').innerHTML=recs.map(r=>`<div style="background:#1E293B;border-radius:8px;padding:10px;margin-bottom:6px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-weight:700;font-size:14px;">${r.lbl}</span><span style="font-size:12px;color:#475569;">${r.ts}·${r.sz}</span></div>
    <audio controls src="${r.url}" style="width:100%;height:36px;"></audio>
    ${r.tx?`<div style="background:#080E1A;border-radius:5px;padding:6px;margin-top:4px;font-size:13px;color:#94A3B8;line-height:1.5;">${r.tx.slice(0,200)}</div>`:''}
    ${r.tx?`<button onclick="analyzeRec('${r.id}')" style="background:#1E3A5F;border:1px solid #2563EB;color:#93C5FD;border-radius:6px;padding:7px 10px;font-size:13px;margin-top:4px;width:100%;">🧭 Analizar (motor local)</button>`:''}
  </div>`).join('');
}
function analyzeRec(id){
  const r=recs.find(x=>x.id===id);if(!r||!r.tx)return;
  const desp=despachoAgente.interpretarDespacho(r.tx,{CODS,ENF,EPP_POR_TIPO});
  const dx=diagnosticoAgente.sugerirDiagnosticos(r.tx,ENF);
  const texto=desp.resumen+(dx.length?`\n🩺 Posibles cuadros relacionados: ${dx.map(d=>d.t).join(', ')}`:'');
  addMsg('assistant','🎙️ ANÁLISIS DE GRABACIÓN\n\n'+texto);go('chat');
}

// ═══════════════════════════════════════════════════
// DESPACHO — Agente local
// ═══════════════════════════════════════════════════
let ultimoDespacho=null;
function interpDesp(){
  const txt=(ge('dtxt')||{value:''}).value;if(!txt.trim()){alert('Ingresá el texto primero.');return;}
  ultimoDespacho=despachoAgente.interpretarDespacho(txt,{CODS,ENF,EPP_POR_TIPO});
  addMsg('user','📻 Despacho: '+txt);addMsg('assistant','📻 DESPACHO INTERPRETADO (motor local)\n\n'+ultimoDespacho.resumen);go('chat');
  // autocompleta boleta automáticamente (marcado 🤖, editable)
  const auto=documentacionAgente.autocompletarBoleta(boleta,{despacho:ultimoDespacho});
  auto.forEach(p=>boletaAuto.add(p));
  guardarEstado();
}

// ═══════════════════════════════════════════════════
// TRIAGE
// ═══════════════════════════════════════════════════
function renderTr(){
  const idx=trStep,q=trABR?TSTEPS[3]:TSTEPS[idx];
  const l=ge('trlbl'),qe=ge('trq'),r=ge('trres');
  if(l)l.textContent='Algoritmo START — Paso '+(typeof idx==='number'?idx+1:'*')+'/'+TSTEPS.length;
  if(qe)qe.textContent=q?q.q:'';
  if(r)r.style.display='none';
}
function renderTrLevels(){
  const el=ge('trlevels');if(!el)return;
  el.innerHTML=Object.entries(TNIV).map(([code,n])=>`<div style="display:flex;gap:10px;align-items:center;background:#1E293B;border-radius:7px;padding:8px 10px;border-left:4px solid ${n.c};margin-bottom:4px;"><div style="font-weight:800;color:${n.c};min-width:75px;font-size:14px;">${code}</div><div><div style="font-size:14px;font-weight:700;">${n.l}</div><div style="font-size:13px;color:#6B7280;">${n.d}</div></div></div>`).join('');
}
function answTriage(si){
  const q=trABR?TSTEPS[3]:TSTEPS[trStep];
  const next=si?q.si:q.no;
  if(next==='ABR'){trABR=true;trStep='ABR';renderTr();return;}
  if(typeof next==='string'&&next!=='ABR'){showTrRes(next);return;}
  trABR=false;trStep=next;renderTr();
}
function showTrRes(code){
  const n=TNIV[code];boleta.trc=code;guardarEstado();
  const r=ge('trres'),q=ge('trq'),b=ge('tbadge');
  const acciones=vitalsAgente.accionesTriage(code);
  if(r){r.style.display='block';r.style.border='2px solid '+n.c;r.style.background=n.bg;
    r.innerHTML=`<div style="text-align:center;gap:8px;display:flex;flex-direction:column;"><div style="font-size:34px;font-weight:900;color:${n.c};">${code}</div><div style="font-size:15px;font-weight:700;">${n.l}</div><div style="font-size:14px;color:#94A3B8;">${n.d}</div></div>
    <div style="margin-top:8px;font-size:13px;color:#F1F5F9;line-height:1.7;">${acciones.join('<br>')}</div>`;}
  if(q)q.style.display='none';
  ge('trbuts').style.display='none';
  if(b){b.style.display='block';b.innerHTML=`<span style="background:${n.c};color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:800;">Triage: ${code}</span>`;}
}
function resetTriage(){
  trStep=0;trABR=false;
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
  const dx=diagnosticoAgente.sugerirDiagnosticos(texto+' '+Object.values(boleta.sam).join(' '),ENF);
  if(dx.length){
    dx.slice(0,2).forEach((d,i)=>{ const campo=i===0?'dx1':'dx2'; if(!boleta[campo]){boleta[campo]=`${d.t} (${d.e||'—'})`;boletaAuto.add(campo);} });
  }
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
    diagnosticos:diagnosticoAgente.sugerirDiagnosticos(notas.map(n=>n.txt).join(' ')+' '+trans+' '+trans2,ENF)
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
Object.assign(window, {
  abrirMas,cerrarMas,go, toggleTimer, resetTimer, addN, cerrarIncidente, exportarHistorial,
  quickChat, renderCods, toggleRec, toggleRec2, analyzeRec, interpDesp,
  answTriage, resetTriage, adj, resetC, analyzeSO, setbt, campoEditado,
  autoBot, genSBAR, exportarBoleta, handleFoto, showEnfD, backEnf,
  tgEq, tgBot, regFalt, sendChat,
  ge, // usado en un par de onclick generados (ge('rlv')...)
});
// Estas necesitan reflejar la variable viva (no una copia), por eso quedan
// accesibles vía window directamente al ser `let` de nivel superior de este
// mismo script clásico — no requieren asignación explícita.
