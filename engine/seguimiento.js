// Medición y seguimiento — peso, composición corporal y datos del reloj, todo
// guardado en el teléfono (funciona sin internet). Los datos entran por:
//  - registro manual,
//  - báscula Bluetooth (engine/bascula.js, que usa los lectores de abajo),
//  - archivos exportados: Zepp Life (CSV/ZIP), openScale, Samsung Health,
//    Garmin, Health Sync, cualquier CSV con encabezados, y Apple Salud
//    (exportar.zip / export.xml),
//  - Atajo de iPhone que abre la app con los datos en la URL (#datos?…).
// Una fila por día: {fecha:'AAAA-MM-DD', peso, grasa, musculo, agua, visceral,
// hueso, metabolismo, imc, cintura, pasos, kcalActivas, fcReposo, sueno}.

const CLAVE='crcr-seguimiento';
const CLAVE_PERFIL='crcr-perfil';

export const METRICAS={
  peso:{nombre:'Peso',unidad:'kg',dec:1},
  grasa:{nombre:'Grasa corporal',unidad:'%',dec:1},
  musculo:{nombre:'Músculo',unidad:'kg',dec:1},
  agua:{nombre:'Agua corporal',unidad:'%',dec:1},
  visceral:{nombre:'Grasa visceral',unidad:'',dec:0},
  hueso:{nombre:'Masa ósea',unidad:'kg',dec:1},
  metabolismo:{nombre:'Metabolismo basal',unidad:'kcal',dec:0},
  imc:{nombre:'IMC',unidad:'',dec:1},
  cintura:{nombre:'Cintura',unidad:'cm',dec:0},
  pasos:{nombre:'Pasos',unidad:'',dec:0,suma:true},
  kcalActivas:{nombre:'Calorías activas',unidad:'kcal',dec:0,suma:true},
  fcReposo:{nombre:'FC en reposo',unidad:'lpm',dec:0},
  sueno:{nombre:'Sueño',unidad:'h',dec:1}
};

// --- Guardar / leer ---------------------------------------------------------
export function leerMediciones(){
  try{return (JSON.parse(localStorage.getItem(CLAVE))||[]).sort((a,b)=>a.fecha.localeCompare(b.fecha));}
  catch{return[];}
}
function escribir(l){try{localStorage.setItem(CLAVE,JSON.stringify(l));}catch{}}
// Mezcla filas por fecha: lo nuevo pisa lo viejo métrica por métrica.
export function agregarMediciones(filas){
  const porFecha=Object.fromEntries(leerMediciones().map(f=>[f.fecha,f]));
  let n=0;
  for(const f of filas){
    if(!f||!/^\d{4}-\d{2}-\d{2}$/.test(f.fecha))continue;
    const limpio={};
    for(const k of Object.keys(METRICAS))if(typeof f[k]==='number'&&isFinite(f[k]))limpio[k]=f[k];
    if(!Object.keys(limpio).length)continue;
    porFecha[f.fecha]={...(porFecha[f.fecha]||{fecha:f.fecha}),...limpio};
    n++;
  }
  escribir(Object.values(porFecha));
  return n;
}
export function borrarMedicion(fecha){escribir(leerMediciones().filter(f=>f.fecha!==fecha));}

export function leerPerfil(){try{return JSON.parse(localStorage.getItem(CLAVE_PERFIL))||{};}catch{return{};}}
export function guardarPerfil(p){try{localStorage.setItem(CLAVE_PERFIL,JSON.stringify(p));}catch{}}

export function hoy(d=new Date()){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// --- Fechas y números de archivos ajenos ------------------------------------
const MESES={jan:1,ene:1,feb:2,mar:3,apr:4,abr:4,may:5,jun:6,jul:7,aug:8,ago:8,sep:9,set:9,oct:10,nov:11,dec:12,dic:12};
export function aFecha(v){
  if(v===null||v===undefined)return null;
  let s=String(v).trim().replace(/^"|"$/g,'');
  if(!s)return null;
  if(/^\d{10}(\.\d+)?$/.test(s))return hoy(new Date(parseFloat(s)*1000));
  if(/^\d{13}$/.test(s))return hoy(new Date(+s));
  let m=s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m=s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/); // día primero (formato latino)
  if(m){
    let d=+m[1],mo=+m[2];
    if(mo>12&&d<=12)[d,mo]=[mo,d]; // era formato EE. UU. (mes/día)
    return `${m[3]}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  m=s.toLowerCase().match(/([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/)||s.toLowerCase().match(/(\d{1,2})\s+(?:de\s+)?([a-z]{3})[a-z]*\.?\s+(?:de\s+)?(\d{4})/);
  if(m){
    const [mes,dia]=MESES[m[1]]?[MESES[m[1]],+m[2]]:[MESES[m[2]],+m[1]];
    if(mes)return `${m[3]}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
  }
  return null;
}
function aNum(v){
  if(v===null||v===undefined)return null;
  const s=String(v).replace(/^"|"$/g,'').replace(/[^\d.,-]/g,'');
  if(!s||s==='-')return null;
  const n=parseFloat(/,\d{1,2}$/.test(s)&&!s.includes('.')?s.replace(',','.'):s.replace(/,/g,''));
  return isNaN(n)?null:n;
}

// --- CSV --------------------------------------------------------------------
// Nombres de columna en Zepp Life, openScale, Samsung Health, Garmin, Fitbit,
// Health Sync y planillas propias (en español o inglés).
const COLUMNAS=[
  ['fecha',/^(fecha|date|time|timestamp|datetime|date ?time|day|dia|start_?time|create_?time|dateTime)$/],
  ['peso',/^(peso|weight|weight ?\(kg\)|body_?weight|weight_?kg|peso ?\(kg\)|masa)$/],
  ['grasa',/^(grasa|grasa corporal|% ?grasa|fat|fatrate|fat ?%|body ?fat|body_?fat(_?percent(age)?)?|fat_?ratio|bodyfat|grasa ?\(%\))$/],
  ['musculo',/^(musculo|masa muscular|muscle|musclerate|muscle ?mass|skeletal ?muscle( ?mass)?|skeletal_?muscle(_?mass)?|muscle_?mass)$/],
  ['agua',/^(agua|agua corporal|water|bodywaterrate|body ?water|total_?body_?water|water ?%)$/],
  ['visceral',/^(visceral|visceralfat|visceral ?fat|grasa visceral|visceral_?fat(_?level)?)$/],
  ['hueso',/^(hueso|masa osea|bone|bonemass|bone ?mass|bone_?mass)$/],
  ['metabolismo',/^(metabolismo|metabolism|bmr|basal ?metabolic( ?rate)?|basal_?metabolic_?rate|tmb)$/],
  ['imc',/^(imc|bmi)$/],
  ['cintura',/^(cintura|waist|waist ?circumference)$/],
  ['pasos',/^(pasos|steps|step_?count|total ?steps|count)$/],
  ['kcalActivas',/^(calorias|calories|active ?calories|active_?calorie|calorias activas|active ?energy|activity ?calories)$/],
  ['fcReposo',/^(fc ?reposo|resting ?heart ?rate|restingheartrate|resting_?heart_?rate|rhr)$/],
  ['sueno',/^(sueno|sleep|horas de sueno|sleep ?duration|sleep ?hours|asleep)$/],
  ['_sueno_profundo',/^(deepsleeptime|deep ?sleep( ?minutes)?)$/],
  ['_sueno_ligero',/^(shallowsleeptime|light ?sleep( ?minutes)?)$/],
  ['_sueno_rem',/^(remtime|rem ?sleep( ?minutes)?)$/]
];
function clave(col){
  // "com.samsung.health.weight.body_fat" → "body_fat"; quita tildes y comillas.
  const c=String(col).trim().replace(/^"|"$/g,'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/^.*\.(?=[a-z_ ]+$)/,'').replace(/\s+/g,' ');
  for(const [k,re] of COLUMNAS)if(re.test(c))return k;
  return null;
}
function separarCSV(linea,sep){
  const out=[];let cur='',q=false;
  for(const ch of linea){
    if(ch==='"'){q=!q;continue;}
    if(ch===sep&&!q){out.push(cur);cur='';}else cur+=ch;
  }
  out.push(cur);
  return out;
}

// Devuelve filas por día. nombreArchivo ayuda a reconocer los de Zepp Life
// (ACTIVITY → pasos/calorías, BODY → báscula, SLEEP → sueño).
export function parsearCSV(texto,nombreArchivo=''){
  const lineas=String(texto).replace(/^﻿/,'').split(/\r?\n/).filter(l=>l.trim());
  if(lineas.length<2)return[];
  const sep=[',',';','\t'].sort((a,b)=>lineas[0].split(b).length-lineas[0].split(a).length)[0];
  // El encabezado es la primera línea (de las 5 primeras) con fecha + 1 métrica.
  let iCab=-1,mapa=[];
  for(let i=0;i<Math.min(5,lineas.length);i++){
    const m=separarCSV(lineas[i],sep).map(clave);
    if(m.includes('fecha')&&m.filter(x=>x&&x!=='fecha').length){iCab=i;mapa=m;break;}
  }
  if(iCab<0)return[];
  // En Zepp Life "calories" de ACTIVITY son calorías activas; "count" sin contexto = pasos.
  const esSueno=/sleep/i.test(nombreArchivo);
  const filas={};
  let fechaPrevia=null; // Garmin pone la fecha en una línea aparte
  for(const l of lineas.slice(iCab+1)){
    const v=separarCSV(l,sep);
    let fecha=null;const fila={};
    v.forEach((x,i)=>{
      const k=mapa[i];if(!k)return;
      if(k==='fecha'){fecha=aFecha(x);return;}
      const n=aNum(x);if(n===null)return;
      fila[k]=n;
    });
    if(!Object.keys(fila).length){if(fecha)fechaPrevia=fecha;continue;} // línea solo con la fecha
    fecha=fecha||fechaPrevia;
    if(!fecha)continue;
    const minutos=(fila._sueno_profundo||0)+(fila._sueno_ligero||0)+(fila._sueno_rem||0);
    if(minutos>0)fila.sueno=minutos/60;
    else if(fila.sueno>24)fila.sueno=fila.sueno/60; // venía en minutos
    delete fila._sueno_profundo;delete fila._sueno_ligero;delete fila._sueno_rem;
    if(esSueno&&!fila.sueno)continue;
    if(fila.peso>300)fila.peso=fila.peso/1000; // gramos
    if(fila.grasa>0&&fila.grasa<1)fila.grasa*=100; // fracción
    if(fila.agua>0&&fila.agua<1)fila.agua*=100;
    if(!Object.keys(fila).length)continue;
    const dia=filas[fecha]||(filas[fecha]={fecha});
    for(const [k,n] of Object.entries(fila)){
      if(METRICAS[k]?.suma&&dia[k]!==undefined)dia[k]+=n;
      else dia[k]=n;
    }
  }
  return Object.values(filas);
}

// --- Apple Salud (export.xml / exportar.xml) --------------------------------
// Se procesa por trozos (el archivo puede pesar cientos de MB).
const APPLE={
  HKQuantityTypeIdentifierBodyMass:'peso',
  HKQuantityTypeIdentifierBodyFatPercentage:'grasa',
  HKQuantityTypeIdentifierLeanBodyMass:'musculo',
  HKQuantityTypeIdentifierBodyMassIndex:'imc',
  HKQuantityTypeIdentifierWaistCircumference:'cintura',
  HKQuantityTypeIdentifierStepCount:'pasos',
  HKQuantityTypeIdentifierActiveEnergyBurned:'kcalActivas',
  HKQuantityTypeIdentifierRestingHeartRate:'fcReposo',
  HKQuantityTypeIdentifierBasalEnergyBurned:null,
  HKCategoryTypeIdentifierSleepAnalysis:'sueno'
};
export function crearLectorApple(){
  const ultimo={};            // fecha → {métrica: valor} (la última medición del día)
  const porFuente={};         // fecha|métrica|fuente → suma (pasos/kcal/sueño)
  let resto='',registros=0;
  const attr=(s,n)=>{const m=s.match(new RegExp(`\\b${n}="([^"]*)"`));return m?m[1]:null;};
  function registro(s){
    const tipo=attr(s,'type');
    if(!(tipo in APPLE)||!APPLE[tipo])return;
    const k=APPLE[tipo];
    const fecha=(attr(s,k==='sueno'?'endDate':'startDate')||'').slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha))return;
    registros++;
    if(k==='sueno'){
      if(!/Asleep/.test(attr(s,'value')||''))return; // ignora "en cama" y "despierto"
      const h=(new Date(attr(s,'endDate').replace(' ','T').replace(/ ([+-]\d{2})(\d{2})$/,'$1:$2'))-new Date(attr(s,'startDate').replace(' ','T').replace(/ ([+-]\d{2})(\d{2})$/,'$1:$2')))/3.6e6;
      if(h>0&&h<16){const id=`${fecha}|sueno|${attr(s,'sourceName')}`;porFuente[id]=(porFuente[id]||0)+h;}
      return;
    }
    let v=parseFloat(attr(s,'value'));
    if(isNaN(v))return;
    const unidad=attr(s,'unit')||'';
    if(k==='peso'||k==='musculo'){if(unidad==='lb')v*=0.45359237;else if(unidad==='g')v/=1000;}
    if(k==='grasa'&&v<=1)v*=100;
    if(k==='cintura'){if(unidad==='in')v*=2.54;else if(unidad==='m')v*=100;}
    if(k==='kcalActivas'&&unidad==='kJ')v/=4.184;
    if(METRICAS[k].suma){
      // iPhone y reloj cuentan los mismos pasos: se suma por fuente y luego se toma la mayor.
      const id=`${fecha}|${k}|${attr(s,'sourceName')}`;
      porFuente[id]=(porFuente[id]||0)+v;
    }else (ultimo[fecha]||(ultimo[fecha]={}))[k]=v;
  }
  return{
    agregar(trozo){
      const txt=resto+trozo;
      const fin=txt.lastIndexOf('>');
      if(fin<0){resto=txt;return;}
      resto=txt.slice(fin+1);
      for(const m of txt.slice(0,fin+1).matchAll(/<Record\s[^>]*>/g))registro(m[0]);
    },
    terminar(){
      const dias={};
      for(const [f,v] of Object.entries(ultimo))dias[f]={fecha:f,...v};
      for(const [id,v] of Object.entries(porFuente)){
        const [f,k]=id.split('|');
        const d=dias[f]||(dias[f]={fecha:f});
        d[k]=Math.max(d[k]||0,v);
      }
      return{filas:Object.values(dias),registros};
    }
  };
}

// --- Atajo de iPhone / enlace con datos ---------------------------------------
// nutricion.html#datos?peso=80.2&grasa=28.1&pasos=8500&kcal=420&fc=62&sueno=7.2&fecha=2026-10-14
const ALIAS_URL={peso:'peso',grasa:'grasa',musculo:'musculo',agua:'agua',visceral:'visceral',imc:'imc',
  cintura:'cintura',pasos:'pasos',kcal:'kcalActivas',kcalactivas:'kcalActivas',fc:'fcReposo',fcreposo:'fcReposo',sueno:'sueno'};
export function filaDesdeURL(hash){
  const m=String(hash||'').match(/#datos\?(.*)$/);
  if(!m)return null;
  const p=new URLSearchParams(m[1]);
  const fila={fecha:aFecha(p.get('fecha'))||hoy()};
  for(const [k,v] of p){
    const key=ALIAS_URL[k.toLowerCase()];
    // El Atajo a veces manda listas ("8500\n120") o unidades ("80,2 kg"): se toma el primer número.
    const n=aNum(String(v).split(/[\n|]/)[0]);
    if(key&&n!==null)fila[key]=key==='grasa'&&n<=1?n*100:key==='sueno'&&n>24?n/60:n;
  }
  return Object.keys(fila).length>1?fila:null;
}

// --- Cálculos ---------------------------------------------------------------
export function imc(peso,estaturaCm){
  return peso&&estaturaCm?peso/((estaturaCm/100)**2):null;
}
// % de grasa estimado por IMC (Deurenberg 1991). Solo si la báscula no lo da.
export function grasaEstimada(peso,perfil){
  const i=imc(peso,perfil.estatura);
  if(!i||!perfil.edad||!perfil.sexo)return null;
  return 1.2*i+0.23*perfil.edad-10.8*(perfil.sexo==='h'?1:0)-5.4;
}

// Promedio móvil de 7 días del peso (lo que realmente importa: el peso diario
// sube y baja 1–2 kg por agua, sal y digestión).
export function tendencia(mediciones,metrica='peso',dias=7){
  const pts=mediciones.filter(f=>f[metrica]!==undefined);
  return pts.map((f,i)=>{
    const t0=new Date(f.fecha)-(dias-1)*864e5;
    const ventana=pts.slice(0,i+1).filter(g=>new Date(g.fecha)>=t0);
    return{fecha:f.fecha,valor:f[metrica],media:ventana.reduce((s,g)=>s+g[metrica],0)/ventana.length};
  });
}

function cambioEnDias(serie,dias){
  if(serie.length<2)return null;
  const ult=serie[serie.length-1];
  const t0=new Date(ult.fecha)-dias*864e5;
  const ref=[...serie].reverse().find(p=>new Date(p.fecha)<=t0);
  if(!ref)return null;
  const d=(new Date(ult.fecha)-new Date(ref.fecha))/864e5;
  return{cambio:ult.media-ref.media,dias:d,porSemana:(ult.media-ref.media)/d*7,desde:ref};
}

// Recomendaciones personalizadas a partir de los datos. Cada una: {nivel, texto}.
// nivel: 'bien' | 'atencion' | 'info'.
export function recomendaciones(mediciones,perfil={},plan=null){
  const rec=[];
  const peso=tendencia(mediciones,'peso');
  const ult=mediciones[mediciones.length-1];
  if(!peso.length){
    rec.push({nivel:'info',texto:'Registra tu peso (o conecta la báscula) para empezar a ver tu progreso.'});
    return rec;
  }
  const pesoActual=peso[peso.length-1].media;
  const diasSinPesar=(new Date(hoy())-new Date(peso[peso.length-1].fecha))/864e5;
  if(diasSinPesar>=7)rec.push({nivel:'atencion',texto:`Hace ${Math.round(diasSinPesar)} días que no te pesas. Pésate en ayunas, después de ir al baño, siempre a la misma hora.`});

  const c=cambioEnDias(peso,14)||cambioEnDias(peso,7);
  if(c){
    const pct=c.porSemana/pesoActual*100;
    const kg=Math.abs(c.porSemana).toFixed(1).replace('.',',');
    if(pct<-1)rec.push({nivel:'atencion',texto:`Estás bajando ${kg} kg por semana (más del 1% de tu peso). Es muy rápido: puedes estar perdiendo músculo. Sube un poco la comida, sobre todo proteína.`});
    else if(pct<=-0.25)rec.push({nivel:'bien',texto:`Vas bajando ${kg} kg por semana: ritmo ideal y sostenible (0,5–1% de tu peso). ¡Sigue así!`});
    else if(pct<0.25&&c.dias>=14&&(perfil.meta?pesoActual>perfil.meta:true))rec.push({nivel:'atencion',texto:'Tu peso lleva 2 semanas estable. Revisa porciones y bebidas con azúcar, y suma 2 000 pasos diarios. Las mesetas son normales: no bajes más la comida sin hablar con tu nutricionista.'});
    else if(pct>=0.25)rec.push({nivel:'atencion',texto:`Tu peso subió ${kg} kg por semana. Revisa los productos que salieron "no apto" y los fines de semana.`});
  }

  // ¿Se pierde músculo o grasa?
  const conComp=mediciones.filter(f=>f.musculo!==undefined&&f.peso!==undefined);
  if(conComp.length>=2){
    const a=conComp[Math.max(0,conComp.length-8)],b=conComp[conComp.length-1];
    const dPeso=b.peso-a.peso,dMus=b.musculo-a.musculo;
    if(dPeso<-0.5&&dMus<0&&-dMus>-dPeso*0.4)rec.push({nivel:'atencion',texto:`Del peso que bajaste, ${Math.round(-dMus/-dPeso*100)}% fue músculo. Prioriza proteína en cada comida y haz ejercicios de fuerza 2–3 veces por semana.`});
    else if(dPeso<-0.5&&dMus>=-0.1)rec.push({nivel:'bien',texto:'Estás bajando de peso sin perder músculo. Excelente.'});
  }
  if(ult?.visceral>=10)rec.push({nivel:'atencion',texto:`Tu grasa visceral está en ${ult.visceral} (alto desde 10). Caminar a diario y bajar azúcares y alcohol es lo que más la reduce.`});

  // Reloj: pasos, sueño, pulso.
  const ult7=mediciones.filter(f=>new Date(hoy())-new Date(f.fecha)<=7*864e5);
  const prom=k=>{const v=ult7.map(f=>f[k]).filter(x=>x!==undefined);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null;};
  const pasos=prom('pasos');
  if(pasos!==null){
    if(pasos<5000)rec.push({nivel:'atencion',texto:`Promedias ${Math.round(pasos).toLocaleString('es')} pasos al día. Empieza con +1 500: una caminata de 15 minutos después del almuerzo.`});
    else if(pasos<8000)rec.push({nivel:'info',texto:`Promedias ${Math.round(pasos).toLocaleString('es')} pasos. Llegar a 8 000 ayuda bastante a bajar de peso.`});
    else rec.push({nivel:'bien',texto:`Promedias ${Math.round(pasos).toLocaleString('es')} pasos al día. ¡Muy bien!`});
  }
  const sueno=prom('sueno');
  if(sueno!==null&&sueno<6.5)rec.push({nivel:'atencion',texto:`Duermes ${sueno.toFixed(1).replace('.',',')} h en promedio. Dormir menos de 7 h aumenta el hambre y los antojos de dulce.`});

  // Metas.
  if(perfil.estatura){
    const i=imc(pesoActual,perfil.estatura);
    if(i)rec.push({nivel:'info',texto:`IMC ${i.toFixed(1).replace('.',',')} (${i<18.5?'bajo peso':i<25?'normal':i<30?'sobrepeso':'obesidad'}).`});
  }
  if(perfil.meta&&c&&c.porSemana<0&&pesoActual>perfil.meta){
    const semanas=(pesoActual-perfil.meta)/-c.porSemana;
    if(semanas<200){
      const f=new Date(Date.now()+semanas*7*864e5);
      rec.push({nivel:'info',texto:`A este ritmo llegarías a ${perfil.meta} kg alrededor de ${f.toLocaleDateString('es',{month:'long',year:'numeric'})}.`});
    }
  }
  const prot=plan?.proteina||Math.round(pesoActual*1.6);
  rec.push({nivel:'info',texto:`Meta de proteína: unos ${prot} g al día${plan?.proteina?' (según tu plan)':' (1,6 g por kg de peso)'}; reparte en cada comida.`});
  return rec;
}

// --- Recordatorios en el calendario del teléfono (.ics) ---------------------
// Es lo más confiable sin internet: el calendario del teléfono avisa aunque la
// app esté cerrada.
const DIAS_ICS=['SU','MO','TU','WE','TH','FR','SA'];
export function generarICS(cfg,consejo=''){
  const ahora=new Date();
  const fechaBase=hoy(ahora).replace(/-/g,'');
  const stamp=ahora.toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
  const ev=[];
  const evento=(id,hora,titulo,desc,rrule)=>{
    const [h,m]=hora.split(':');
    ev.push(['BEGIN:VEVENT',`UID:crcr-nutricion-${id}@local`,`DTSTAMP:${stamp}`,
      `DTSTART:${fechaBase}T${h.padStart(2,'0')}${m.padStart(2,'0')}00`,'DURATION:PT10M',
      `RRULE:${rrule}`,`SUMMARY:${titulo}`,`DESCRIPTION:${desc.replace(/[,;]/g,'\\$&')}`,
      'BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${titulo}`,'TRIGGER:PT0M','END:VALARM','END:VEVENT'].join('\r\n'));
  };
  if(cfg.pesar?.activo){
    const dias=(cfg.pesar.dias||[1]).map(d=>DIAS_ICS[d]).join(',');
    evento('pesar',cfg.pesar.hora||'07:00','⚖️ Pésate','En ayunas y después de ir al baño. Abre Mi Bienestar para registrar.',
      dias.split(',').length===7?'FREQ=DAILY':`FREQ=WEEKLY;BYDAY=${dias}`);
  }
  if(cfg.agua?.activo){
    for(let h=cfg.agua.desde??8;h<=(cfg.agua.hasta??20);h+=(cfg.agua.cadaHoras||2))
      evento(`agua-${h}`,`${h}:00`,'💧 Toma un vaso de agua','Mantenerte hidratado ayuda a controlar el hambre.','FREQ=DAILY');
  }
  if(cfg.pausa?.activo){
    for(let m=(cfg.pausa.desde??8)*60;m<=(cfg.pausa.hasta??17)*60;m+=Math.max(15,cfg.pausa.cadaMin||60)){
      const hora=`${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`;
      evento(`pausa-${hora.replace(':','')}`,hora,'🧘 Pausa activa','Levántate 3 minutos: estira cuello, hombros y piernas. Abre Mi Bienestar para la rutina guiada.','FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
    }
  }
  if(cfg.pasos?.activo)evento('pasos',cfg.pasos.hora||'18:00','🚶 ¿Ya caminaste hoy?','Una caminata de 15–20 minutos suma unos 2 000 pasos.','FREQ=DAILY');
  if(cfg.consejo?.activo)evento('consejo',cfg.consejo.hora||'09:00','💡 Mi Bienestar',consejo||'Revisa tu progreso y tu plan.','FREQ=DAILY');
  return['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CRCR Campo//Mi Bienestar//ES','CALSCALE:GREGORIAN',...ev,'END:VCALENDAR'].join('\r\n')+'\r\n';
}
