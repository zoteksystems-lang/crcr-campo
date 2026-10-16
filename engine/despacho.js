// Agente de Despacho — interpreta el texto/transcripción del despacho localmente.
// Reemplaza la llamada a la API que hacía interpDesp(). Cero red.
import {normalize, keywordScore} from './util.js';

// Detecta códigos CRC citados textualmente (ej: "E36", "código 65", "65").
export function detectarCodigos(texto, CODS){
  const encontrados=[];
  const nt=' '+normalize(texto)+' ';
  for(const [cod,desc] of Object.entries(CODS)){
    const pat=cod.startsWith('E')?cod.toLowerCase():` ${cod} `;
    if(cod.startsWith('E')){
      if(nt.includes(pat.toLowerCase()))encontrados.push({cod,desc});
    }else{
      // Los códigos numéricos (no-E) son ambiguos sueltos (ej: "14" puede ser un
      // kilometraje) — solo cuentan si vienen precedidos de "código"/"codigo".
      const re=new RegExp(`(código|codigo)\\s+${cod}\\b`,'i');
      if(re.test(texto))encontrados.push({cod,desc});
    }
  }
  return encontrados;
}

// Clasifica el tipo de emergencia por coincidencia de palabras clave contra ENF.tags.
export function clasificarTipo(texto, ENF){
  const puntajes=ENF.map(e=>({e,score:keywordScore(texto, [e.t, ...e.tags])}));
  puntajes.sort((a,b)=>b.score-a.score);
  return puntajes.filter(p=>p.score>0).slice(0,3).map(p=>p.e);
}

export function sugerirEPP(enfermedadesProbables, EPP_POR_TIPO){
  const tags=new Set();
  enfermedadesProbables.forEach(e=>e.tags.forEach(t=>{
    for(const key of Object.keys(EPP_POR_TIPO)) if(t.includes(key)||key.includes(t)) tags.add(key);
  }));
  const items=new Set();
  tags.forEach(t=>(EPP_POR_TIPO[t]||[]).forEach(i=>items.add(i)));
  if(items.size===0)['EPP estándar','Guantes','Monitor básico'].forEach(i=>items.add(i));
  return [...items];
}

// Ubicación del despacho para navegar: coordenadas si vienen, o la frase de
// lugar ("Ruta 27 km 14", "200 m norte de la iglesia de Grecia", "barrio…").
const MARCAS_LUGAR=/\b(ruta\s*(?:nacional\s*)?\d+[^,.;]*|km\s*\d+[^,.;]*|autopista[^,.;]*|carretera[^,.;]*|(?:\d+\s*(?:m|mts|metros|varas)\s*)?(?:al\s*)?(?:norte|sur|este|oeste)\s+de[^,.;]*|(?:frente|contiguo|costado|diagonal|detr[aá]s|cerca)\s+(?:a|al|de|del)?[^,.;]*|(?:barrio|urbanizaci[oó]n|residencial|condominio|calle|avenida|av\.?|caser[ií]o|distrito|cant[oó]n)\s+[^,.;]*|en\s+[A-ZÁÉÍÓÚÑ][^,.;]*)/gi;
export function extraerUbicacion(texto){
  const t=String(texto||'');
  const c=t.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{2,3}\.\d{3,})/);
  if(c)return{texto:`${c[1]}, ${c[2]}`,lat:+c[1],lon:+c[2]};
  // Se descartan los códigos de radio para que no estorben ("E36", "código 65").
  const limpio=t.replace(/\bE\d{2}\b/g,' ').replace(/\bc[oó]digo\s*\d+\b/gi,' ');
  const partes=[];
  for(const m of limpio.matchAll(MARCAS_LUGAR)){
    const p=m[0].replace(/\s+/g,' ').trim().replace(/^en\s+/i,'');
    if(p.length>=4&&!partes.some(x=>x.includes(p)))partes.push(p);
  }
  return partes.length?{texto:partes.slice(0,3).join(', ')}:null;
}
export function enlacesNavegacion(ub){
  if(!ub)return null;
  if(ub.lat!=null){
    return{waze:`https://waze.com/ul?ll=${ub.lat},${ub.lon}&navigate=yes`,
      maps:`https://www.google.com/maps/dir/?api=1&destination=${ub.lat},${ub.lon}&travelmode=driving`};
  }
  const q=encodeURIComponent(/costa rica/i.test(ub.texto)?ub.texto:ub.texto+', Costa Rica');
  return{waze:`https://waze.com/ul?q=${q}&navigate=yes`,
    maps:`https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`};
}

export function interpretarDespacho(texto, {CODS, ENF, EPP_POR_TIPO}){
  const codigos=detectarCodigos(texto, CODS);
  const probables=clasificarTipo(texto, ENF);
  const epp=sugerirEPP(probables, EPP_POR_TIPO);
  const resumenLineas=[];
  resumenLineas.push(codigos.length
    ? '📻 Códigos detectados: '+codigos.map(c=>`${c.cod} (${c.desc})`).join(', ')
    : '📻 No se detectaron códigos CRC explícitos en el texto.');
  resumenLineas.push(probables.length
    ? '🩺 Tipo probable: '+probables.map(p=>`${p.i} ${p.t}${p.e?` (${p.e})`:''}`).join(' / ')
    : '🩺 No hay coincidencia clara con ningún cuadro conocido — revisá manualmente.');
  resumenLineas.push('🎒 Equipo/EPP sugerido: '+epp.join(', '));
  const ubicacion=extraerUbicacion(texto);
  if(ubicacion)resumenLineas.push('📍 Ubicación: '+ubicacion.texto+' (botones para navegar en Despacho)');
  return {codigos, probables, epp, ubicacion, resumen:resumenLineas.join('\n')};
}
