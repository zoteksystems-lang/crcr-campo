// Utilidades compartidas por los agentes locales. Sin red, sin dependencias.
export function normalize(str){
  return (str||'').toString().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'') // quita tildes (marcas diacríticas tras NFD)
    .replace(/[^a-z0-9\s]/gi,' ')
    .replace(/\s+/g,' ').trim();
}
export function tokenize(str){
  return normalize(str).split(' ').filter(w=>w.length>2);
}
function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

// Cuenta cuántas palabras clave (o frases) aparecen dentro del texto normalizado,
// respetando límites de palabra — así "CO" no matchea dentro de "colisión" o "con".
export function keywordScore(text, keywords){
  const nt=normalize(text);
  let score=0;
  for(const kw of keywords){
    const nkw=normalize(kw);
    if(!nkw)continue;
    const re=new RegExp(`\\b${escapeRegExp(nkw)}\\b`);
    if(re.test(nt))score++;
  }
  return score;
}
export function splitSentences(text){
  return (text||'').split(/(?<=[.!?;\n])\s+/).map(s=>s.trim()).filter(Boolean);
}
