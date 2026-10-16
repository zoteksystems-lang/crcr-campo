// Guía de arribo — analiza el texto del despacho (escrito o transcrito) y arma
// la lista corta de qué revisar al llegar, en orden. Todo local, sin red.
// Es apoyo para no olvidar nada; no reemplaza el protocolo ni la valoración.
import {normalize} from './util.js';
import {tresImpresiones,triadasPresentes} from './impresion.js';

// Cómo se dice cada cuadro por radio o por quien llama (lenguaje de Costa Rica).
const PALABRAS={
  sca:['dolor de pecho','dolor en el pecho','dolor toracico','opresion','infarto','le duele el pecho','dolor precordial','angina','cardiaco','sudoroso'],
  pcr:['paro','no respira','no responde','inconsciente','sin pulso','rcp','reanimacion','no reacciona','desmayado no respira','muerte subita','dea'],
  avc:['derrame','avc','acv','ictus','cara torcida','boca torcida','no puede hablar','habla raro','arrastra las palabras','no mueve el brazo','no mueve la pierna','hemiplejia','paralisis','debilidad de un lado','perdio la fuerza'],
  conv:['convulsion','convulsiona','convulsionando','ataque','epilepsia','epileptico','temblando','espuma'],
  hipog:['diabetico','diabetica','azucar baja','glucosa','hipoglicemia','hipoglucemia','insulina','sudando frio'],
  hipona:['sodio','deshidratado','deshidratacion','confuso','desorientado','vomitos','diarrea'],
  disnea:['falta de aire','no puede respirar','le cuesta respirar','ahogo','se ahoga','asma','asmatico','epoc','dificultad respiratoria','silbido','respira rapido','atragantado','atragantamiento','obstruccion'],
  trauma:['herido','herida','golpe','golpeado','agresion','agredido','riña','pleito','arma blanca','cuchillo','puñal','arma de fuego','disparo','balazo','baleado','fractura','sangrado','hemorragia','sangra','apuñalado','trauma'],
  anafilaxia:['alergia','alergica','alergico','picadura','abeja','avispa','urticaria','ronchas','hinchazon','se le hincho','anafilaxia'],
  etilic:['ebrio','borracho','tomado','licor','alcohol','intoxicado','intoxicacion','sobredosis','drogas','pastillas'],
  colision:['colision','choque','chocaron','accidente de transito','atropello','atropellado','motociclista','moto','vuelco','volcado','carro','bus','bicicleta','ciclista','ruta','autopista'],
  incendio:['incendio','fuego','humo','quemado','quemadura','quemaduras','gas','monoxido','inhalacion'],
  gineco:['embarazada','embarazo','parto','dando a luz','contracciones','rompio fuente','bebe naciendo','sangrado vaginal','aborto','obstetrico'],
  comp:['agresivo','agitado','agitacion','psiquiatrico','intento de suicidio','suicida','quiere matarse','crisis nerviosa','ansiedad','violento','alterado'],
  expl:['explosion','exploto','estallido','pirotecnia','bomba','onda expansiva'],
  caida:['caida','se cayo','cayo de','cayo desde','resbalo','andamio','techo','escalera','altura','adulto mayor se cayo']
};

// Preguntas clave por cuadro (a quien llamó, al paciente o a testigos).
const PREGUNTAS={
  sca:['¿Desde qué hora el dolor? ¿Es constante?','¿Tomó Viagra/sildenafil o similar en 48 h?','¿Antecedente de infarto, presión alta, diabetes?','¿Alergia a la aspirina? ¿Sangrado digestivo reciente?'],
  pcr:['¿A qué hora lo vieron caer? ¿Alguien hizo RCP?','¿Se usó DEA?','¿Enfermedad terminal o voluntad anticipada?'],
  avc:['¿A qué HORA lo vieron bien por última vez? (anotarla exacta)','¿Toma anticoagulantes?','¿Es diabético? (descartar azúcar baja)','¿Convulsionó o se golpeó la cabeza?'],
  conv:['¿Cuánto duró? ¿Es la primera vez?','¿Es epiléptico? ¿Toma su medicamento?','¿Es diabético, está embarazada, tomó licor o drogas?','¿Se golpeó la cabeza?'],
  hipog:['¿Se aplicó insulina? ¿Comió?','¿Cuándo fue la última glicemia?','¿Hizo ejercicio o tomó licor?'],
  hipona:['¿Desde cuándo está confuso?','¿Toma diuréticos? ¿Vómitos o diarrea?','¿Cuánta agua toma?'],
  disnea:['¿Asmático o EPOC? ¿Usó su inhalador?','¿Empezó de golpe? ¿Comiendo (atragantamiento)?','¿Fiebre? ¿Dolor de pecho?','¿Usa oxígeno en casa?'],
  trauma:['¿Qué lo hirió? (arma, objeto, altura)','¿Cuántas heridas? ¿Hay más heridos?','¿El agresor sigue en el lugar?','¿Toma anticoagulantes?'],
  anafilaxia:['¿A qué se expuso y a qué hora?','¿Tiene adrenalina (EpiPen)? ¿Se la puso?','¿Le había pasado antes?'],
  etilic:['¿Qué tomó o consumió, cuánto y a qué hora?','¿Hay envases o pastillas en la escena? (llevarlas)','¿Se golpeó? ¿Vomitó?'],
  colision:['¿Cuántos vehículos y cuántos ocupantes?','¿Usaban cinturón/casco? ¿Se activaron bolsas?','¿Hay alguien atrapado o expulsado?','¿Velocidad aproximada?'],
  incendio:['¿Hay personas dentro todavía?','¿Espacio cerrado? ¿Cuánto tiempo expuesto al humo?','¿Bomberos en la escena?'],
  gineco:['¿Cuántas semanas tiene? ¿Primer embarazo?','¿Cada cuánto las contracciones? ¿Rompió fuente? ¿De qué color?','¿Siente ganas de pujar?','¿Sangrado? ¿Dolor de cabeza o visión borrosa?'],
  mordedura:['¿A qué hora lo mordió? ¿Cómo era la serpiente (foto si es seguro, sin acercarse)?','¿Sangra por encías, nariz u orina oscura?','¿Le hicieron torniquete, cortes o le pusieron algo?'],
  ovace:['¿Qué se tragó y hace cuánto?','¿Puede toser, llorar o hablar?','¿Perdió el conocimiento en algún momento?'],
  taponamiento:['¿Con qué lo hirieron y dónde exactamente?','¿Hay más heridas (espalda, axilas)?'],
  hemorragia_ext:['¿Con qué se hirió? ¿Hace cuánto?','¿Toma anticoagulantes?','¿Cuánta sangre perdió (charco, ropa empapada)?'],
  politrauma:['¿Cuántos vehículos y ocupantes? ¿Cinturón/casco?','¿Alguien atrapado o expulsado?','¿Velocidad aproximada? ¿Hubo fallecidos en el mismo vehículo?'],
  comp:['¿Tiene armas u objetos peligrosos?','¿Consumió drogas o licor?','¿Diagnóstico psiquiátrico? ¿Toma medicamentos?','¿Intentó hacerse daño? ¿Con qué?'],
  expl:['¿Cuántos heridos? ¿Riesgo de segunda explosión?','¿Hay químicos o gas?','¿Bomberos/Policía en la escena?'],
  caida:['¿Desde qué altura? ¿Sobre qué cayó?','¿Perdió el conocimiento?','¿Se cayó por un mareo o desmayo antes?','¿Toma anticoagulantes?']
};

// Lo que el reloj no perdona, por cuadro.
const TIEMPO={
  sca:'Infarto: ECG en los primeros 10 min si hay equipo y está autorizado; traslado a hospital con hemodinamia. Cada minuto cuenta.',
  pcr:'Paro: RCP de calidad y DEA cuanto antes. Cada minuto sin RCP baja la sobrevida ~10%.',
  avc:'Derrame: la HORA de última vez visto bien define el tratamiento (ventana de horas). Avisar al hospital antes de llegar.',
  conv:'Convulsión de más de 5 min o que se repite sin despertar = estado epiléptico: urgente.',
  hipog:'Azúcar baja: glicemia apenas llegue; corregirla revierte el cuadro en minutos.',
  disnea:'Si no puede hablar frases completas o tiene SpO2 <90%: traslado sin demora.',
  trauma:'Trauma grave: controlar hemorragia primero; idealmente ≤10 min en escena.',
  anafilaxia:'Anafilaxia: adrenalina IM sin esperar, según protocolo (o asistir con su autoinyector); puede empeorar en minutos.',
  colision:'Trauma grave: idealmente ≤10 min en escena. Cinemática alta = trasladar aunque "se vea bien".',
  incendio:'Humo: quemaduras en cara, hollín o voz ronca = vía aérea en riesgo; puede cerrarse rápido.',
  gineco:'Si ya se ve la cabeza del bebé: preparar parto en el lugar.',
  expl:'Explosión: lesiones internas sin signos por fuera; reevaluar seguido.',
  caida:'Adulto mayor que toma anticoagulantes y se golpeó la cabeza: traslado aunque esté bien.',
  ovace:'Obstrucción completa: 5 golpes en la espalda + 5 compresiones abdominales, alternando (en lactantes: 5 golpes en la espalda + 5 compresiones en el pecho). Si pierde la conciencia → RCP.',
  mordedura:'Serpiente: trasladar sin demora a un centro con suero antiofídico; anotar la hora de la mordedura.',
  taponamiento:'Taponamiento / herida en el pecho: traslado inmediato; se resuelve en el hospital.',
  neumotorax:'Neumotórax a tensión: empeora en minutos; traslado inmediato y avisar al hospital.',
  meningitis:'Sospecha de meningitis con manchas: traslado inmediato.',
  aneurisma:'Aneurisma roto: traslado inmediato, avisar al hospital.',
  hemorragia_int:'Shock: no demorar en escena; O2 según protocolo, abrigar y trasladar.',
  calor:'Golpe de calor: enfriar desde ya, en la escena y durante el traslado.',
  intox:'Intoxicación: llevar el envase; consultar al Centro de Intoxicaciones 2223-1028.',
  drogas:'Opioides: si respira poco, ventilar con bolsa-válvula-mascarilla.',
  preeclampsia:'Eclampsia: puede convulsionar; ambiente tranquilo, lado izquierdo, traslado.'
};

// Peligros de escena — antes de bajar de la unidad.
const PELIGROS=[
  [/\b(arma|disparo|balazo|baleado|cuchillo|punal|apunalad|rina|pleito|agresion|agredid|asalto|violento|agresivo)/,'🚓 Posible violencia: esperar que la Policía asegure la escena antes de entrar.'],
  [/\b(colision|choque|chocaron|transito|atropell|vuelco|volcado|ruta|autopista|carretera)/,'🚧 Tránsito: unidad como barrera, luces, conos y chaleco reflectivo. Ojo con combustible derramado y bolsas de aire sin activar.'],
  [/\b(incendio|fuego|humo|gas|monoxido|quimic|fuga)/,'🔥 Fuego/gas/químicos: no entrar sin Bomberos; acercarse con el viento a la espalda y cuesta arriba.'],
  [/\b(electric|cable|electrocut|alta tension)/,'⚡ Electricidad: confirmar que la corriente esté cortada antes de tocar.'],
  [/\b(rio|mar|playa|piscina|ahogad|inundacion|corriente)/,'🌊 Agua: no entrar sin equipo ni entrenamiento de rescate acuático.'],
  [/\b(perro|abeja|avispa|enjambre)/,'🐝 Animales: confirmar que la zona esté segura.'],
  [/\b(explosion|exploto|bomba|pirotecnia)/,'💥 Explosión: riesgo de segunda explosión; esperar autorización de Bomberos/Policía.'],
  [/\b(derrumbe|deslizamiento|estructura|colapso|zanja)/,'🏚️ Estructura inestable: no entrar sin autorización de Bomberos.']
];

function contiene(nt,frase){return new RegExp('(^| )'+normalize(frase)+'( |$)').test(nt);}

// Edad, embarazo y cantidad de víctimas, si el despacho los dice.
export function contextoPaciente(texto){
  const nt=' '+normalize(texto)+' ';
  const ctx={};
  const m=nt.match(/ (\d{1,3}) (anos|ano)\b/);
  if(m)ctx.edad=+m[1];
  else{const mm=nt.match(/ (\d{1,2}) (meses|mes)\b/);if(mm)ctx.edad=+mm[1]/12;}
  if(ctx.edad==null&&/ (bebe|recien nacido|lactante|infante)\b/.test(nt))ctx.edad=0.5;
  if(ctx.edad==null&&/ (nino|nina|menor de edad|menor|chiquito|chiquita|escolar)\b/.test(nt))ctx.nino=true;
  if(ctx.edad==null&&/ (adulto mayor|senor mayor|senora mayor|anciano|anciana)\b/.test(nt))ctx.mayor=true;
  if(ctx.edad!=null){if(ctx.edad<8)ctx.nino=true;if(ctx.edad>=65)ctx.mayor=true;}
  if(/ (embarazada|embarazo|gestante|semanas de gestacion)\b/.test(nt))ctx.embarazo=true;
  const v=nt.match(/ (\d{1,3}) (heridos|lesionados|victimas|pacientes|personas|ocupantes)\b/);
  if(v&&+v[1]>1)ctx.victimas=+v[1];
  if(/ (multiples|varios|varias|masivo|incidente con multiples|imv) /.test(nt))ctx.victimas=Math.max(ctx.victimas||0,3);
  return ctx;
}

const NOMBRE_ZONA={cabeza:'Cabeza',ojos:'Ojos',oidos:'Oídos',cara:'Cara',boca:'Boca',cuello:'Cuello',torax:'Tórax',abdomen:'Abdomen',
  pelvis:'Pelvis',brazos:'Brazos',brazoIzq:'Brazo izq.',munecas:'Pulso',manos:'Manos',piernas:'Piernas',talones:'Pies',piel:'Piel',general:'General'};

// La guía completa, en el orden en que se usa al llegar. Se arma sobre las 3
// impresiones diagnósticas (lo más probable primero) y avisa de las tríadas.
export function guiaArribo(texto,{ENF,SIGNOS={},EPP_POR_TIPO={},sv}={}){
  const nt=' '+normalize(texto)+' ';
  const ctx=contextoPaciente(texto);
  const impresiones=tresImpresiones(texto,{sv,ctx});
  const triadas=triadasPresentes(texto,{sv});
  const enfDe=id=>ENF.find(e=>e.id===id);
  const fichas=[...new Set(impresiones.filter(d=>d.conf!=='descartar').map(d=>d.enf).filter(Boolean))].map(enfDe).filter(Boolean);
  const principal=impresiones[0];
  const esTrauma=principal?.g==='Trauma'||/\b(e36|e40|e42|e62|colision|choque|atropell|caida|cayo)/.test(nt);
  const secciones=[];

  // Tríadas: lo primero que hay que ver si aparecen.
  if(triadas.length)secciones.push({id:'triadas',t:'⚠️ Tríadas detectadas',alerta:true,
    items:triadas.map(t=>`<b>${t.n}</b> (${t.si.length}/3) → sospechá ${t.que}. Presente: ${t.si.join(', ')}.${t.no.length?` <b>Buscá:</b> ${t.no.join(', ')}.`:''}${t.extra?' '+t.extra:''}`)});

  // 1. Escena
  const escena=PELIGROS.filter(([re])=>re.test(nt)).map(([,t])=>t);
  const respiratorio=impresiones.some(d=>['neumonia','meningitis','epoc'].includes(d.id));
  escena.push('🧤 EPP antes de tocar: guantes y lentes'+(respiratorio?'; mascarilla N95 (posible infección)':'')+'.');
  escena.push('👥 Contá pacientes al llegar; si son más que las unidades, pedí apoyo de inmediato.');
  secciones.push({id:'escena',t:'1. Antes de bajar — escena segura',items:escena});

  // 2. Primer vistazo
  const vistazo=esTrauma
    ?['🩸 ¿Sangrado que no para? Controlalo PRIMERO (presión directa / torniquete).','🦴 Vía aérea con restricción de columna si la cinemática lo amerita.','🫁 Respiración: ¿respira? ¿frecuencia? ¿el pecho sube parejo?','❤️ Circulación: pulso radial, piel, llenado capilar.','🧠 Conciencia (AVDN) y pupilas; exponer y abrigar.']
    :['🗣️ ¿Responde? Hablale y tocale los hombros.','🫁 ¿Respira normal? (mirá el pecho; boqueadas no cuentan). Si no respira → RCP + DEA.','❤️ Pulso radial y piel (color, temperatura, sudor).','🧠 Conciencia (AVDN) y glicemia si está alterado.'];
  secciones.push({id:'vistazo',t:'2. Primeros 30 segundos',items:vistazo});

  // 3. Qué revisar para confirmar la impresión principal
  if(principal){
    const f=principal.enf&&principal.conf!=='descartar'?enfDe(principal.enf):null;
    const sig=f?(SIGNOS[f.id]||[]).slice(0,5).map(([z,t])=>`<b>${NOMBRE_ZONA[z]||z}:</b> ${t}`):[];
    secciones.push({id:'revisa',enf:f?.id,t:`3. Revisá — ${principal.n}`,items:[...principal.confirmar.map(c=>'🎯 '+c),...sig]});
  }

  // 4. Preguntas clave
  const preg=[...new Set(impresiones.filter(d=>d.conf!=='descartar').slice(0,2).flatMap(d=>PREGUNTAS[d.id]||PREGUNTAS[d.enf]||[]))];
  preg.push('SAMPLE: alergias, medicamentos, enfermedades, última comida, qué pasó.');
  secciones.push({id:'preguntas',t:'4. Preguntá',items:preg});

  // 5. Contexto especial
  const esp=[];
  if(ctx.victimas)esp.push(`🏷️ ${ctx.victimas>=3?'Varias':ctx.victimas} víctimas: hacé triage antes de tratar — START en adultos, JumpSTART en niños (pestaña Triage).`);
  if(ctx.nino){const pe=ctx.edad!=null&&ctx.edad>=1&&ctx.edad<=10?` Peso estimado ≈ ${Math.round((ctx.edad+4)*2)} kg ((edad + 4) × 2).`:'';esp.push('👶 Niño: valores normales distintos (FR y pulso más altos); usá equipo pediátrico.'+pe);}
  if(ctx.mayor)esp.push('👴 Adulto mayor: el dolor y la fiebre pueden no aparecer; preguntá por anticoagulantes y caídas previas.');
  if(ctx.embarazo)esp.push('🤰 Embarazada: si es más de 20 semanas, traslado inclinada a la izquierda; son 2 pacientes.');
  if(esp.length)secciones.push({id:'especial',t:'5. Ojo con esto',items:esp});

  // 6. Tiempo y alertas
  const t=[];
  for(const d of impresiones.filter(d=>d.conf!=='descartar').slice(0,2)){
    const x=TIEMPO[d.id]||TIEMPO[d.enf];if(x)t.push('⏱️ '+x);
    const f=d.enf&&enfDe(d.enf);if(f?.al)t.push(f.al);
  }
  if(t.length)secciones.push({id:'tiempo',t:'Tiempo crítico y alertas',items:[...new Set(t)]});

  // 7. Qué llevar desde la unidad
  const llevar=new Set();
  for(const f of fichas)for(const tag of f.tags)for(const [k,v] of Object.entries(EPP_POR_TIPO))if(normalize(tag).includes(normalize(k))||normalize(k).includes(normalize(tag)))v.forEach(x=>llevar.add(x));
  if(esTrauma)['Torniquete y apósitos','Collar cervical / tabla o camilla de cuchara'].forEach(x=>llevar.add(x));
  if(impresiones.some(d=>d.id==='pcr'))['DEA','Bolsa-válvula-mascarilla','Aspirador'].forEach(x=>llevar.add(x));
  if(ctx.nino)llevar.add('Equipo pediátrico');
  ['Oxímetro y tensiómetro','Glucómetro'].forEach(x=>llevar.add(x));
  secciones.push({id:'llevar',t:'Llevá desde la unidad',items:[...llevar]});

  return {impresiones,triadas,contexto:ctx,secciones,vacio:!impresiones.length};
}
