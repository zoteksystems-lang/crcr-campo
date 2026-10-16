// Herramientas de campo que ahorran tiempo (sin red):
//  · marcas de hora según el cuadro (última vez visto bien, inicio del dolor, torniquete, RCP…)
//  · NEWS2 con los signos vitales de la boleta
//  · criterios ROJOS de trauma grave (Field Triage ACS/CDC 2021)
//  · prealerta IMIST-AMBO para radio / hospital
// Apoyo a la valoración: no reemplaza el protocolo de la institución.

// Marcas de hora que conviene registrar según la impresión.
export const MARCAS={
  acv:[['ultimoBien','🕕 Última vez visto bien'],['inicioSintomas','🧠 Inicio de síntomas']],
  iam:[['inicioDolor','❤️ Inicio del dolor'],['aspirina','💊 Aspirina (según protocolo)']],
  angina:[['inicioDolor','❤️ Inicio del dolor']],
  pcr:[['colapso','⏬ Colapso'],['inicioRCP','🫀 Inicio RCP'],['descargaDEA','⚡ Descarga DEA'],['rce','💓 Recuperó pulso']],
  hemorragia_ext:[['torniquete','🩸 Torniquete puesto']],
  politrauma:[['torniquete','🩸 Torniquete puesto'],['extricacion','🚗 Paciente liberado']],
  mordedura:[['mordedura','🐍 Hora de la mordedura'],['edema','📏 Borde del edema marcado']],
  anafilaxia:[['exposicion','🐝 Hora de exposición'],['adrenalina','💉 Adrenalina (según protocolo)']],
  convulsion:[['inicioConvulsion','⚡ Inicio de la convulsión'],['finConvulsion','✅ Terminó la convulsión']],
  hipoglucemia:[['glucosaDada','🍬 Glucosa dada']],
  intox:[['ingesta','🧪 Hora de la ingesta']],
  parto:[['nacimiento','👶 Nacimiento'],['placenta','Placenta']],
  quemadura:[['enfriamiento','💧 Inicio enfriamiento']],
};
export const MARCAS_SIEMPRE=[['arribo','📍 Arribo a la escena'],['contacto','🤝 Contacto con paciente'],['salida','🚑 Salida al hospital']];

// NEWS2 (Royal College of Physicians, 2017). sv: {fr,spo2,pa1,fc,temp,gcs}, o2: con oxígeno.
export function news2(sv={},o2=false){
  const n=k=>{const v=parseFloat(String(sv[k]??'').replace(',','.'));return isNaN(v)?null:v;};
  const fr=n('fr'),sp=n('spo2'),pas=n('pa1'),fc=n('fc'),t=n('temp'),gcs=n('gcs');
  const partes=[];let total=0,falta=[],rojo=false;
  const sumar=(nom,p)=>{total+=p;if(p===3)rojo=true;if(p)partes.push(`${nom} +${p}`);};
  if(fr==null)falta.push('FR');else sumar('FR',fr<=8?3:fr<=11?1:fr<=20?0:fr<=24?2:3);
  if(sp==null)falta.push('SpO₂');else sumar('SpO₂',sp<=91?3:sp<=93?2:sp<=95?1:0);
  if(o2)sumar('Con O₂',2);
  if(pas==null)falta.push('PA');else sumar('PA',pas<=90?3:pas<=100?2:pas<=110?1:pas<=219?0:3);
  if(fc==null)falta.push('FC');else sumar('FC',fc<=40?3:fc<=50?1:fc<=90?0:fc<=110?1:fc<=130?2:3);
  if(gcs!=null&&gcs<15)sumar('Conciencia alterada',3);
  if(t==null)falta.push('T°');else sumar('T°',t<=35?3:t<=36?1:t<=38?0:t<=39?1:2);
  if(gcs==null)falta.push('Glasgow');
  const riesgo=total>=7?'alto':total>=5?'medio':rojo?'bajo-medio':'bajo';
  const accion=riesgo==='alto'?'Riesgo ALTO de deterioro: traslado inmediato, reevaluar cada 5 min, prealerta al hospital.'
    :riesgo==='medio'?'Riesgo MEDIO: reevaluar cada 5-15 min; considerar prealerta.':riesgo==='bajo-medio'?'Un parámetro en 3: riesgo bajo-medio, reevaluar pronto ese parámetro.':'Riesgo bajo: reevaluar cada 15 min o si cambia.';
  return {total,riesgo,partes,falta,accion,completo:falta.length===0};
}

// Criterios ROJOS de trauma grave (ACS/CDC National Guideline for Field Triage 2021):
// cualquiera → centro de trauma de mayor nivel.
export function traumaRojo(sv={},edad=null){
  const n=k=>{const v=parseFloat(String(sv[k]??'').replace(',','.'));return isNaN(v)?null:v;};
  const fr=n('fr'),sp=n('spo2'),pas=n('pa1'),fc=n('fc'),gcs=n('gcs'),motor=n('pM');
  const r=[];
  if(motor!=null&&motor<6)r.push(`Glasgow motor ${motor} (<6)`);
  else if(gcs!=null&&gcs<=13)r.push(`Glasgow ${gcs} (criterio 2011)`);
  if(fr!=null&&(fr<10||fr>29))r.push(`FR ${fr}`);
  if(sp!=null&&sp<90)r.push(`SpO₂ ${sp}%`);
  if(pas!=null){
    if(edad!=null&&edad<10&&pas<70+2*edad)r.push(`PA ${pas} (niño: <${70+2*edad})`);
    else if(edad!=null&&edad>=65&&pas<110)r.push(`PA ${pas} (≥65 años: <110)`);
    else if(pas<90)r.push(`PA ${pas}`);
    if((edad==null||edad>=10)&&fc!=null&&fc>pas)r.push('FC mayor que la PA sistólica');
  }
  return r;
}
export const TRAUMA_ROJO_LESIONES=['Lesión penetrante en cabeza, cuello, tórax o abdomen (o extremidad arriba de codo/rodilla)',
  'Deformidad o sospecha de fractura de cráneo','Tórax inestable o deformado','Sospecha de fractura de pelvis','2 o más fracturas de huesos largos proximales (húmero/fémur)',
  'Extremidad aplastada, desguantada, mutilada o sin pulso','Amputación arriba de muñeca o tobillo','Sangrado activo que necesita torniquete o empaquetamiento con presión continua','Sospecha de lesión medular con pérdida motora o sensitiva nueva'];

// Prealerta / entrega IMIST-AMBO: Identificación, Mecanismo, Injurias/queja,
// Signos, Tratamiento — Alergias, Medicamentos, antecedentes (Background), Otros.
export function prealerta({boleta={},impresiones=[],marcas=[],ctx={}}){
  const sv=boleta.sv1||{};const sam=boleta.sam||{};
  const edad=boleta.edad||(ctx.edad!=null?Math.round(ctx.edad):'');
  const sexo=boleta.gen==='F'?'femenina':boleta.gen==='M'?'masculino':'';
  const signos=[sv.fc&&`FC ${sv.fc}`,sv.fr&&`FR ${sv.fr}`,sv.pa1&&`PA ${sv.pa1}/${sv.pa2||'?'}`,sv.spo2&&`SpO₂ ${sv.spo2}%`,sv.gcs&&`Glasgow ${sv.gcs}`,sv.glu&&`glicemia ${sv.glu}`,sv.temp&&`T ${sv.temp}`].filter(Boolean).join(', ');
  const horas=marcas.map(m=>`${m.nombre.replace(/^\S+\s/,'')} ${m.hora}`).join('; ');
  const dx=impresiones.filter(d=>d.conf!=='descartar').slice(0,2).map(d=>d.n).join(' / ')||[boleta.dx1,boleta.dx2].filter(Boolean).join(' / ');
  return [
    `I — Paciente ${sexo} ${edad?edad+' años':''}`.trim(),
    `M — ${sam.E||'(mecanismo / qué pasó)'}`,
    `I — Impresión: ${dx||'(por definir)'}${sam.S?'. Refiere: '+sam.S:''}`,
    `S — ${signos||'(signos vitales)'}`,
    `T — ${boleta.int||'(tratamiento realizado)'}${horas?'. Horas: '+horas:''}`,
    `A — Alergias: ${sam.A||'no refiere'}`,
    `M — Medicamentos: ${sam.M||'no refiere'}`,
    `B — Antecedentes: ${sam.P||'no refiere'}`,
    `O — Hora estimada de llegada: ${boleta.hlh||'(ETA)'}`
  ].join('\n');
}

// Destino sugerido en Costa Rica (lineamiento CCSS Código Infarto 2022; ACV).
export const DESTINO={
  iam:'Código Infarto (CCSS): si se llega a hemodinamia en <120 min desde el primer contacto/diagnóstico (ECG), priorizar hospital con hemodinamia (San Juan de Dios, México, Calderón Guardia, San Vicente de Paúl en Heredia, San Rafael de Alajuela); si no, destino según protocolo y la central. Confirmar destino con la central.',
  acv:'Posible ACV: avisar a la central para destino con trombólisis/trombectomía (p. ej. Calderón Guardia). Llevar la hora de última vez visto bien.',
  mordedura:'Ofidismo: trasladar a centro con suero antiofídico (consultar con la central / Centro de Intoxicaciones).',
  intox:'Centro Nacional de Control de Intoxicaciones: 2223-1028 / 800-INTOXICA (24 h).',
  politrauma:'Trauma grave con criterio ROJO: centro de trauma de mayor nivel (confirmar con la central).'
};
