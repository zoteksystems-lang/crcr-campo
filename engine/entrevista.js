// Agente de Entrevista — extrae SAMPLE/OPQRST de la transcripción local (Whisper).
// Reemplaza analyzeSO() (llamada a IA). Puramente determinístico: matching de
// frases gatillo por campo. Nunca sobrescribe lo que el socorrista ya escribió a mano.
import {normalize, splitSentences} from './util.js';

const GATILLOS_SAMPLE={
  S:['siente','duele','dolor','molestia','síntoma','sintoma'],
  A:['alergia','alergico','alérgico','alergica'],
  M:['medicamento','toma pastilla','tratamiento con','pastillas de'],
  P:['padece','diagnosticado','cirugía','cirugia','enfermedad cronica','enfermedad crónica','antecedente'],
  L:['comio','comió','tomo agua','tomó agua','ultima comida','última comida','desayuno','almuerzo'],
  E:['paso','pasó','ocurrio','ocurrió','se cayo','se cayó','lo atropello','lo atropelló','estaba haciendo']
};
const GATILLOS_OPQRST={
  O:['empezo','empezó','comenzo','comenzó','inicio','inició','desde hace'],
  P:['mejora con','empeora con','alivia con','aumenta con'],
  Q:['se siente como','es un dolor','tipo','se describe como'],
  R:['se irradia','le duele en','en el area de','en el área de'],
  S:['del uno al diez','escala de dolor','que tan fuerte'],
  T:['lleva asi','lleva así','hace cuanto','hace cuánto','desde hace']
};

function extraerPorGatillos(transcripcion, gatillos){
  const frases=splitSentences(transcripcion);
  const resultado={};
  for(const [campo,frasesGatillo] of Object.entries(gatillos)){
    const encontradas=frases.filter(f=>{
      const nf=normalize(f);
      return frasesGatillo.some(g=>nf.includes(normalize(g)));
    });
    if(encontradas.length)resultado[campo]=encontradas.join(' ');
  }
  return resultado;
}

// Severidad 0-10 mencionada en el texto ("un ocho de diez", "8 de 10", etc.)
function extraerSeveridad(transcripcion){
  const m=transcripcion.match(/\b(10|[0-9])\s*(de|\/)\s*10\b/);
  return m?m[1]:null;
}

export function extraerSAMPLE(transcripcion){
  return extraerPorGatillos(transcripcion, GATILLOS_SAMPLE);
}
export function extraerOPQRST(transcripcion){
  const out=extraerPorGatillos(transcripcion, GATILLOS_OPQRST);
  const sev=extraerSeveridad(transcripcion);
  if(sev && !out.S)out.S=`Severidad mencionada: ${sev}/10`;
  return out;
}
