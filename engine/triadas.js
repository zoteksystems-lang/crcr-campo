// Tríadas clínicas — si aparecen 2 de 3 componentes, la app avisa qué cuadro
// sugieren y cuál componente falta buscar. Cada componente: nombre, palabras que
// lo sugieren y, si aplica, una regla con los signos vitales de la boleta.
import {normalize} from './util.js';

const num=x=>{const n=parseFloat(String(x??'').replace(',','.'));return isNaN(n)?null:n;};
const v=(sv,k)=>num(sv?.[k]);
const contiene=(nt,f)=>{const n=normalize(f);return n&&new RegExp('(^| )'+n+'( |$)').test(nt);};

export const TRIADAS=[
  {n:'Tríada de Beck',dx:'taponamiento',que:'taponamiento cardíaco',
   c:[['PA baja',['hipotension','presion baja','pa baja','shock'],sv=>v(sv,'pa1')!=null&&v(sv,'pa1')<90],
      ['Venas del cuello distendidas',['venas del cuello','yugulares','ingurgitacion yugular']],
      ['Ruidos cardíacos apagados',['ruidos cardiacos apagados','ruidos apagados','corazon se oye lejos']]],
   extra:'Herida en el pecho + esto = traslado inmediato.'},
  {n:'Tríada de Cushing',dx:'tce',que:'hipertensión intracraneal (herniación)',
   c:[['PA alta',['presion alta','hipertension'],sv=>v(sv,'pa1')!=null&&v(sv,'pa1')>=160],
      ['Bradicardia',['bradicardia','pulso lento'],sv=>v(sv,'fc')!=null&&v(sv,'fc')<60],
      ['Respiración irregular',['respiracion irregular','respira irregular','pausas al respirar','respira raro']]],
   extra:'Con Glasgow bajando o pupilas desiguales: traslado inmediato.'},
  {n:'Tríada opioide',dx:'drogas',que:'intoxicación por opioides',
   c:[['Inconsciente / muy somnoliento',['inconsciente','no responde','somnoliento','no despierta'],sv=>v(sv,'gcs')!=null&&v(sv,'gcs')<=12],
      ['Pupilas puntiformes',['pupilas chiquitas','pupilas puntiformes','punta de alfiler','miosis']],
      ['Respira lento o poco',['respira lento','respira poco','casi no respira','respiracion lenta'],sv=>v(sv,'fr')!=null&&v(sv,'fr')<10]],
   extra:'Prioridad: ventilar con bolsa-válvula-mascarilla.'},
  {n:'Tríada de Whipple',dx:'hipoglucemia',que:'hipoglucemia',
   c:[['Síntomas (sudor, temblor, confusión)',['sudando frio','sudor frio','temblor','confuso','conducta extrana','desorientado']],
      ['Glicemia baja',['azucar baja','glucosa baja','hipoglicemia','hipoglucemia'],sv=>v(sv,'glu')!=null&&v(sv,'glu')<70],
      ['Mejora al dar azúcar',['mejoro con azucar','mejoro con glucosa','se recupero con azucar']]]},
  {n:'Tríada meníngea',dx:'meningitis',que:'meningitis',
   c:[['Fiebre',['fiebre','calentura'],sv=>v(sv,'temp')!=null&&v(sv,'temp')>=38],
      ['Rigidez de nuca',['rigidez de nuca','cuello rigido','no puede bajar la cabeza']],
      ['Alteración de conciencia',['confuso','desorientado','somnoliento','no responde','inconsciente'],sv=>v(sv,'gcs')!=null&&v(sv,'gcs')<15]],
   extra:'Mascarilla para el equipo y el paciente.'},
  {n:'Tríada del embarazo ectópico',dx:'amenaza_aborto',que:'embarazo ectópico roto',
   c:[['Retraso menstrual / embarazo',['retraso menstrual','embarazada','embarazo','no le ha venido la regla']],
      ['Dolor abdominal bajo',['dolor bajito','dolor abdominal','dolor de vientre','dolor de un lado']],
      ['Sangrado vaginal',['sangrado vaginal']]],
   extra:'Típico antes de las 12 semanas. Con signos de shock: traslado inmediato a centro con quirófano.'},
  {n:'Tríada de aneurisma aórtico roto',dx:'aneurisma',que:'aneurisma de aorta roto',
   c:[['Dolor abdominal o lumbar súbito',['dolor de espalda','dolor lumbar','dolor abdominal','desgarrante']],
      ['Hipotensión / desmayo',['desmayo','se desmayo','presion baja','shock'],sv=>v(sv,'pa1')!=null&&v(sv,'pa1')<90],
      ['Masa pulsátil en abdomen',['masa que late','masa pulsatil','late el abdomen']]]},
  {n:'Tríada letal del trauma',dx:'politrauma',que:'trauma grave con riesgo de muerte',
   c:[['Hipotermia',['hipotermia','tiene frio','temblando de frio'],sv=>v(sv,'temp')!=null&&v(sv,'temp')<36],
      ['Sangrado que no para',['sangra mucho','hemorragia','sangrado abundante','no para de sangrar']],
      ['Shock (acidosis)',['shock','palido y frio','pulso debil'],sv=>v(sv,'pa1')!=null&&v(sv,'pa1')<90]],
   extra:'Prevenila: controlá el sangrado, abrigá y trasladá rápido.'},
  {n:'Tríada del golpe de calor',dx:'calor',que:'golpe de calor',
   c:[['Exposición a calor / esfuerzo',['sol','calor','trabajando al sol','maraton','ejercicio']],
      ['Temperatura muy alta',['piel caliente','muy caliente','fiebre alta'],sv=>v(sv,'temp')!=null&&v(sv,'temp')>=40],
      ['Alteración neurológica',['confuso','desorientado','convulsion','inconsciente']]],
   extra:'Enfriar YA (agua + ventilación) mientras se traslada.'},
  {n:'Tríada de la preeclampsia',dx:'preeclampsia',que:'preeclampsia',
   c:[['Embarazo >20 semanas / posparto',['embarazada','embarazo','posparto','dio a luz']],
      ['PA alta',['presion alta','hipertension'],sv=>v(sv,'pa1')!=null&&v(sv,'pa1')>=140],
      ['Edema o síntomas (cefalea, visión)',['manos y cara hinchadas','dolor de cabeza','vision borrosa','lucecitas']]]},
  {n:'Tríada de hiperglucemia',dx:'hiperglucemia',que:'descompensación diabética',
   c:[['Mucha sed',['mucha sed','toma mucha agua']],
      ['Orina mucho',['orina mucho','orina a cada rato']],
      ['Glicemia alta / respiración profunda',['azucar alta','glucosa alta','aliento a fruta','respira profundo'],sv=>v(sv,'glu')!=null&&v(sv,'glu')>250]]}
];

export function triadasPresentes(texto,{sv}={}){
  const nt=' '+normalize(texto)+' ';
  const out=[];
  for(const t of TRIADAS){
    const si=[],no=[];
    for(const [nom,ks,regla] of t.c)(ks.some(k=>contiene(nt,k))||(regla&&regla(sv||{}))?si:no).push(nom);
    if(si.length>=2)out.push({n:t.n,dx:t.dx,que:t.que,si,no,completa:!no.length,extra:t.extra||''});
  }
  return out.sort((a,b)=>b.si.length-a.si.length);
}
