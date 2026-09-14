// Agente de Signos Vitales — reglas de rango normal/alerta/crítico, 100% local.
// Reemplaza interpSV() (llamada a IA) y las "5 acciones" que pedía showTrRes().
import {TACC} from '../data.js';

// Rangos de adulto. Los pediátricos usan la tabla ya existente en PROT.pediatrico
// (mostrada aparte en Repaso); acá solo advertimos que en <12 años hay que comparar
// contra esa tabla en vez de estos rangos de adulto.
const RANGOS_ADULTO={
  fc:{min:60,max:100,unidad:'lpm',nombre:'Frecuencia cardíaca'},
  fr:{min:12,max:20,unidad:'rpm',nombre:'Frecuencia respiratoria'},
  spo2:{min:94,max:100,unidad:'%',nombre:'Saturación O₂'},
  temp:{min:36,max:37.5,unidad:'°C',nombre:'Temperatura'},
  glu:{min:70,max:140,unidad:'mg/dL',nombre:'Glucosa'}
};

function evaluarNumero(valor, rango){
  const v=parseFloat(valor);
  if(isNaN(v))return null;
  if(v<rango.min*0.7 || v>rango.max*1.4)return{v,status:'critico'};
  if(v<rango.min || v>rango.max)return{v,status:'alerta'};
  return{v,status:'normal'};
}

function evaluarPA(sist,diast){
  const s=parseFloat(sist),d=parseFloat(diast);
  if(isNaN(s))return null;
  if(s<80 || s>200)return{v:`${sist}/${diast||'?'}`,status:'critico'};
  if(s<90 || s>140 || (d && (d<60||d>90)))return{v:`${sist}/${diast||'?'}`,status:'alerta'};
  return{v:`${sist}/${diast||'?'}`,status:'normal'};
}

function evaluarGCS(gcs){
  const v=parseInt(gcs);
  if(isNaN(v))return null;
  if(v<=8)return{v,status:'critico'};
  if(v<=12)return{v,status:'alerta'};
  return{v,status:'normal'};
}

// Evalúa un set de signos vitales tipo boleta.sv1 y devuelve {campo:{v,status,nombre,unidad}}
export function evaluarSignosVitales(sv){
  const out={};
  if(sv.fc)out.fc={...evaluarNumero(sv.fc,RANGOS_ADULTO.fc), ...RANGOS_ADULTO.fc};
  if(sv.fr)out.fr={...evaluarNumero(sv.fr,RANGOS_ADULTO.fr), ...RANGOS_ADULTO.fr};
  if(sv.spo2)out.spo2={...evaluarNumero(sv.spo2,RANGOS_ADULTO.spo2), ...RANGOS_ADULTO.spo2};
  if(sv.temp)out.temp={...evaluarNumero(sv.temp,RANGOS_ADULTO.temp), ...RANGOS_ADULTO.temp};
  if(sv.glu)out.glu={...evaluarNumero(sv.glu,RANGOS_ADULTO.glu), ...RANGOS_ADULTO.glu};
  if(sv.pa1)out.pa={...evaluarPA(sv.pa1,sv.pa2), nombre:'Presión arterial', unidad:'mmHg'};
  if(sv.gcs)out.gcs={...evaluarGCS(sv.gcs), nombre:'Glasgow', unidad:'/15'};
  return out;
}

export function resumenSignosVitales(sv){
  const ev=evaluarSignosVitales(sv);
  const criticos=Object.values(ev).filter(x=>x&&x.status==='critico');
  const alertas=Object.values(ev).filter(x=>x&&x.status==='alerta');
  const lineas=Object.entries(ev).filter(([,x])=>x).map(([k,x])=>
    `${x.status==='critico'?'🔴':x.status==='alerta'?'🟡':'🟢'} ${x.nombre}: ${x.v}${x.unidad?' '+x.unidad:''} (${x.status})`
  );
  const encabezado=criticos.length?'🔴 HAY PARÁMETROS CRÍTICOS':alertas.length?'🟡 Hay parámetros en alerta':'🟢 Signos dentro de rango';
  return {evaluacion:ev, criticos, alertas, texto:[encabezado,...lineas].join('\n')};
}

export function accionesTriage(nivel){
  return TACC[nivel]||[];
}
