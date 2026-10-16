// Herramientas clínicas de campo (ideas de EmerKit, MIT, adaptadas a nivel APA
// y a Costa Rica). Todo local. Los resultados que sirven para la boleta se
// pueden pasar con un toque. Referencias: Teasdale 2014 (Glasgow), Apgar 1953,
// Dieckmann 2010 (TEP), PALS/AHA 2020 (signos por edad), BTS 2017 (O2),
// Allgöwer 1967 (índice de shock), Wallace/Lund-Browder (quemaduras),
// Durrer/ICAR (hipotermia).

const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ── Glasgow ──
export const GCS={
  O:[[4,'Espontánea'],[3,'A la voz'],[2,'Al dolor (presión)'],[1,'Ninguna']],
  V:[[5,'Orientado'],[4,'Confuso'],[3,'Palabras inapropiadas'],[2,'Sonidos incomprensibles'],[1,'Ninguna']],
  M:[[6,'Obedece órdenes'],[5,'Localiza el dolor'],[4,'Retira (flexión normal)'],[3,'Flexión anormal (decorticación)'],[2,'Extensión (descerebración)'],[1,'Ninguna']],
  Vped:[[5,'Balbucea / sonríe, sigue objetos'],[4,'Llanto consolable'],[3,'Llanto inconsolable al dolor'],[2,'Quejido al dolor'],[1,'Ninguna']]
};
export function interpretarGCS(t){
  if(t>=14)return 'Leve (13-15)';if(t>=9)return 'Moderado (9-12): vigilar vía aérea, reevaluar seguido';
  return 'Grave (≤8): no protege su vía aérea — posición, cánula orofaríngea si no hay reflejo, aspirar; prealerta al hospital';
}
// ── Apgar ──
export const APGAR=[
  ['Color','Azul o pálido','Cuerpo rosado, manos/pies azules','Todo rosado'],
  ['Frecuencia cardíaca','Ausente','< 100','≥ 100'],
  ['Respuesta a estímulos','Ninguna','Mueca','Llanto, tos, estornudo'],
  ['Tono muscular','Flácido','Algo de flexión','Movimiento activo'],
  ['Respiración','Ausente','Lenta, irregular','Buena, llora']
];
export const interpretarApgar=t=>t>=7?'Normal (7-10)':t>=4?'Depresión moderada (4-6): estimular, secar, abrigar, O2/ventilar según protocolo':'Depresión grave (0-3): reanimación neonatal ya';
// ── TEP pediátrico (Dieckmann) ──
export function interpretarTEP(a,r,c){
  const n=[a,r,c].filter(Boolean).length;
  if(n===0)return ['Estable','Los 3 lados normales.','ok'];
  if(n===3)return ['Fallo cardiorrespiratorio','Los 3 lados alterados: RCP / soporte inmediato.','rojo'];
  if(a&&r)return ['Fallo respiratorio','Apariencia + respiración alteradas: O2, ventilar si hace falta, traslado urgente.','rojo'];
  if(a&&c)return ['Shock descompensado','Apariencia + circulación alteradas: traslado inmediato.','rojo'];
  if(r&&c)return ['Compromiso respiratorio y circulatorio','Tratar como grave: O2 y traslado urgente.','rojo'];
  if(a)return ['Disfunción del sistema nervioso / metabólica','Solo apariencia: glicemia, buscar trauma, intoxicación, infección.','amarillo'];
  if(r)return ['Dificultad respiratoria','Solo trabajo respiratorio: posición cómoda, O2 según protocolo.','amarillo'];
  return ['Shock compensado','Solo circulación: vigilar, buscar sangrado o deshidratación.','amarillo'];
}
// ── Signos vitales normales por edad (PALS 2020, aproximados) ──
export const NORMALES=[
  ['Recién nacido (0-1 mes)',[100,205],[40,60],[60,90]],
  ['Lactante (1-12 meses)',[100,180],[30,53],[72,104]],
  ['1-2 años',[98,140],[22,37],[86,106]],
  ['3-5 años',[80,120],[20,28],[89,112]],
  ['6-11 años',[75,118],[18,25],[97,115]],
  ['12-15 años',[60,100],[12,20],[110,131]],
  ['Adulto',[60,100],[12,20],[100,139]]
];
export function grupoEdad(edad){if(edad==null||isNaN(edad))return 6;if(edad<1/12)return 0;if(edad<1)return 1;if(edad<3)return 2;if(edad<6)return 3;if(edad<12)return 4;if(edad<16)return 5;return 6;}
// ── Índice de shock ──
export function indiceShock(fc,pas,edad){
  if(!fc||!pas)return null;const si=fc/pas;
  let lim=1.0,txt;
  if(edad!=null&&edad<18){lim=edad<4?1.22:edad<7?1.2:edad<13?1.0:0.9;}
  if(edad==null||edad>=18)txt=si<0.7?'Normal':si<1?'Normal-alto: vigilar':si<=1.3?'Elevado: posible hipovolemia / shock':'Muy elevado: shock grave';
  else txt=si>=lim?`Anormal para la edad (≥${lim}): sospecha de shock`:'Dentro de lo esperado para la edad';
  return {si:Math.round(si*100)/100,txt,alerta:si>=1||(edad!=null&&edad<18&&si>=lim)};
}
// ── Oxígeno ──
export function autonomiaO2(litrosAgua,presion,unidad,flujo){
  const bar=unidad==='psi'?presion/14.5:presion;
  const util=Math.max(0,bar-20);                  // reserva de seguridad 20 bar (≈300 psi)
  const min=flujo>0?litrosAgua*util/flujo:0;
  const nivel=min<10?'rojo':min<=30?'amarillo':'ok';
  return {min,txt:`${Math.floor(min/60)} h ${String(Math.round(min%60)).padStart(2,'0')} min`,nivel};
}
export const FIO2=[
  ['Cánula nasal','1-6 L/min','24-44 % (≈ +4 % por litro)'],
  ['Mascarilla simple','5-10 L/min','35-60 %'],
  ['Mascarilla con reservorio','10-15 L/min','60-90 % (inflar la bolsa antes)'],
  ['Venturi','según la válvula','24-50 % exacto (EPOC)'],
  ['Bolsa-válvula-mascarilla + reservorio','15 L/min','≈ 100 %']
];
// ── Quemaduras: regla de los 9 (adulto) y modificada para niños ──
export const QUEMA={
  adulto:[['Cabeza y cuello',9],['Tórax',9],['Abdomen',9],['Espalda alta',9],['Espalda baja y glúteos',9],['Brazo derecho',9],['Brazo izquierdo',9],['Pierna derecha',18],['Pierna izquierda',18],['Genitales',1]],
  nino:[['Cabeza y cuello',18],['Tórax y abdomen',18],['Espalda',18],['Brazo derecho',9],['Brazo izquierdo',9],['Pierna derecha',14],['Pierna izquierda',14]]
};
export function gravedadQuemadura(pct,nino,zonas){
  const r=[];
  if(pct>=(nino?10:20))r.push(`Quemadura extensa (≥${nino?10:20} %): riesgo de shock; traslado a centro especializado`);
  if(zonas.some(z=>/Cabeza|Genitales/.test(z)))r.push('Zona especial (cara, genitales): grave aunque sea pequeña');
  r.push('Enfriar con agua a temperatura ambiente 20 min (no hielo); cubrir con apósito limpio y abrigar al paciente');
  r.push('Hollín en nariz/boca, voz ronca o quemadura en cara: vía aérea en riesgo');
  return r;
}
// ── Hipotermia (estadios suizos / ICAR) e hipertermia ──
export const HIPOTERMIA=[
  ['I — Leve','Consciente, tiembla','35-32 °C','Abrigar, bebidas calientes si traga bien, mover con cuidado'],
  ['II — Moderada','Confuso/somnoliento, no tiembla','32-28 °C','Manejar horizontal y con suavidad (riesgo de arritmia), aislar del frío, traslado'],
  ['III — Grave','Inconsciente, signos vitales presentes','28-24 °C','Igual que II + vía aérea; traslado a centro con recalentamiento'],
  ['IV — Paro','Sin signos vitales','< 24 °C','RCP; "no está muerto hasta que está caliente y muerto"']
];
export const HIPERTERMIA=[
  ['Calambres por calor','Dolor muscular, conciencia normal','Sombra, hidratar con sales, estirar'],
  ['Agotamiento por calor','Sudor, debilidad, mareo, náuseas, T < 40 °C, conciencia normal','Sombra, acostar, enfriar, hidratar si traga bien'],
  ['Golpe de calor','T ≥ 40 °C + confusión, convulsión o coma (puede no sudar)','EMERGENCIA: enfriar YA (agua + ventilación, hielo en cuello/axilas/ingles), traslado']
];
// ── Coordenadas para dictar por radio ──
export function gms(v,pos,neg){const s=v<0?neg:pos;v=Math.abs(v);const g=Math.floor(v),m=Math.floor((v-g)*60),se=((v-g)*60-m)*60;return `${g}° ${m}' ${se.toFixed(1)}" ${s}`;}

// ═══ Interfaz ═══════════════════════════════════════════════════════════
const HERR=[['gcs','🧠 Glasgow'],['contar','⏱️ Contar FR / FC'],['normales','📏 Normales por edad'],['shock','🩸 Índice de shock'],
  ['tep','👶 Triángulo pediátrico'],['apgar','🍼 Apgar'],['quema','🔥 Quemaduras'],['o2','🫧 Oxígeno'],['temp','🌡️ Frío / calor'],['gps','📍 Mis coordenadas']];
let actual='gcs',ctxApp=null;
export function pintarHerramientas(el,ctx){
  ctxApp=ctx;
  el.innerHTML=`<div class="herr-tabs">${HERR.map(([k,t])=>`<button data-h="${k}" class="${k===actual?'on':''}">${t}</button>`).join('')}</div><div id="herrCuerpo" class="card"></div>`;
  el.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{actual=b.dataset.h;pintarHerramientas(el,ctx);});
  const c=el.querySelector('#herrCuerpo');
  ({gcs,contar,normales,shock,tep,apgar,quema,o2,temp,gps})[actual](c);
}
const sv=()=>ctxApp.boleta.sv1;
const edadBoleta=()=>{const e=parseFloat(ctxApp.boleta.edad);return isNaN(e)?null:e;};
function pasar(campos,etq){Object.assign(sv(),campos);ctxApp.guardar();ctxApp.aviso(`✅ ${etq} quedó en la boleta (signos vitales).`);}

function gcs(c){
  const ped=(edadBoleta()??99)<2;
  const sel={O:4,V:5,M:6};
  const fila=(k,ops)=>`<div class="lbl">${{O:'Ojos',V:'Verbal',M:'Motor'}[k[0]]}</div><div class="herr-ops">${ops.map(([v,t])=>`<button data-k="${k[0]}" data-v="${v}">${v} · ${esc(t)}</button>`).join('')}</div>`;
  c.innerHTML=`<div class="lbl" style="color:#93C5FD;">Escala de Glasgow${ped?' (verbal pediátrica, < 2 años)':''}</div>
    ${fila('O',GCS.O)}${fila('V',ped?GCS.Vped:GCS.V)}${fila('M',GCS.M)}
    <div class="herr-res" id="gcsRes"></div><button class="btn-blue" id="gcsPasar">📋 Pasar a la boleta</button>
    <div class="nota">Anotalo como O+V+M (ej. O3 V4 M5 = 12). Lo más importante es el motor.</div>`;
  const pintar=()=>{c.querySelectorAll('[data-k]').forEach(b=>b.classList.toggle('on',+b.dataset.v===sel[b.dataset.k]));
    const t=sel.O+sel.V+sel.M;c.querySelector('#gcsRes').innerHTML=`<b>Glasgow ${t}</b> (O${sel.O} V${sel.V} M${sel.M}) — ${esc(interpretarGCS(t))}`;};
  c.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{sel[b.dataset.k]=+b.dataset.v;pintar();});
  c.querySelector('#gcsPasar').onclick=()=>pasar({gcs:String(sel.O+sel.V+sel.M),pO:String(sel.O),pV:String(sel.V),pM:String(sel.M)},'El Glasgow');
  pintar();
}
function contar(c){
  let n=0,ini=null,timer=null,dur=30,que='fr';
  c.innerHTML=`<div class="lbl" style="color:#93C5FD;">Contador: tocá con cada respiración o latido</div>
    <div class="g2"><button class="btn-gray on" data-q="fr">🫁 Respiraciones</button><button class="btn-gray" data-q="fc">❤️ Pulso</button></div>
    <div class="g2"><button class="btn-gray" data-d="15">15 s (× 4)</button><button class="btn-gray on" data-d="30">30 s (× 2)</button></div>
    <button class="herr-tap" id="tap">TOCAR</button><div class="herr-res" id="tapRes">Tocá para empezar.</div>
    <button class="btn-blue" id="tapPasar" disabled>📋 Pasar a la boleta</button>`;
  const res=c.querySelector('#tapRes');let valor=null;
  c.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{que=b.dataset.q;c.querySelectorAll('[data-q]').forEach(x=>x.classList.toggle('on',x===b));});
  c.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{dur=+b.dataset.d;c.querySelectorAll('[data-d]').forEach(x=>x.classList.toggle('on',x===b));});
  c.querySelector('#tap').onclick=()=>{
    if(!ini){n=0;ini=Date.now();valor=null;c.querySelector('#tapPasar').disabled=true;
      timer=setInterval(()=>{const s=dur-Math.floor((Date.now()-ini)/1000);
        if(s<=0){clearInterval(timer);valor=Math.round(n*60/dur);ini=null;navigator.vibrate?.(200);
          res.innerHTML=`<b>${valor} por minuto</b> (${n} en ${dur} s)`;c.querySelector('#tapPasar').disabled=false;}
        else res.textContent=`${n} · quedan ${s} s`;},250);}
    n++;res.textContent=`${n} · contando…`;navigator.vibrate?.(15);
  };
  c.querySelector('#tapPasar').onclick=()=>valor&&pasar({[que]:String(valor)},que==='fr'?'La FR':'La FC');
}
function normales(c){
  const e=edadBoleta(),g=grupoEdad(e);const s=sv();
  const fuera=(v,[a,b])=>v!==''&&v!=null&&(+v<a||+v>b);
  c.innerHTML=`<div class="lbl" style="color:#93C5FD;">Signos vitales normales por edad</div>
    <table class="herr-tabla"><tr><th>Edad</th><th>FC</th><th>FR</th><th>PAS</th></tr>
    ${NORMALES.map(([n,fc,fr,pa],i)=>`<tr class="${i===g?'on':''}"><td>${n}</td><td>${fc.join('-')}</td><td>${fr.join('-')}</td><td>${pa.join('-')}</td></tr>`).join('')}</table>
    ${e!=null?`<div class="herr-res">Paciente de ${e} años: ${[['FC',s.fc,NORMALES[g][1]],['FR',s.fr,NORMALES[g][2]],['PAS',s.pa1,NORMALES[g][3]]].map(([k,v,r])=>v?`${k} ${v} ${fuera(v,r)?'⚠️ fuera de rango':'✓'}`:'').filter(Boolean).join(' · ')||'sin signos vitales en la boleta'}</div>`:'<div class="nota">Anotá la edad en la boleta para resaltar su fila.</div>'}
    <div class="nota">PAS mínima aceptable en niños de 1-10 años ≈ 70 + (2 × edad). SpO₂ normal ≥ 94 %.</div>`;
}
function shock(c){
  const s=sv();const r=indiceShock(+s.fc,+s.pa1,edadBoleta());
  c.innerHTML=`<div class="lbl" style="color:#93C5FD;">Índice de shock = FC ÷ PAS</div>
    <div class="g2"><input id="siFc" inputmode="numeric" placeholder="FC" value="${esc(s.fc||'')}"><input id="siPa" inputmode="numeric" placeholder="PA sistólica" value="${esc(s.pa1||'')}"></div>
    <div class="herr-res" id="siRes"></div>
    <div class="nota">Detecta sangrado oculto antes de que baje la presión. No sirve solo: betabloqueantes, marcapasos, embarazo y dolor lo alteran.</div>`;
  const calc=()=>{const r=indiceShock(+c.querySelector('#siFc').value,+c.querySelector('#siPa').value,edadBoleta());
    c.querySelector('#siRes').innerHTML=r?`<b class="${r.alerta?'c-r':''}">IS ${r.si}</b> — ${esc(r.txt)}`:'Poné FC y PAS.';};
  c.querySelectorAll('input').forEach(i=>i.oninput=calc);calc();
}
function tep(c){
  const st={a:false,r:false,c:false};
  const lado=(k,t,d)=>`<label class="herr-chk"><input type="checkbox" data-t="${k}"><span><b>${t} alterada</b><br><small>${d}</small></span></label>`;
  c.innerHTML=`<div class="lbl" style="color:#93C5FD;">Triángulo de evaluación pediátrica (desde la puerta, sin tocar)</div>
    ${lado('a','Apariencia','Tono, interacción, se consuela, mirada, llanto/habla')}
    ${lado('r','Respiración','Ruidos (estridor, quejido, sibilancias), posición de trípode, tiraje, aleteo nasal')}
    ${lado('c','Circulación (piel)','Palidez, cianosis, piel moteada')}
    <div class="herr-res" id="tepRes"></div>`;
  const pintar=()=>{const [t,d,n]=interpretarTEP(st.a,st.r,st.c);c.querySelector('#tepRes').innerHTML=`<b class="${n==='rojo'?'c-r':n==='amarillo'?'c-a':'c-v'}">${t}</b><br>${esc(d)}`;};
  c.querySelectorAll('[data-t]').forEach(i=>i.onchange=()=>{st[i.dataset.t]=i.checked;pintar();});pintar();
}
function apgar(c){
  const v=[2,2,2,2,2];
  c.innerHTML=`<div class="lbl" style="color:#93C5FD;">Apgar — al minuto 1 y al minuto 5</div>
    ${APGAR.map(([n,...ops],i)=>`<div class="lbl">${n}</div><div class="herr-ops">${ops.map((t,p)=>`<button data-i="${i}" data-p="${p}">${p} · ${esc(t)}</button>`).join('')}</div>`).join('')}
    <div class="herr-res" id="apRes"></div>`;
  const pintar=()=>{c.querySelectorAll('[data-i]').forEach(b=>b.classList.toggle('on',v[+b.dataset.i]===+b.dataset.p));
    const t=v.reduce((a,b)=>a+b,0);c.querySelector('#apRes').innerHTML=`<b>Apgar ${t}</b> — ${esc(interpretarApgar(t))}`;};
  c.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{v[+b.dataset.i]=+b.dataset.p;pintar();});pintar();
}
function quema(c){
  let nino=(edadBoleta()??99)<10;const marcadas=new Set();
  const pintar=()=>{
    const z=nino?QUEMA.nino:QUEMA.adulto;
    const pct=z.filter(([n])=>marcadas.has(n)).reduce((s,[,p])=>s+p,0)+(+c.dataset.palmas||0);
    c.innerHTML=`<div class="lbl" style="color:#93C5FD;">Superficie quemada (solo 2.º y 3.er grado)</div>
      <div class="g2"><button class="btn-gray ${!nino?'on':''}" data-m="a">Adulto (regla de 9)</button><button class="btn-gray ${nino?'on':''}" data-m="n">Niño</button></div>
      <div class="herr-ops">${z.map(([n,p])=>`<button data-z="${esc(n)}" class="${marcadas.has(n)?'on':''}">${esc(n)} · ${p} %</button>`).join('')}</div>
      <label class="flbl">Quemaduras chicas: ¿cuántas palmas del paciente? (1 palma ≈ 1 %)</label><input id="palmas" inputmode="numeric" value="${esc(c.dataset.palmas||'')}">
      <div class="herr-res"><b>${pct} % de superficie corporal</b></div>
      <ul class="herr-lista">${gravedadQuemadura(pct,nino,[...marcadas]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
    c.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{nino=b.dataset.m==='n';marcadas.clear();pintar();});
    c.querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>{const n=b.dataset.z;marcadas.has(n)?marcadas.delete(n):marcadas.add(n);pintar();});
    c.querySelector('#palmas').onchange=e=>{c.dataset.palmas=e.target.value;pintar();};
  };pintar();
}
function o2(c){
  c.innerHTML=`<div class="lbl" style="color:#93C5FD;">¿Cuánto oxígeno me queda?</div>
    <label class="flbl">Tamaño del cilindro (litros de agua)</label>
    <select id="o2L"><option value="2">2 L (portátil)</option><option value="2.8">D / 2,8 L</option><option value="4.6" selected>E / 4,6 L</option><option value="5">5 L</option><option value="10">10 L</option><option value="46">M / H grande</option></select>
    <div class="g2"><input id="o2P" inputmode="numeric" placeholder="Presión del manómetro"><select id="o2U"><option value="psi">psi</option><option value="bar">bar</option></select></div>
    <label class="flbl">Flujo (L/min)</label><input id="o2F" inputmode="numeric" value="15">
    <div class="herr-res" id="o2Res">Poné la presión del manómetro.</div>
    <div class="lbl" style="margin-top:6px;">Qué % de O₂ da cada dispositivo</div>
    <table class="herr-tabla"><tr><th>Dispositivo</th><th>Flujo</th><th>FiO₂</th></tr>${FIO2.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>
    <div class="nota">Se descuentan 20 bar (≈ 300 psi) de reserva. Meta SpO₂ ≥ 94 % (88-92 % en EPOC). O₂ según protocolo.</div>`;
  const calc=()=>{const p=+c.querySelector('#o2P').value;if(!p){return;}
    const r=autonomiaO2(+c.querySelector('#o2L').value,p,c.querySelector('#o2U').value,+c.querySelector('#o2F').value);
    c.querySelector('#o2Res').innerHTML=`<b class="${r.nivel==='rojo'?'c-r':r.nivel==='amarillo'?'c-a':'c-v'}">Quedan ≈ ${r.txt}</b>${r.nivel==='rojo'?' — preparar cambio de cilindro YA':''}`;};
  c.querySelectorAll('input,select').forEach(i=>i.oninput=calc);
}
function temp(c){
  c.innerHTML=`<div class="lbl" style="color:#93C5FD;">Hipotermia (sin termómetro: se clasifica por cómo está)</div>
    <table class="herr-tabla"><tr><th>Estadio</th><th>Cómo está</th><th>T°</th><th>Qué hacer</th></tr>${HIPOTERMIA.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</table>
    <div class="lbl" style="color:#93C5FD;margin-top:8px;">Calor</div>
    <table class="herr-tabla"><tr><th>Cuadro</th><th>Cómo está</th><th>Qué hacer</th></tr>${HIPERTERMIA.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>`;
}
function gps(c){
  c.innerHTML=`<div class="lbl" style="color:#93C5FD;">Mis coordenadas (para dictar por radio o al helicóptero)</div><div class="herr-res" id="gpsRes">Buscando GPS…</div>
    <button class="btn-gray" id="gpsCopiar">📋 Copiar</button>`;
  if(!navigator.geolocation){c.querySelector('#gpsRes').textContent='Este teléfono no tiene GPS disponible.';return;}
  navigator.geolocation.getCurrentPosition(p=>{
    const la=p.coords.latitude,lo=p.coords.longitude;
    const t=`${la.toFixed(5)}, ${lo.toFixed(5)}`;
    c.querySelector('#gpsRes').innerHTML=`<b>${t}</b><br>${gms(la,'N','S')} · ${gms(lo,'E','O')}<br><small>Precisión ± ${Math.round(p.coords.accuracy)} m</small>`;
    c.querySelector('#gpsCopiar').onclick=()=>navigator.clipboard?.writeText(t);
  },e=>{c.querySelector('#gpsRes').textContent='No se pudo leer el GPS: '+e.message;},{enableHighAccuracy:true,timeout:15000});
}
