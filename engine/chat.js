// Chat local por búsqueda — reemplaza el chat libre contra la API de Anthropic.
// No genera texto: busca por palabras clave en CODS/ENF/PROT y devuelve el
// contenido real que ya existe offline en data.js. Determinístico, sin inventos.
import {tokenize} from './util.js';

function scoreContra(tokensQuery, textoCampo){
  const tCampo=new Set(tokenize(textoCampo));
  let score=0;
  tokensQuery.forEach(t=>{ if(tCampo.has(t))score++; });
  return score;
}

export function buscarLocal(query, {CODS, ENF, PROT}, max=3){
  const tokens=tokenize(query);
  if(tokens.length===0)return [];
  const resultados=[];

  for(const [cod,desc] of Object.entries(CODS)){
    const score=scoreContra(tokens, cod+' '+desc);
    if(score>0)resultados.push({tipo:'codigo',score,titulo:`Código ${cod}`,texto:desc,ref:cod});
  }
  for(const e of ENF){
    const score=scoreContra(tokens, [e.t,...e.tags].join(' '));
    if(score>0){
      const texto=[
        ...e.r.map(ri=>`${ri.s}: ${ri.d}`),
        '⚡ Acción: '+e.a.join(' · '),
        e.al||''
      ].filter(Boolean).join('\n');
      resultados.push({tipo:'enfermedad',score,titulo:`${e.i} ${e.t}${e.e?` (${e.e})`:''}`,texto,ref:e.id});
    }
  }
  for(const [key,p] of Object.entries(PROT)){
    for(const sec of p.s){
      const score=scoreContra(tokens, p.t+' '+sec.t+' '+sec.items.map(it=>it.t+' '+it.d).join(' '));
      if(score>0){
        const texto=sec.items.map(it=>`${it.t}: ${it.d}`).join('\n');
        resultados.push({tipo:'protocolo',score,titulo:`${p.i} ${p.t} — ${sec.t}`,texto,ref:key});
      }
    }
  }
  resultados.sort((a,b)=>b.score-a.score);
  return resultados.slice(0,max);
}

export function formatearRespuesta(query, resultados){
  if(resultados.length===0){
    return '🔍 No encontré coincidencia clara en la base offline para: "'+query+
      '".\nProbá con Enfermedades, Repaso o Códigos, o usá otras palabras.';
  }
  return resultados.map(r=>`【${r.titulo}】\n${r.texto}`).join('\n\n');
}
