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
  return {codigos, probables, epp, resumen:resumenLineas.join('\n')};
}
