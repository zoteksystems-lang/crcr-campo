// ═══════════════════════════════════════════════════
// DATOS ESTÁTICOS — contenido clínico offline (idéntico al original)
// Ninguna tabla de este archivo se descarga de red; vive en el propio app.
// ═══════════════════════════════════════════════════
export const CODS={
"1":"¿Cómo escucha?","2":"Positivo","3":"Negativo","4":"Preparado / Listo","5":"¿Quién transmite?",
"6":"Espere, llamada","7":"Regrese a la base","8":"Ubicación","9":"Repita","10":"Comprendido",
"11":"Fin de transmisión","12":"Habitación","13":"Dinero / Cobro","14":"Permiso para...",
"15":"Llamada telefónica","16":"Reporte novedad","17":"Condición de paciente","18":"Hora",
"19":"Diríjase a...","38":"Fallecido","49":"Alimentación","50":"Urgencia médica","51":"Aeropuerto",
"52":"Llamada general","53":"En servicio","54":"Fuera de servicio","55":"Cambio de canal",
"56":"Alerta","57":"Policía Tránsito","58":"Policía Fuerza Pública","59":"OIJ","60":"Bomberos",
"65":"Luz roja y sirena","66":"Prioridad","67":"Misión cumplida","68":"Equipo rescate",
"69":"Unidad / Vehículo","71":"Falsa alarma","72":"Queja","73":"Oficial al mando","77":"Servicio especial",
"E20":"Problema respiratorio","E21":"Problema cardíaco","E22":"Paro cardiorrespiratorio",
"E23":"Alteración de la presión","E24":"A.V.C.","E25":"Persona diabética",
"E26":"Comportamiento anormal","E27":"Intoxicación / Anafilaxia","E28":"Emergencia gineco-obstétrica",
"E29":"Crisis convulsiva","E30":"Contacto médico","E31":"Accidente acuático",
"E32":"Lesión por causa animal","E33":"Paciente quemado","E34":"Lesiones por electricidad",
"E35":"Atropello","E36":"Colisión","E37":"Vuelco","E39":"Persona atrapada / prensada",
"E40":"Urgencia traumática","E41":"Persona inconsciente","E42":"Caída / Precipitación",
"E43":"Herido por arma blanca","E44":"Hospital / Clínica","E45":"Solicitud de apoyo",
"E46":"Etílico","E47":"Dejar frecuencia libre","E48":"Alerta aérea","E61":"Incendio",
"E62":"Explosión","E63":"Desastre natural","E64":"Extravío","E70":"Concentración de personal",
"E74":"Alerta tecnológica","E75":"Secuestro","E76":"Información confidencial"
};
export const TNIV={
ROJO:{c:"#DC2626",bg:"#450A0A",l:"Inmediato",d:"Riesgo vital — atención inmediata"},
AMARILLO:{c:"#D97706",bg:"#451A03",l:"Urgente",d:"Estable pero puede deteriorarse"},
VERDE:{c:"#16A34A",bg:"#052E16",l:"Menor",d:"Lesión leve — puede esperar"},
NEGRO:{c:"#4B5563",bg:"#111827",l:"Sin expectativa",d:"Fallecido / lesión incompatible"}
};
// START (adultos y niños que aparentan 8 años o más). Cada paso: pregunta, cómo
// medirlo (h) y a dónde va con SÍ / NO (número = siguiente paso, color = resultado).
// Fuente: START (Hoag Hospital / Newport Beach), RPM: Respiración 30 – Pulso 2 – Mente.
export const TSTEPS=[
{q:"¿Camina por sus propios medios?",h:"Pedí en voz alta: «los que puedan caminar, vengan hacia acá».",si:"VERDE",no:1},
{q:"¿Respira?",h:"Mirá el pecho, escuchá y sentí, máximo 10 segundos.",si:3,no:2},
{q:"Abrí la vía aérea (inclinación de cabeza o tracción mandibular si hay trauma). ¿Respira ahora?",h:"Solo reposicionar; no ventilar ni hacer RCP en triage.",si:"ROJO",no:"NEGRO"},
{q:"¿Respira 30 o menos por minuto?",h:"Contá 15 segundos y multiplicá × 4. Más de 30 → ROJO.",si:4,no:"ROJO"},
{q:"¿Tiene pulso radial y llenado capilar de 2 segundos o menos?",h:"Si no hay pulso radial o el llenado tarda más de 2 s → ROJO. Controlá hemorragias graves de una vez.",si:5,no:"ROJO"},
{q:"¿Obedece órdenes simples?",h:"«Apretame la mano», «abrí los ojos». Si no obedece → ROJO.",si:"AMARILLO",no:"ROJO"}
];
// JumpSTART (niños de 1 a 8 años; si aparenta adulto, usar START).
export const TSTEPS_NINO=[
{q:"¿Camina por sus propios medios?",h:"Los bebés que aún no caminan no se clasifican aquí: seguí con la evaluación.",si:"VERDE",no:1},
{q:"¿Respira?",h:"Mirá el pecho, escuchá y sentí, máximo 10 segundos.",si:4,no:2},
{q:"Abrí la vía aérea. ¿Respira ahora?",h:"Inclinación de cabeza o tracción mandibular.",si:"ROJO",no:3},
{q:"¿Tiene pulso periférico (radial o braquial)?",h:"Si NO tiene pulso → NEGRO. Si tiene pulso: dale 5 ventilaciones de rescate y respondé abajo.",si:6,no:"NEGRO"},
{q:"¿Respira entre 15 y 45 por minuto?",h:"Contá 15 segundos × 4. Menos de 15 o más de 45 → ROJO.",si:5,no:"ROJO"},
{q:"¿Tiene pulso periférico palpable?",h:"Radial (o braquial en lactantes). Sin pulso → ROJO.",si:7,no:"ROJO"},
{q:"Después de las 5 ventilaciones: ¿respira solo?",h:"Si respira → ROJO. Si sigue sin respirar → NEGRO.",si:"ROJO",no:"NEGRO"},
{q:"AVDN: ¿está Alerta, responde a la Voz o localiza el Dolor?",h:"Si NO responde o responde mal al dolor (sin localizar, postura anormal) → ROJO. Lactante que aún no camina, con todo normal y sin lesiones importantes → puede ir a VERDE.",si:"AMARILLO",no:"ROJO"}
];
// Acciones inmediatas por nivel de triage — antes generadas por IA, ahora fijas y offline.
export const TACC={
ROJO:["1. Reevaluar ABC de inmediato","2. Controlar hemorragias masivas primero","3. Vía aérea + O2 si disponible","4. Preparar traslado prioritario","5. Reevaluar cada pocos minutos"],
AMARILLO:["1. Reevaluar cada 5-10 min","2. Inmovilizar lesiones evidentes","3. Vigilar signos de deterioro","4. Mantener abrigado","5. No dejar solo si hay alteración de conciencia"],
VERDE:["1. Reubicar en área de espera","2. Dar instrucciones simples","3. Reevaluar si aparecen nuevos síntomas","4. Puede ayudar con otros pacientes leves","5. Documentar y continuar recorrido"],
NEGRO:["1. No reanimar — confirmar criterios","2. Cubrir con respeto","3. Marcar y registrar hora","4. Notificar a oficial a cargo","5. No usar más recursos en este paciente"]
};
export const SCAMPOS=[
{k:"S",l:"S — Síntomas / Signos",h:"¿Qué siente? ¿Dónde le duele?"},
{k:"A",l:"A — Alergias",h:"¿Alergias a medicamentos?"},
{k:"M",l:"M — Medicamentos",h:"¿Toma medicamentos actualmente?"},
{k:"P",l:"P — Patologías previas",h:"¿Enfermedades crónicas, cirugías?"},
{k:"L",l:"L — Líquidos / Alimentos",h:"¿Cuándo comió por última vez?"},
{k:"E",l:"E — Evento",h:"¿Qué pasó? ¿Cómo ocurrió?"}
];
export const OCAMPOS=[
{k:"O",l:"O — Onset",h:"¿Cuándo empezó?"},
{k:"P",l:"P — Provoca/Palía",h:"¿Qué lo empeora o mejora?"},
{k:"Q",l:"Q — Calidad",h:"¿Cómo lo describe?"},
{k:"R",l:"R — Región",h:"¿Dónde? ¿Se irradia?"},
{k:"S",l:"S — Severidad",h:"Del 1 al 10 ¿cuánto duele?"},
{k:"T",l:"T — Tiempo",h:"¿Cuánto lleva así?"}
];
export const ENF=[
{id:"sca",i:"❤️",t:"Síndrome Coronario Agudo",e:"E21",tags:["cardíaco","infarto","dolor pecho"],
r:[{s:"Dolor opresivo en pecho",d:"Como 'elefante sentado'. Irradia a brazo izquierdo, mandíbula, espalda."},
{s:"Cortejo vegetativo",d:"Sudoración fría, náuseas, palidez. El paciente 'se ve mal'."},
{s:"⚠️ Atípico",d:"Mujeres/diabéticos/mayores: solo fatiga o disnea sin dolor torácico."}],
a:["1. Semisentado — NO acostar","2. O2 si SpO2 <94%","3. Aspirina 300mg VO masticada","4. Nitroglicerina 0.4mg SL si PA >100","5. IV + monitoreo","6. Código 1 — hospital con hemodinamia"],
al:"⚠️ PCR inminente si PA <90, bradicardia, alteración de conciencia."},
{id:"pcr",i:"💔",t:"Paro Cardiorrespiratorio",e:"E22",tags:["paro","RCP","PCR"],
r:[{s:"Sin respuesta + sin respiración normal",d:"Jadeos ≠ respiración normal → iniciar RCP."},
{s:"Sin pulso central",d:"Máximo 10 seg de verificación."}],
a:["1. Activar 10-33 — pedir DEA","2. RCP 30:2 — 5-6cm, 100-120/min","3. DEA: encender, colocar, seguir indicaciones","4. Adrenalina 1mg IV/IO c/3-5min","5. Rotar compresor c/2min"],
al:"⚠️ 4H/4T: Hipoxia, Hipovolemia, Hipo/hiperkalemia, Hipotermia / Neumotórax, Taponamiento, Tóxicos, TEP."},
{id:"avc",i:"🧠",t:"AVC — Derrame Cerebral",e:"E24",tags:["AVC","stroke","derrame","neurológico"],
r:[{s:"FAST",d:"Face (asimetría), Arms (debilidad), Speech (habla), Time (tiempo inicio)."},
{s:"⚠️ ANOTAR HORA EXACTA",d:"Trombolisis posible hasta 4.5h. La hora en que lo vieron bien por última vez es CRÍTICA (si amaneció así, es la hora en que se acostó)."}],
a:["1. ANOTAR HORA EXACTA en que lo vieron bien por última vez","2. O2 si SpO2 <94%","3. Glucosa — descartar hipoglucemia","4. NO dar nada por boca","5. Cabecera 0-15°","6. Código 1 — avisar hospital"],
al:"⚠️ 1.9 millones de neuronas mueren por minuto. No perder tiempo en escena."},
{id:"conv",i:"⚡",t:"Crisis Convulsiva",e:"E29",tags:["convulsión","epilepsia","neurológico"],
r:[{s:"Crisis tónico-clónica",d:"Pérdida de conciencia, rigidez luego sacudidas, cianosis. Dura 1-3 min."},
{s:"⚠️ Estatus epiléptico",d:"Crisis >5 min O dos seguidas. EMERGENCIA."}],
a:["1. Proteger de golpes — NO meter nada en la boca","2. Posición lateral tras la fase","3. O2 + glucosa","4. >5 min: Diazepam 5-10mg IV / Midazolam 5mg IM","5. Traslado — primera vez siempre al hospital"],
al:"⚠️ NUNCA meter dedos ni objetos en la boca."},
{id:"hipog",i:"🍬",t:"Hipoglucemia",e:"E25",tags:["hipoglucemia","diabético","glucosa","metabólico"],
r:[{s:"Glucosa <70 mg/dL",d:"Temblor, sudoración, taquicardia, ansiedad, palidez."},
{s:"Glucosa <50 mg/dL",d:"Confusión, agresividad, convulsiones, pérdida de conciencia."},
{s:"⚠️ MEDIR SIEMPRE",d:"Cualquier alteración de conciencia: medir glucosa antes de otro diagnóstico."}],
a:["1. Medir glucosa inmediatamente","2. Consciente + deglute: azúcar, jugo, gaseosa","3. Inconsciente: Dextrosa IV — 50ml D50% o 200ml D10%","4. Remedir a los 15 min","5. Traslado si no sube"],
al:"⚠️ NUNCA dar nada por boca a paciente inconsciente."},
{id:"hipona",i:"🧂",t:"Hiponatremia — Falta de Sodio",e:"E23",tags:["sodio","electrolitos","confusión","metabólico"],
r:[{s:"Na+ <135 mEq/L",d:"Frecuente en mayores con diuréticos, diarrea, calor. Síntomas cognitivos si descenso lento."},
{s:"Síntomas graves (Na <120)",d:"Confusión marcada, convulsiones, pérdida de conciencia."},
{s:"⚠️ Sospechá si",d:"Adulto mayor confuso + toma diuréticos O vómitos/diarrea prolongados OR calor + debilidad."}],
a:["1. Evaluar conciencia y signos neurológicos","2. O2, IV, monitoreo","3. SF 0.9% a ritmo moderado — NO corrección rápida","4. NO dar agua libre IV","5. Traslado para corrección controlada"],
al:"⚠️ Corregir sodio muy rápido causa mielinolisis pontina — daño neurológico irreversible."},
{id:"disnea",i:"🫁",t:"Dificultad Respiratoria",e:"E20",tags:["disnea","respiratorio","falta de aire"],
r:[{s:"Signos de alarma",d:"FR >30, SpO2 <90%, cianosis, no puede hablar, agitación."},
{s:"Posición",d:"Paciente en trípode o semisentado = grave. NUNCA acostar."}],
a:["1. Sentado — NUNCA acostar","2. O2 alto flujo 15L si SpO2 <90%","3. Auscultar: sibilancias/crepitantes/ausencia MV","4. IV, monitoreo","5. Traslado urgente si SpO2 <90%"],
al:"⚠️ SpO2 <85% o cianosis = riesgo vital inminente."},
{id:"trauma",i:"🩹",t:"Urgencia Traumática",e:"E40",tags:["trauma","lesión","golpe"],
r:[{s:"Evaluar mecanismo",d:"Alta energía: accidente >40km/h, caída >3m, atropello, explosión."},
{s:"MARCH",d:"Massive hemorrhage → Airway → Respiration → Circulation → Hypothermia."}],
a:["1. Escena segura — EPP","2. Hemorragia masiva → torniquete PRIMERO","3. Vía aérea con control cervical","4. Ventilación — buscar neumotórax","5. 2 vías IV — cristaloides con cautela","6. Prevenir hipotermia"],
al:"⚠️ Cargar y transportar. No perder tiempo en escena con paciente inestable."},
{id:"anafilaxia",i:"🐝",t:"Anafilaxia",e:"E27",tags:["anafilaxia","alergia","urticaria"],
r:[{s:"Tríada",d:"Piel (urticaria/angioedema), Respiratorio (broncoespasmo/estridor), Cardiovascular (hipotensión)."},
{s:"Tiempo",d:"Picadura: minutos. Oral: 30-60 min. Más rápido = más grave."}],
a:["1. Adrenalina 0.3-0.5mg IM muslo anterolateral — PRIMERO","2. Posición supina + piernas elevadas (si le cuesta respirar, sentado; NO ponerlo de pie de golpe)","3. O2 alto flujo","4. IV — SF 0.9% si hipotensión","5. Segunda dosis a los 5-15 min si no mejora","6. Traslado — riesgo bifásica"],
al:"⚠️ Antihistamínicos y corticoides son coadyuvantes — NO reemplazan la adrenalina."},
{id:"etilic",i:"🍺",t:"Paciente Etílico",e:"E46",tags:["etílico","alcohol","intoxicación"],
r:[{s:"⚠️ NUNCA asumir solo ebriedad",d:"Descartar: hipoglucemia, TCE, AVC, intoxicación mixta, sepsis."},
{s:"Grave",d:"GCS <13, vómitos, FR <12, hipotermia, hipoglucemia."}],
a:["1. MEDIR GLUCOSA SIEMPRE","2. Posición lateral de seguridad","3. Monitoreo SpO2, FR, temperatura","4. Descartar TCE oculto","5. Traslado si GCS <13 o trauma"],
al:"⚠️ La broncoaspiración mata. Posición lateral es crítica."},
{id:"colision",i:"🚗",t:"Colisión Vehicular",e:"E36",tags:["colisión","accidente","tránsito","trauma"],
r:[{s:"3 impactos",d:"1) Vehículo vs objeto 2) Ocupante vs habitáculo 3) Órganos internos vs estructuras."},
{s:"Frontal",d:"Cervical, tórax, rodillas. Lateral: pelvis, costillas, aorta."}],
a:["1. Seguridad — señalizar, cortar motor","2. Triage si múltiples víctimas","3. Control cervical desde primer contacto","4. MARCH completo","5. Extricación con mínimo 3 personas"],
al:"⚠️ Toda colisión de alta energía = posible lesión de columna."},
{id:"incendio",i:"🔥",t:"Incendio / Inhalación de humo",e:"E61",tags:["incendio","humo","CO"],
r:[{s:"Lesión inhalatoria",d:"Estridor, voz ronca, hollín en boca/nariz, vibrisas quemadas."},
{s:"⚠️ SpO2 en CO",d:"El oxímetro NO detecta CO. Puede marcar 99% con CO letal."}],
a:["1. Alejar de la fuente","2. O2 al 100% inmediato — reservorio 15L","3. Intubar temprano si lesión inhalatoria","4. Todo paciente de incendio cerrado → hospital"],
al:"⚠️ SpO2 normal NO descarta intoxicación por CO."},
{id:"gineco",i:"🤱",t:"Emergencia Gineco-Obstétrica",e:"E28",tags:["parto","embarazo","obstétrico"],
r:[{s:"Parto inminente",d:"Contracciones <2 min, corona visible → NO trasladar."},
{s:"Alarmas",d:"Sangrado, cefalea + visión borrosa + edema (preeclampsia)."}],
a:["1. Corona visible → prepararse para parto","2. Decúbito lateral IZQUIERDO >20 semanas","3. Prolapso de cordón → genupectoral + Código 1","4. Sangrado → IV + traslado urgente"],
al:"⚠️ Prolapso de cordón = emergencia absoluta."},
{id:"comp",i:"🧩",t:"Comportamiento Anormal",e:"E26",tags:["psiquiátrico","agitación","conducta"],
r:[{s:"Descartar orgánico PRIMERO",d:"Hipoglucemia, TCE, AVC, intoxicación, sepsis."}],
a:["1. Escena segura — tener salida","2. MEDIR GLUCOSA","3. Voz calmada, no argumentar el delirio","4. Coordinar con policía si hay riesgo","5. Traslado — documentar conducta"],
al:"⚠️ No sujetar sin apoyo policial."},
{id:"expl",i:"💥",t:"Explosión",e:"E62",tags:["explosión","blast","masivo","trauma"],
r:[{s:"Pulmón de blast",d:"Hemorragia interna sin herida visible. El paciente puede verse bien y estar grave."}],
a:["1. Escena segura — riesgo de segunda explosión","2. Triage masivo SALT","3. Control de hemorragias","4. O2. Si sospecha pulmón de blast: ventilar con presión positiva SOLO si es necesario (apnea o hipoventilación), con volúmenes bajos","5. Todo paciente cercano → hospital"],
al:"⚠️ Segunda explosión es táctica común. No concentrar todo el personal en un punto."},
{id:"caida",i:"🪜",t:"Caída / Precipitación",e:"E42",tags:["caída","fractura","adulto mayor","trauma"],
r:[{s:"Riesgo",d:">3 m de altura = trauma mayor. Adultos mayores: cualquier caída es significativa."},
{s:"Adulto mayor",d:"Fractura de cadera: dolor en ingle + rotación externa del pie + acortamiento."}],
a:["1. Descartar TCE","2. Control cervical si mecanismo significativo","3. MEDIR GLUCOSA — puede ser la causa","4. Inmovilizar fracturas","5. Adulto mayor: siempre traslado"],
al:"⚠️ En adulto mayor: la caída puede ser consecuencia (síncope, AVC, hipoglucemia), no la causa."}
];
export const PROT={
quemaduras:{t:"Quemaduras",i:"🔥",s:[
{t:"Clasificación",items:[
{t:"1er grado",d:"Solo epidermis. Roja, seca, dolorosa. Sin ampollas."},
{t:"2do grado superficial",d:"Ampollas intactas, base rosada. Traslado si >10% SCQ adulto."},
{t:"2do grado profundo",d:"Base pálida, menos sensible. Siempre especialista."},
{t:"3er grado",d:"INDOLORA. Acartonada/blanca/negra. SIEMPRE traslado urgente."}]},
{t:"Regla de los 9 — Adulto",items:[
{t:"Cabeza/cuello",d:"9%"},{t:"Tórax anterior",d:"9%"},{t:"Abdomen anterior",d:"9%"},
{t:"Espalda superior",d:"9%"},{t:"Espalda inferior",d:"9%"},{t:"Brazo derecho",d:"9%"},
{t:"Brazo izquierdo",d:"9%"},{t:"Muslo derecho",d:"9%"},{t:"Pierna derecha",d:"9%"},
{t:"Muslo izquierdo",d:"9%"},{t:"Pierna izquierda",d:"9%"},{t:"Genitales",d:"1%"},
{t:"Palma del paciente",d:"≈1% SCQ — útil para quemaduras irregulares"}]},
{t:"Fórmula de Parkland",items:[
{t:"Fórmula",d:"4 ml × Peso(kg) × % SCQ (2do y 3er grado)"},
{t:"Primeras 8h",d:"50% del total (desde el momento, no del traslado)"},
{t:"Siguientes 16h",d:"50% restante. Lactato de Ringer."},
{t:"Campo",d:"IV si traslado >45 min y SCQ >20%. Máx 1L antes de hospital."}]},
{t:"Manejo prehospitalario",items:[
{t:"1. Escena segura",d:"Confirmar que la fuente de calor está controlada."},
{t:"2. Detener",d:"Agua fresca 15-20°C × 10-20 min. NUNCA hielo."},
{t:"3. Vía aérea",d:"Quemadura facial/oral → intubar temprano si estridor o ronquera."},
{t:"4. Cubrir",d:"Apósito seco en extensas. NUNCA cremas ni ungüentos."},
{t:"5. Hipotermia",d:"Cubrir siempre. Crítico en niños y extensas."}]}
]},
phtls:{t:"PHTLS — Trauma",i:"🚑",s:[
{t:"MARCH — Protocolo trauma",items:[
{t:"M — Massive Hemorrhage",d:"PRIMERO: controlar hemorragia externa masiva. Torniquete."},
{t:"A — Airway",d:"Vía aérea con control cervical. Tracción mandibular en trauma."},
{t:"R — Respiration",d:"Neumotórax a tensión, hemotórax, tórax inestable, herida abierta."},
{t:"C — Circulation",d:"2 vías IV. Hipotensión permisiva TAS 80-90 si no hay TCE."},
{t:"H — Hypothermia",d:"Tríada: hipotermia + acidosis + coagulopatía. Cubrir siempre."}]},
{t:"Shock — Clasificación rápida",items:[
{t:"Clase I <15%",d:"FC <100, PA normal. Sin intervención específica."},
{t:"Clase II 15-30%",d:"FC 100-120, ansioso. 1-2L cristaloide."},
{t:"Clase III 30-40%",d:"FC >120, confuso. Reanimación agresiva, traslado inmediato."},
{t:"Clase IV >40%",d:"FC >140, inconsciente. CARGA Y VA."},
{t:"Hipotensión permisiva",d:"TAS objetivo 80-90 en trauma. Excepción: TCE → TAS >90 siempre."}]},
{t:"TCE — Trauma Craneoencefálico",items:[
{t:"Leve GCS 14-15",d:"Observar, traslado para evaluación."},
{t:"Moderado GCS 9-13",d:"Traslado prioritario, monitoreo continuo."},
{t:"Grave GCS ≤8",d:"Manejo avanzado vía aérea."},
{t:"⚠️ TAS en TCE",d:"NUNCA dejar caer. Mantener TAS >90 siempre."}]}
]},
pediatrico:{t:"Pediatría",i:"👶",s:[
{t:"Frecuencias vitales por edad",items:[
{t:"Recién nacido",d:"FC: 120-160 | FR: 40-60 | TAS: 60-90"},
{t:"Lactante 1-12m",d:"FC: 100-160 | FR: 30-60 | TAS: 70-100"},
{t:"Preescolar 1-5a",d:"FC: 80-130 | FR: 20-40 | TAS: 80-110"},
{t:"Escolar 6-12a",d:"FC: 70-120 | FR: 15-30 | TAS: 90-120"},
{t:"Adolescente",d:"FC: 60-100 | FR: 12-20 | TAS: 100-120"},
{t:"Peso rápido >1 año",d:"Peso(kg) = (Edad × 2) + 8"}]},
{t:"Broselow — Por color",items:[
{t:"Gris 3-5kg RN-3m",d:"Tubo ET: 3.0-3.5"},{t:"Rosa 6-7kg 3-6m",d:"Tubo ET: 3.5"},
{t:"Rojo 8-9kg 6-12m",d:"Tubo ET: 3.5-4.0"},{t:"Morado 10-11kg",d:"Tubo ET: 4.0"},
{t:"Amarillo 12-14kg",d:"Tubo ET: 4.5"},{t:"Blanco 15-18kg",d:"Tubo ET: 5.0"},
{t:"Azul 19-22kg",d:"Tubo ET: 5.0-5.5"},{t:"Naranja 24-28kg",d:"Tubo ET: 5.5-6.0"}]},
{t:"RCP Pediátrico",items:[
{t:"Lactante <1 año",d:"2 dedos. Profundidad 4cm. FC <60 con mala perfusión = compresiones."},
{t:"Niño 1-8 años",d:"1 o 2 manos. Profundidad 5cm. 30:2 con 1 reanimador, 15:2 con 2."},
{t:"⚠️ Secuencia en niños",d:"PRIMERO 2 min de RCP, LUEGO DEA. Opuesto al adulto."}]}
]},
obstetrico:{t:"Obstétrico",i:"🤱",s:[
{t:"Parto normal — Pasos",items:[
{t:"1. Preparar",d:"Guantes, telas limpias, hilo. Posición semisentada o dec. lateral izquierdo."},
{t:"2. Coronación",d:"Sostener suavemente. NO jalar. Limpiar boca y nariz."},
{t:"3. Hombros",d:"Tracción suave hacia abajo para el anterior, hacia arriba para el posterior."},
{t:"4. Recibir",d:"Secar inmediatamente. Estimular la espalda. Debe llorar en 30 seg."},
{t:"5. Cordón",d:"Ligar a 10 y 15cm del ombligo. Cortar entre ligaduras."},
{t:"6. Placenta",d:"Sale sola en 5-30 min. NO jalar del cordón."},
{t:"7. Hemorragia",d:"Normal <500ml. Si más: masajear fondo uterino, traslado urgente."}]},
{t:"Complicaciones",items:[
{t:"Prolapso de cordón",d:"EMERGENCIA. Posición genupectoral. NO empujar el cordón. Código 1."},
{t:"Distocia de hombros",d:"McRoberts: hiperflexión de muslos + presión suprapúbica."},
{t:"Eclampsia",d:"Convulsión en embarazada. Dec. lateral izquierdo, O2, traslado urgente."}]}
]},
farmacologia:{t:"Farmacología",i:"💊",s:[
{t:"Medicamentos CRCR",items:[
{t:"O2",d:"SpO2 <94%, disnea, shock, trauma, PCR. Reservorio 12-15L (90-100%)."},
{t:"Adrenalina",d:"PCR: 1mg IV/IO c/3-5min. Anafilaxia: 0.3-0.5mg IM muslo anterolateral."},
{t:"Naloxona",d:"Opioides: 0.4-2mg IV/IM/IN. Repetir c/2-3min. Vigilar re-sedación."},
{t:"Aspirina",d:"SCA: 300mg VO masticada. Contraindicado <12 años, úlcera activa."},
{t:"Nitroglicerina SL",d:"Dolor torácico isquémico: 0.4mg. Contraindicado PA <100 o sildenafil <48h."},
{t:"Glucosa/Dextrosa",d:"Hipoglucemia: oral si consciente, Dextrosa IV si no."},
{t:"Diazepam",d:"Convulsiones: 5-10mg IV lento o rectal. Vigilar depresión respiratoria."}]},
{t:"Dosis pediátricas",items:[
{t:"Adrenalina PCR",d:"0.01mg/kg IV/IO = 0.1ml/kg de sol 1:10,000"},
{t:"Dextrosa",d:"D10%: 2-4ml/kg IV | D25%: 1-2ml/kg IV"},
{t:"Diazepam",d:"0.2-0.5mg/kg IV/rectal. Máx 10mg."}]}
]}
};
export const EQP=[
{id:"e1",item:"Monitor cardíaco / DEA",tipo:"Mayor",ok:true},
{id:"e2",item:"Tabla espinal larga",tipo:"Inmovilización",ok:true},
{id:"e3",item:"Camilla de cuchara",tipo:"Inmovilización",ok:true},
{id:"e4",item:"Colchón de vacío",tipo:"Inmovilización",ok:false},
{id:"e5",item:"Collar cervical (varios tallas)",tipo:"Inmovilización",ok:true},
{id:"e6",item:"BVM — Bolsa de reanimación",tipo:"Vía aérea",ok:true},
{id:"e7",item:"Laringoscopio + hojas",tipo:"Vía aérea",ok:false},
{id:"e8",item:"Tubos endotraqueales",tipo:"Vía aérea",ok:true},
{id:"e9",item:"Oxímetro de pulso portátil",tipo:"Diagnóstico",ok:true},
{id:"e10",item:"Tensiómetro manual",tipo:"Diagnóstico",ok:true},
{id:"e11",item:"Glucómetro + tiras",tipo:"Diagnóstico",ok:false},
{id:"e12",item:"Torniquete (CAT)",tipo:"Trauma",ok:true},
{id:"e13",item:"Apósitos hemostáticos",tipo:"Trauma",ok:false},
{id:"e14",item:"Kit de parto obstétrico",tipo:"Obstétrico",ok:true}
];
export const BOT=[
{id:"b1",item:"Guantes de nitrilo",tipo:"Bioseguridad",ok:true},
{id:"b2",item:"Mascarillas quirúrgicas",tipo:"Bioseguridad",ok:true},
{id:"b3",item:"Gasas estériles",tipo:"Curación",ok:true},
{id:"b4",item:"Vendas elásticas",tipo:"Curación",ok:true},
{id:"b5",item:"Esparadrapo",tipo:"Curación",ok:true},
{id:"b6",item:"Solución salina 0.9%",tipo:"Soluciones",ok:true},
{id:"b7",item:"Alcohol antiséptico",tipo:"Soluciones",ok:true},
{id:"b8",item:"Yodopovidona",tipo:"Soluciones",ok:false},
{id:"b9",item:"Catéteres IV (varios)",tipo:"Accesos",ok:true},
{id:"b10",item:"Equipo de venoclisis",tipo:"Accesos",ok:true},
{id:"b11",item:"Jeringas (varios tamaños)",tipo:"Accesos",ok:true},
{id:"b12",item:"Cánulas orofaríngeas",tipo:"Vía aérea",ok:true},
{id:"b13",item:"Tanque O2 portátil",tipo:"Vía aérea",ok:true},
{id:"b14",item:"Tijeras de trauma",tipo:"Trauma",ok:true},
{id:"b15",item:"Manta térmica",tipo:"Trauma",ok:true},
{id:"b16",item:"Férulas",tipo:"Trauma",ok:false}
];
export const QPROMPTS=["Protocolo RCP adulto","Manejo obstrucción vía aérea","Control hemorragia severa","Signos de shock","Convulsiones activas","Anafilaxia grave","Signos de TCE grave","AEIOU-TIPS confusión"];

// EPP/equipo sugerido por tipo de emergencia — usado por el Agente de Despacho.
export const EPP_POR_TIPO={
"cardíaco":["Monitor/DEA","O2 + cánula/reservorio","Aspirina","Vía IV"],
"neurológico":["Glucómetro","O2","Collar cervical si trauma asociado","Reloj — anotar hora exacta"],
"respiratorio":["O2 alto flujo","Oxímetro","Nebulizador si disponible","Posición semisentada"],
"trauma":["EPP completo","Torniquete","Collar cervical + tabla","Apósitos hemostáticos"],
"metabólico":["Glucómetro","Dextrosa/azúcar oral","Vía IV"],
"obstétrico":["Kit de parto","Guantes estériles","Mantas para RN"]
};
