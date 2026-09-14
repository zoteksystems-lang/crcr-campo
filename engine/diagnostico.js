// Agente de Diagnóstico Diferencial — rankea ENF por solapamiento de palabras clave.
// Reemplaza "profundizar con IA" (profEnf/profRep): no genera texto nuevo, porque
// el contenido clínico (reconocimiento/acción/alerta) ya está completo y offline
// en data.js — este agente solo decide qué ficha mostrar primero.
import {tokenize} from './util.js';

export function sugerirDiagnosticos(textoCombinado, ENF, max=5){
  const tokens=new Set(tokenize(textoCombinado));
  if(tokens.size===0)return [];
  const puntuados=ENF.map(e=>{
    const campo=[e.t, ...(e.tags||[])].join(' ');
    const tCampo=new Set(tokenize(campo));
    let score=0;
    tokens.forEach(t=>{ if(tCampo.has(t))score++; });
    return {e,score};
  }).filter(p=>p.score>0);
  puntuados.sort((a,b)=>b.score-a.score);
  return puntuados.slice(0,max).map(p=>p.e);
}
