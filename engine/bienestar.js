// Bienestar diario: agua y pausas activas. Todo local (funciona sin internet).
const CLAVE_AGUA='crcr-agua';      // {'AAAA-MM-DD': ml}
const CLAVE_PAUSAS='crcr-pausas';  // {'AAAA-MM-DD': cantidad}

function hoy(d=new Date()){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function leer(clave){try{return JSON.parse(localStorage.getItem(clave))||{};}catch{return{};}}
function escribir(clave,v){
  // Solo se guardan los últimos 60 días.
  const dias=Object.keys(v).sort().slice(-60);
  try{localStorage.setItem(clave,JSON.stringify(Object.fromEntries(dias.map(d=>[d,v[d]]))));}catch{}
}

// Meta de agua: ~35 ml por kg de peso, entre 1,5 y 3,5 L; 2 L si no hay peso.
// (Referencia general para adultos sanos; si tienes una indicación médica, manda esa.)
export function metaAgua(pesoKg,{actividad=false}={}){
  let ml=pesoKg?pesoKg*35:2000;
  if(actividad)ml+=500;
  return Math.round(Math.min(3500,Math.max(1500,ml))/50)*50;
}
export function aguaHoy(){return leer(CLAVE_AGUA)[hoy()]||0;}
export function sumarAgua(ml){
  const a=leer(CLAVE_AGUA),d=hoy();
  a[d]=Math.max(0,(a[d]||0)+ml);
  escribir(CLAVE_AGUA,a);
  return a[d];
}
export function historialAgua(dias=7){
  const a=leer(CLAVE_AGUA),out=[];
  for(let i=dias-1;i>=0;i--){const d=hoy(new Date(Date.now()-i*864e5));out.push({fecha:d,ml:a[d]||0});}
  return out;
}

export function pausasHoy(){return leer(CLAVE_PAUSAS)[hoy()]||0;}
export function sumarPausa(){
  const p=leer(CLAVE_PAUSAS),d=hoy();
  p[d]=(p[d]||0)+1;
  escribir(CLAVE_PAUSAS,p);
  return p[d];
}

// Pausas activas guiadas: ejercicios suaves, sin equipo, de pie o sentado.
// s = segundos; lado = se repite con el otro lado a la mitad.
export const EJERCICIOS={
  respirar:{n:'Respiración profunda',e:'🌬️',s:30,txt:'Inhala por la nariz 4 segundos, sostén 2 y exhala por la boca 6. Hombros relajados.'},
  cuello:{n:'Cuello de lado a lado',e:'🙆',s:30,lado:true,txt:'Lleva la oreja hacia el hombro sin subirlo. Sostén suave, sin rebotar.'},
  hombros:{n:'Círculos de hombros',e:'🔄',s:30,txt:'Sube los hombros hacia las orejas y gíralos hacia atrás, lento. Cambia de dirección a la mitad.'},
  brazos:{n:'Estírate hacia arriba',e:'🙌',s:30,txt:'Entrelaza los dedos, sube los brazos y crece hacia el techo. Respira.'},
  munecas:{n:'Muñecas y dedos',e:'✋',s:30,txt:'Abre y cierra las manos; luego estira cada muñeca hacia atrás con la otra mano.'},
  torsion:{n:'Torsión de tronco',e:'↩️',s:30,lado:true,txt:'Sentado derecho, gira el tronco tomando el respaldo. Mira hacia atrás sin forzar.'},
  pecho:{n:'Abre el pecho',e:'🫁',s:30,txt:'Junta las manos detrás de la espalda, lleva los hombros atrás y levanta un poco el pecho.'},
  sentadilla:{n:'Sentadillas a la silla',e:'🪑',s:40,txt:'Párate y siéntate despacio, sin dejarte caer. Unas 10 repeticiones a tu ritmo.'},
  talones:{n:'Elevación de talones',e:'🦶',s:30,txt:'De pie, sube en puntas y baja lento. Ayuda a la circulación de las piernas.'},
  marcha:{n:'Marcha en el sitio',e:'🚶',s:45,txt:'Camina sin moverte, subiendo bien las rodillas y moviendo los brazos.'},
  cuadriceps:{n:'Estira el muslo',e:'🦵',s:30,lado:true,txt:'Apóyate en la pared, toma el pie por detrás y llévalo al glúteo.'},
  ojos:{n:'Descanso visual 20-20-20',e:'👀',s:20,txt:'Mira algo lejano (a unos 6 metros) durante 20 segundos y parpadea.'}
};
export const RUTINAS={
  oficina:{n:'Pausa de oficina',min:3,desc:'Sentado o de pie, para cuello, espalda y manos.',
    pasos:['respirar','cuello','hombros','brazos','munecas','torsion','ojos']},
  activa:{n:'Pausa activa',min:5,desc:'Para mover el cuerpo y activar la circulación.',
    pasos:['respirar','marcha','sentadilla','talones','pecho','cuadriceps','brazos','respirar']},
  express:{n:'Pausa express',min:1,desc:'Cuando no tienes tiempo: un minuto basta.',
    pasos:['brazos','hombros','ojos']}
};
export function duracionRutina(id){
  return RUTINAS[id].pasos.reduce((s,k)=>s+EJERCICIOS[k].s,0);
}

// Momentos del día en que tocan pausas / agua (para recordatorios y calendario).
export function horarios(desde,hasta,cadaMin){
  const out=[];
  for(let m=desde*60;m<=hasta*60;m+=Math.max(15,cadaMin))out.push(`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`);
  return out;
}
