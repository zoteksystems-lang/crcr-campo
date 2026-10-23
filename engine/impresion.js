// Impresión diagnóstica — 3 posibilidades por atención, a partir de todo lo que
// se sabe (despacho, grabaciones, notas, SAMPLE/OPQRST y signos vitales).
// Catálogo basado en el temario APA/APAA de Cruz Roja Costarricense (emergencias
// médicas, trauma, intoxicaciones, ambientales, gineco-obstétricas, pediátricas
// y geriátricas). Es apoyo: la impresión final la decide el socorrista.
import {normalize} from './util.js';
import {triadasPresentes} from './triadas.js';
import {preparar,detectarSenales,buscarFrase} from './senales.js';
import {PESOS,COMBOS} from './pesos.js';
export {triadasPresentes};

// n: como se anota en la boleta · enf: ficha de la app con signos/acciones
// k: palabras de quien llama, del paciente o de la radio · dif: en qué más pensar
// confirmar: lo que diferencia este cuadro de los parecidos.
export const DX=[
  // ── Cardiovascular ──
  {id:'iam',n:'Síndrome coronario agudo (posible infarto)',enf:'sca',g:'Cardiovascular',
   k:['dolor de pecho','dolor en el pecho','dolor toracico','opresion en el pecho','presion en el pecho','infarto','dolor precordial','irradia al brazo','brazo izquierdo','mandibula','sudoroso','sudoracion fria','cardiaco','e21'],
   dif:['angina','crisis_hta','ansiedad','disnea_icc'],
   confirmar:['¿Dolor opresivo de más de 20 min que no cede en reposo? (angina suele ceder en <15 min)','¿Irradia a brazo, mandíbula o espalda? ¿Sudor frío, náuseas?','PA en ambos brazos y pulso: ¿irregular, lento o débil?','Antecedentes: infarto, HTA, diabetes, fumado, colesterol']},
  {id:'angina',n:'Angina de pecho',enf:'sca',g:'Cardiovascular',
   k:['angina','dolor de pecho al caminar','dolor con esfuerzo','nitroglicerina','isosorbide','se le quita en reposo'],
   dif:['iam','ansiedad'],
   confirmar:['¿Empezó con esfuerzo o emoción y cede en reposo/nitro en menos de 15 min?','¿Es igual a episodios previos? Si es distinto o más fuerte → tratar como infarto']},
  {id:'disnea_icc',n:'Insuficiencia cardíaca / edema agudo de pulmón',enf:'disnea',g:'Cardiovascular',
   k:['no puede acostarse','se ahoga acostado','duerme sentado','pies hinchados','piernas hinchadas','espuma rosada','insuficiencia cardiaca','estertores','crepitos','furosemida'],
   dif:['iam','epoc','asma'],
   confirmar:['¿Se ahoga más acostado? ¿Despierta de noche sin aire?','Tobillos hinchados, venas del cuello distendidas, ruidos húmedos (crépitos)','Antecedente cardíaco; toma furosemida u otros diuréticos']},
  {id:'crisis_hta',n:'Crisis hipertensiva',g:'Cardiovascular',
   k:['presion alta','hipertension','hipertenso','dolor de cabeza fuerte','vision borrosa','zumbido de oidos','no se tomo la pastilla de la presion','enalapril','losartan'],
   dif:['acv','iam','preeclampsia'],
   confirmar:['PA ≥180/110 en dos tomas','¿Hay daño de órgano? dolor de pecho, falta de aire, déficit neurológico, confusión → emergencia','¿Dejó de tomar sus medicamentos?']},
  {id:'sincope',n:'Síncope (desmayo)',g:'Cardiovascular',
   k:['se desmayo','desmayo','desmayada','perdio el conocimiento','se desvanecio','se fue de lado','sincope','mareo y cayo'],
   dif:['hipoglucemia','arritmia','convulsion','hemorragia_int'],
   confirmar:['¿Recuperó la conciencia rápido (segundos)? ¿Estaba de pie, con calor o susto?','¿Palpitaciones o dolor de pecho antes? (pensar en arritmia)','Glicemia y pulso; ¿se golpeó al caer?','¿Movimientos o se mordió la lengua? (pensar en convulsión)']},
  {id:'arritmia',n:'Arritmia / palpitaciones',enf:'sca',g:'Cardiovascular',
   k:['palpitaciones','corazon acelerado','taquicardia','pulso irregular','bradicardia','pulso lento','marcapasos','el corazon se le sale'],
   dif:['iam','ansiedad','sincope'],
   confirmar:['Pulso: frecuencia (<50 o >150) y si es irregular','¿Mareo, desmayo, dolor de pecho, falta de aire? = inestable','¿Tiene marcapasos? ¿Toma digoxina o antiarrítmicos?']},
  {id:'pcr',n:'Paro cardiorrespiratorio',enf:'pcr',g:'Cardiovascular',
   k:['paro','no respira','sin pulso','no responde y no respira','rcp','reanimacion','muerte subita','dea','e22','boquea','boqueadas'],
   dif:['ovace','sobredosis'],
   confirmar:['Sin respuesta + sin respiración normal (boqueadas no cuentan) = RCP ya','Pulso carotídeo máx. 10 s; si dudás, RCP','¿Hora de colapso? ¿RCP por testigos?']},
  {id:'hemorragia_int',n:'Shock hipovolémico / hemorragia interna',g:'Shock',
   k:['vomita sangre','vomito con sangre','heces negras','evacuaciones negras','sangrado digestivo','palido y frio','shock','muy palido','embarazo ectopico'],
   dif:['sincope','trauma_abd','hemorragia_ext'],
   confirmar:['Piel pálida, fría, sudorosa; llenado capilar >2 s; pulso rápido y débil','PA <90 sistólica o mareo al sentarse','¿Vómito con sangre, heces negras, embarazo sin control, golpe abdominal?']},

  // ── Respiratorio ──
  {id:'asma',n:'Crisis asmática',enf:'disnea',g:'Respiratorio',
   k:['asma','asmatico','asmatica','silbido','sibilancias','inhalador','salbutamol','pecho apretado','crisis de asma','bombita'],
   dif:['anafilaxia','epoc','disnea_icc','ovace'],
   confirmar:['¿Asmático conocido? ¿Usó el inhalador y cuántas veces?','¿Puede hablar frases completas? SpO2','Silbido al espirar; tórax silencioso = gravísimo']},
  {id:'epoc',n:'EPOC descompensado',enf:'disnea',g:'Respiratorio',
   k:['epoc','enfisema','bronquitis cronica','fumador','oxigeno en casa','tos con flema','flema verde'],
   dif:['asma','neumonia','disnea_icc'],
   confirmar:['¿Usa oxígeno en casa? ¿Cuánto?','EPOC conocido: O2 según protocolo (meta SpO2 88-92%)','¿Fiebre o flema de otro color? (infección)']},
  {id:'neumonia',n:'Infección respiratoria / neumonía',enf:'disnea',g:'Respiratorio',
   k:['fiebre y tos','tos con fiebre','neumonia','pulmonia','escalofrios','flema','gripe','resfrio','covid'],
   dif:['epoc','sepsis','asma'],
   confirmar:['Fiebre, tos con flema, dolor al respirar','FR >22, SpO2 <94%, confusión = grave','Adulto mayor: puede presentarse solo con confusión']},
  {id:'ovace',n:'Obstrucción de vía aérea por cuerpo extraño (OVACE)',g:'Respiratorio',
   k:['atragantado','atragantada','atragantamiento','se ahogo comiendo','se trago','no le pasa el aire','obstruccion','cuerpo extrano','se atoro','atoro','se le fue algo','moneda','canica','juguete en la boca','atragantado con','comiendo y se ahogo'],
   dif:['anafilaxia','asma'],
   confirmar:['¿Comiendo o jugando con objetos pequeños justo antes?','¿Puede toser o hablar? (parcial: animar a toser) / no puede = 5 golpes en la espalda + 5 compresiones abdominales, alternando','Signo universal de asfixia (manos al cuello)']},
  {id:'hiperventilacion',n:'Síndrome de hiperventilación / crisis de ansiedad',g:'Respiratorio',
   k:['crisis de ansiedad','ataque de panico','nervios','hiperventila','respira rapido','hormigueo en las manos','manos engarrotadas','discusion','susto','llanto'],
   dif:['iam','asma','tep','hipoglucemia'],
   confirmar:['Es diagnóstico de EXCLUSIÓN: descartá primero infarto, asma, embolia y azúcar','SpO2 normal, sin silbidos, hormigueo en manos y boca','¿Factor emocional claro? ¿Episodios previos iguales?']},
  {id:'tep',n:'Posible embolia pulmonar',enf:'disnea',g:'Respiratorio',
   k:['falta de aire de repente','dolor al respirar','pierna hinchada','cirugia reciente','viaje largo','anticonceptivos','postparto','embolia'],
   dif:['iam','hiperventilacion','neumonia'],
   confirmar:['Falta de aire súbita + taquicardia + SpO2 baja sin causa clara','¿Cirugía, inmovilización, viaje largo, posparto, cáncer, anticonceptivos?','¿Una pantorrilla hinchada y dolorosa?']},

  // ── Neurológico ──
  {id:'acv',n:'Accidente cerebrovascular (ACV)',enf:'avc',g:'Neurológico',
   k:['derrame','acv','avc','ictus','cara torcida','boca torcida','no puede hablar','habla raro','arrastra las palabras','no mueve el brazo','no mueve la pierna','debilidad de un lado','perdio la fuerza','paralisis','hemiplejia','e24'],
   dif:['hipoglucemia','convulsion','tce','crisis_hta'],
   confirmar:['BE-FAST: equilibrio, ojos (visión), cara, brazos, habla','HORA exacta en que lo vieron bien por última vez','Glicemia SIEMPRE: el azúcar baja imita un derrame','¿Anticoagulantes? ¿Golpe en la cabeza?']},
  {id:'convulsion',n:'Crisis convulsiva',enf:'conv',g:'Neurológico',
   k:['convulsion','convulsiona','convulsionando','convulsiono','ataque','epilepsia','epileptico','temblando todo','espuma por la boca','se mordio la lengua','se orino','e29'],
   dif:['hipoglucemia','tce','eclampsia','sincope','intox'],
   confirmar:['¿Cuánto duró? >5 min o repetidas sin despertar = estado epiléptico','¿Epiléptico conocido? ¿Toma sus medicamentos?','Glicemia; ¿embarazada? (eclampsia); ¿fiebre en niño?','¿Se golpeó la cabeza? ¿Licor o drogas?']},
  {id:'alt_conciencia',n:'Alteración del estado de conciencia (en estudio)',g:'Neurológico',
   k:['inconsciente','no responde','desorientado','confuso','confundido','somnoliento','no reacciona','raro','incoherente','no despierta','e23'],
   dif:['hipoglucemia','acv','intox','tce','sepsis','hiponatremia'],
   confirmar:['AVDN y Glasgow; pupilas','Glicemia, SpO2, temperatura','AEIOU-TIPS: alcohol, epilepsia, insulina, oxígeno (hipoxia)/sobredosis, urea, trauma, infección, psiquiátrico, stroke']},
  {id:'hiponatremia',n:'Trastorno hidroelectrolítico (hiponatremia / deshidratación)',enf:'hipona',g:'Neurológico',
   k:['sodio bajo','sodio','deshidratado','deshidratacion','vomitos y diarrea','diarrea','diureticos','toma mucha agua','no ha comido'],
   dif:['alt_conciencia','sepsis','hipoglucemia'],
   confirmar:['¿Vómitos o diarrea de varios días? ¿Toma diuréticos?','Mucosas secas, pliegue cutáneo, taquicardia','Confusión de inicio gradual en adulto mayor']},

  // ── Metabólico ──
  {id:'hipoglucemia',n:'Hipoglucemia',enf:'hipog',g:'Metabólico',
   k:['azucar baja','hipoglicemia','hipoglucemia','diabetico','diabetica','se puso insulina','no comio','sudando frio','temblor','glucosa baja','e25'],
   dif:['acv','alt_conciencia','intox'],
   confirmar:['Glicemia <70 mg/dL','¿Diabético con insulina o pastillas? ¿Comió?','Sudor frío, temblor, confusión o conducta extraña']},
  {id:'hiperglucemia',n:'Hiperglucemia / descompensación diabética',g:'Metabólico',
   k:['azucar alta','hiperglicemia','glucosa alta','mucha sed','orina mucho','aliento a fruta','cetoacidosis','no se puso la insulina'],
   dif:['sepsis','hiponatremia','alt_conciencia'],
   confirmar:['Glicemia >250 mg/dL (o "HI" en el glucómetro)','Sed, orina mucho, aliento afrutado, respiración profunda y rápida','¿Dejó la insulina? ¿Infección?']},
  {id:'sepsis',n:'Sepsis / infección grave',g:'Metabólico',
   k:['fiebre','calentura','escalofrios','infeccion','herida infectada','orina con ardor','sepsis','muy decaido','postrado'],
   dif:['neumonia','hiperglucemia','alt_conciencia'],
   confirmar:['Infección + 2 de: FR ≥22, confusión, PA sistólica ≤100','Temperatura, FC, llenado capilar','Adulto mayor o encamado: puede no tener fiebre']},

  // ── Alergia / intoxicaciones ──
  {id:'anafilaxia',n:'Reacción alérgica grave (anafilaxia)',enf:'anafilaxia',g:'Alergia / Tóxicos',
   k:['alergia','alergica','alergico','picadura','abeja','avispa','hormigas','urticaria','ronchas','hinchazon de la cara','labios hinchados','se le cierra la garganta','anafilaxia','epipen','e27','mariscos','mani'],
   dif:['asma','ovace','reaccion_local'],
   confirmar:['Exposición a alérgeno + inicio en minutos','Afecta vía aérea, respiración o circulación (PA baja) = anafilaxia → adrenalina IM según protocolo (o asistir con su autoinyector)','Puede NO haber ronchas']},
  {id:'reaccion_local',n:'Reacción alérgica leve / picadura local',g:'Alergia / Tóxicos',
   k:['picadura','ronchas','comezon','rasquina','hinchazon local','roncha'],
   dif:['anafilaxia'],
   confirmar:['Solo piel y zona de la picadura, sin falta de aire ni mareo','Vigilar 30-60 min: puede progresar']},
  {id:'intox',n:'Intoxicación por ingesta (medicamentos / químicos)',enf:'etilic',g:'Alergia / Tóxicos',
   k:['intoxicado','intoxicacion','se tomo','pastillas','sobredosis','veneno','tomo cloro','tomo veneno','raticida','plaguicida','herbicida','paraquat','organofosforado','gramoxone','tomo algo','e46'],
   dif:['alt_conciencia','intento_suicida','etilica'],
   confirmar:['¿Qué, cuánto y a qué hora? Llevar el envase','Organofosforados/paraquat: EPP y quitar ropa contaminada ANTES de subir a la unidad','Pupilas: puntiformes (opioides, organofosforados) o dilatadas (estimulantes)','Organofosforados: babeo, lagrimeo, sudor, diarrea, pupilas chicas','Llamar al Centro Nacional de Control de Intoxicaciones: 2223-1028']},
  {id:'etilica',n:'Intoxicación etílica',enf:'etilic',g:'Alergia / Tóxicos',
   k:['ebrio','borracho','tomado','licor','alcohol','aliento a licor','guaro','cervezas','tirado en la calle'],
   dif:['hipoglucemia','tce','intox'],
   confirmar:['El aliento a licor NO descarta otra cosa: glicemia y buscar golpes en la cabeza','Riesgo de vómito y aspiración: posición lateral','¿Mezcló con drogas o pastillas?']},
  {id:'drogas',n:'Intoxicación por drogas',enf:'etilic',g:'Alergia / Tóxicos',
   k:['drogas','cocaina','crack','piedra','marihuana','metanfetamina','sobredosis','fumo algo','pupilas chiquitas','agitado y sudando'],
   dif:['comp','intox','convulsion'],
   confirmar:['Estimulantes: agitación, taquicardia, fiebre, pupilas grandes','Depresores/opioides: respira lento, pupilas puntiformes','Escena segura: agujas, conducta violenta']},
  {id:'mordedura',n:'Mordedura de serpiente / animal ponzoñoso',g:'Alergia / Tóxicos',
   k:['serpiente','culebra','terciopelo','mordido por','mordida por','bocaraca','cascabel','mordedura','mordio','alacran','escorpion'],
   dif:['anafilaxia','reaccion_local'],
   confirmar:['Hora de la mordedura; marcar el borde del edema con hora','Sangrado por encías u orina oscura = envenenamiento','NO torniquete, NO cortar ni succionar; inmovilizar y trasladar a centro con suero antiofídico']},
  {id:'co',n:'Intoxicación por humo / monóxido de carbono',enf:'incendio',g:'Alergia / Tóxicos',
   k:['humo','inhalacion de humo','monoxido','gas','cocina de gas','calentador','espacio cerrado','dolor de cabeza varios','incendio','e61'],
   dif:['quemadura','alt_conciencia'],
   confirmar:['¿Varias personas del mismo lugar con dolor de cabeza o náuseas? = sospechar CO','El oxímetro puede marcar normal con CO: O2 a alto flujo según protocolo','Hollín en nariz/boca, voz ronca = vía aérea quemada']},

  // ── Trauma ──
  {id:'tce',n:'Trauma craneoencefálico (TCE)',enf:'trauma',g:'Trauma',
   k:['golpe en la cabeza','se golpeo la cabeza','herida en la cabeza','trauma craneal','golpe en la frente','vomita despues del golpe','sangra por el oido','sangre por el oido'],
   dif:['trauma_col','etilica','alt_conciencia'],
   confirmar:['Glasgow y pupilas (desiguales = grave); repetir cada 5 min','¿Perdió el conocimiento? ¿Vomita? ¿Amnesia?','Sangre o líquido por nariz/oído, ojos de mapache','Anticoagulantes o adulto mayor = traslado siempre']},
  {id:'trauma_col',n:'Trauma de columna (posible lesión raquimedular)',enf:'trauma',g:'Trauma',
   k:['dolor de cuello','dolor de espalda','no siente las piernas','no mueve las piernas','hormigueo','columna','cayo de espaldas','clavado','piscina'],
   dif:['tce','fractura'],
   confirmar:['Cinemática: caída ≥1 m o 5 escalones, choque a alta velocidad, clavado','Dolor en la línea media del cuello/espalda','Fuerza y sensibilidad en manos y pies; priapismo','Restricción de movimiento de columna si hay criterios']},
  {id:'trauma_tx',n:'Trauma de tórax',enf:'trauma',g:'Trauma',
   k:['golpe en el pecho','herida en el pecho','costillas','timon','volante','apunalado en el pecho','disparo en el pecho','respira con dolor','neumotorax'],
   dif:['iam','trauma_abd'],
   confirmar:['¿El pecho sube parejo? ¿Herida que sopla (aspirante)?','Ruidos respiratorios de un lado disminuidos, SpO2 baja','Segmento que se mueve al revés (tórax inestable)','Venas del cuello distendidas + PA baja = gravísimo']},
  {id:'trauma_abd',n:'Trauma abdominal / pélvico',enf:'trauma',g:'Trauma',
   k:['golpe en el abdomen','golpe en el estomago','cinturon','manubrio','herida en el abdomen','pelvis','cadera','evisceracion','apunalado en el abdomen'],
   dif:['hemorragia_int','trauma_tx'],
   confirmar:['Abdomen duro, distendido o muy doloroso; marcas del cinturón','Signos de shock sin sangrado visible = sangrado interno','Pelvis: NO mecerla; si duele, inmovilizar con faja pélvica']},
  {id:'fractura',n:'Fractura / luxación de extremidad',enf:'caida',g:'Trauma',
   k:['fractura','quebrado','quebro','se quebro','hueso','deformidad','torcio','esguince','luxacion','zafado','se doblo el tobillo','brazo quebrado','pierna quebrada'],
   dif:['trauma_col','hemorragia_ext'],
   confirmar:['Dolor, deformidad, hinchazón, no puede moverlo','Pulso, color y sensibilidad DEBAJO de la lesión antes y después de ferulizar','Fractura de fémur o abierta = riesgo de shock']},
  {id:'hemorragia_ext',n:'Herida con hemorragia externa',g:'Trauma',
   k:['herida','cortada','cortado','sangra mucho','sangrado','hemorragia','sangrado abundante','mordida de perro','mordido por un perro','machete','cuchillo','vidrio','arma blanca','apunalado','herida de bala','disparo','balazo'],
   dif:['hemorragia_int','trauma_tx','trauma_abd'],
   confirmar:['Sangrado que no para con presión = torniquete (extremidad)','Herida penetrante en tronco: buscar orificio de salida, revisar la espalda','Signos de shock']},
  {id:'quemadura',n:'Quemadura',enf:'incendio',g:'Trauma',
   k:['quemado','quemada','quemadura','quemaduras','agua caliente','aceite caliente','fuego','electrocutado','descarga electrica','quimico en la piel','incendio'],
   dif:['co','electrica'],
   confirmar:['Extensión con la regla de la palma (palma del paciente ≈ 1%)','Profundidad: enrojecida / ampollas / blanca o negra sin dolor','Cara, manos, genitales, articulaciones o circunferenciales = graves','Hollín o voz ronca = vía aérea comprometida']},
  {id:'electrica',n:'Lesión por electricidad',g:'Trauma',
   k:['electrocutado','electrocucion','descarga electrica','cable','corriente','alta tension','rayo'],
   dif:['quemadura','arritmia','pcr'],
   confirmar:['Escena: corriente cortada antes de tocar','Buscar herida de entrada y salida','Monitoreo cardíaco: riesgo de arritmia aunque se vea bien']},
  {id:'politrauma',n:'Politraumatismo (colisión / caída de altura)',enf:'colision',g:'Trauma',
   k:['colision','choque','chocaron','atropello','atropellado','motociclista','vuelco','volcado','caida de altura','cayo del techo','cayo de un andamio','e36','e40','e42','expulsado','atrapado','explosion','e62'],
   dif:['tce','trauma_tx','trauma_abd','fractura'],
   confirmar:['Cinemática: velocidad, tipo de impacto, casco/cinturón, deformidad del vehículo','XABCDE: hemorragia exsanguinante primero','Buscar lesiones ocultas: tórax, abdomen, pelvis, fémur']},
  {id:'caida_mayor',n:'Caída de adulto mayor',enf:'caida',g:'Trauma',
   k:['adulto mayor se cayo','senora mayor se cayo','senor mayor se cayo','se cayo en el bano','se cayo de la cama','resbalo'],
   dif:['fractura','tce','sincope'],
   confirmar:['¿Por qué se cayó? (mareo, desmayo, tropezón)','Cadera: pierna acortada y rotada hacia afuera','Anticoagulantes + golpe en la cabeza = traslado','¿Cuánto tiempo estuvo en el suelo?']},

  // ── Ambientales ──
  {id:'calor',n:'Golpe de calor / agotamiento por calor',g:'Ambiental',
   k:['golpe de calor','insolacion','mucho calor','sol','deshidratado','calambres','trabajando al sol','maraton','piel caliente y seca'],
   dif:['sepsis','hiponatremia','sincope'],
   confirmar:['Golpe de calor: piel caliente + confusión = emergencia, enfriar ya','Agotamiento: sudoroso, débil, mareado, conciencia normal','Temperatura']},
  {id:'hipotermia',n:'Hipotermia',g:'Ambiental',
   k:['hipotermia','tiene mucho frio','mojado','temblando de frio','agua fria','montana','cerro','chirripo'],
   dif:['alt_conciencia','ahogamiento'],
   confirmar:['Temblor intenso (leve) o ausencia de temblor con confusión (grave)','Manejar con suavidad: riesgo de arritmia','Quitar ropa mojada y abrigar']},
  {id:'ahogamiento',n:'Ahogamiento / casi ahogamiento',g:'Ambiental',
   k:['ahogado','ahogada','se ahogo en','piscina','rio','playa','mar','sumergido','corriente'],
   dif:['trauma_col','hipotermia','pcr'],
   confirmar:['Si no respira: iniciar con 5 ventilaciones','¿Clavado? = sospechar columna','Todo ahogamiento se traslada (puede empeorar en horas)']},

  // ── Gineco-obstétrico ──
  {id:'parto',n:'Trabajo de parto',enf:'gineco',g:'Gineco-obstétrico',
   k:['parto','dando a luz','contracciones','rompio fuente','rompio la fuente','ganas de pujar','se ve la cabeza','bebe naciendo','e28'],
   dif:['amenaza_aborto','preeclampsia'],
   confirmar:['Semanas, cuántos embarazos/partos, control prenatal','Contracciones: cada cuánto y cuánto duran','¿Ganas de pujar o se ve la cabeza? = parto inminente, preparar','Líquido verde (meconio) o cordón visible = urgente']},
  {id:'amenaza_aborto',n:'Sangrado en el embarazo (amenaza de aborto / ectópico)',enf:'gineco',g:'Gineco-obstétrico',
   k:['sangrado vaginal','embarazada sangrando','aborto','perdida','dolor bajito','retraso menstrual','ectopico'],
   dif:['hemorragia_int','parto'],
   confirmar:['Semanas de embarazo; cantidad de sangrado (toallas)','Dolor fuerte de un lado + shock = posible ectópico roto','Signos de shock']},
  {id:'preeclampsia',n:'Preeclampsia / eclampsia',enf:'gineco',g:'Gineco-obstétrico',
   k:['embarazada con presion alta','dolor de cabeza embarazada','vision borrosa embarazada','eclampsia','preeclampsia','embarazada convulsiona','manos y cara hinchadas'],
   dif:['convulsion','crisis_hta'],
   confirmar:['Más de 20 semanas (o hasta 6 semanas posparto) + PA ≥140/90','Dolor de cabeza, visión con lucecitas, dolor en la boca del estómago','Convulsión en embarazada = eclampsia']},

  // ── Cuadros que las tríadas ayudan a reconocer ──
  {id:'taponamiento',n:'Taponamiento cardíaco (sospecha)',g:'Trauma',
   k:['herida en el pecho','apunalado en el pecho','herida precordial','ruidos cardiacos apagados','venas del cuello hinchadas'],
   dif:['neumotorax','trauma_tx','hemorragia_int'],
   confirmar:['Tríada de Beck: PA baja + venas del cuello distendidas + ruidos cardíacos apagados','Herida penetrante en "la caja" (entre pezones, clavículas y reborde costal)','Traslado inmediato: no se resuelve en campo']},
  {id:'neumotorax',n:'Neumotórax (a tensión, sospecha)',enf:'trauma',g:'Trauma',
   k:['neumotorax','no le entra aire de un lado','falta de aire despues del golpe','herida que sopla','traquea desviada','enfisema subcutaneo','crepita la piel'],
   dif:['taponamiento','trauma_tx','asma'],
   confirmar:['Falta de aire progresiva + ruidos ausentes de un lado','Venas del cuello distendidas, PA bajando, SpO2 cayendo = a tensión','Herida soplante: sello torácico con válvula (o apósito oclusivo); si empeora la respiración, levantar una esquina para liberar aire']},
  {id:'meningitis',n:'Meningitis / infección del sistema nervioso (sospecha)',g:'Neurológico',
   k:['rigidez de nuca','cuello rigido','no puede bajar la cabeza','fiebre y dolor de cabeza','manchas moradas','petequias','meningitis','le molesta la luz'],
   dif:['sepsis','alt_conciencia','convulsion'],
   confirmar:['Fiebre + rigidez de nuca + alteración de conciencia','Manchas que no se borran al presionar (petequias) = urgentísimo','EPP: mascarilla para vos y para el paciente']},
  {id:'aneurisma',n:'Aneurisma de aorta roto / disección (sospecha)',g:'Cardiovascular',
   k:['dolor de espalda desgarrante','dolor que se pasa a la espalda','masa que late','aneurisma','diseccion','dolor como un desgarro'],
   dif:['iam','hemorragia_int','abdomen'],
   confirmar:['Dolor súbito "desgarrante" en pecho, abdomen o espalda','PA diferente entre brazos (>20 mmHg) o pulsos desiguales','Hipotensión + masa pulsátil en abdomen = traslado inmediato']},

  // ── Otros frecuentes ──
  {id:'abdomen',n:'Dolor abdominal agudo',g:'Digestivo',
   k:['dolor de estomago','dolor abdominal','dolor de barriga','colico','vomitos','apendicitis','vesicula','dolor en el abdomen','dolor de panza'],
   dif:['iam','amenaza_aborto','hemorragia_int'],
   confirmar:['Dónde (cuadrante), desde cuándo, si es fijo o va y viene','Abdomen duro como tabla, fiebre, vómito con sangre o heces negras','Mujer en edad fértil: ¿puede estar embarazada?','Dolor "de estómago" en adulto mayor/diabético: pensar en infarto']},
  {id:'comp',n:'Crisis de conducta / emergencia psiquiátrica',enf:'comp',g:'Conducta',
   k:['agresivo','agitado','agitacion','psiquiatrico','violento','alterado','esquizofrenia','bipolar','alucinaciones','escucha voces','e26'],
   dif:['hipoglucemia','drogas','alt_conciencia','intento_suicida'],
   confirmar:['Escena segura primero; Policía si hay riesgo','Descartar causa médica: glicemia, SpO2, golpe en la cabeza, drogas','¿Diagnóstico previo? ¿Dejó medicamentos?']},
  {id:'intento_suicida',n:'Intento autolítico / riesgo suicida',enf:'comp',g:'Conducta',
   k:['intento de suicidio','suicida','quiere matarse','se quiere matar','se corto las venas','se colgo','ahorcado','se tiro','tomo pastillas para morir'],
   dif:['intox','hemorragia_ext','comp'],
   confirmar:['¿Con qué? (pastillas, tóxico, corte, ahorcamiento) → tratar la lesión','No dejarlo solo; retirar objetos peligrosos','Ahorcamiento: sospechar lesión de columna cervical']}
];

const POR_ID=Object.fromEntries(DX.map(d=>[d.id,d]));
const contiene=(nt,f)=>{const n=normalize(f);return n&&new RegExp('(^| )'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'( |$)').test(nt);};
const num=v=>{const n=parseFloat(String(v??'').replace(',','.'));return isNaN(n)?null:n;};

// Pistas que dan los signos vitales de la boleta.
function pistasVitales(sv={},ctx={}){
  const p=[];
  const glu=num(sv.glu),spo2=num(sv.spo2),pas=num(sv.pa1),pad=num(sv.pa2),fc=num(sv.fc),fr=num(sv.fr),t=num(sv.temp),gcs=num(sv.gcs);
  if(glu!=null&&glu<70)p.push(['hipoglucemia',8,`glicemia ${glu}`]);
  if(glu!=null&&glu>250)p.push(['hiperglucemia',6,`glicemia ${glu}`]);
  if(spo2!=null&&spo2<94)['asma','epoc','neumonia','disnea_icc','tep'].forEach(id=>p.push([id,2,`SpO2 ${spo2}%`]));
  if(pas!=null&&(pas>=180||(pad!=null&&pad>=110)))p.push(['crisis_hta',5,`PA ${pas}/${pad??'?'}`]);
  if(pas!=null&&pas>=140&&ctx.embarazo)p.push(['preeclampsia',5,`PA ${pas} en embarazada`]);
  if(pas!=null&&pas<90)['hemorragia_int','anafilaxia','sepsis'].forEach(id=>p.push([id,3,`PA ${pas}`]));
  if(fc!=null&&(fc>150||fc<50))p.push(['arritmia',4,`FC ${fc}`]);
  if(t!=null&&t>=38)['sepsis','neumonia'].forEach(id=>p.push([id,3,`T ${t}°`]));
  if(t!=null&&t>=40)p.push(['calor',4,`T ${t}°`]);
  if(t!=null&&t<35)p.push(['hipotermia',6,`T ${t}°`]);
  if(fr!=null&&fr>=22)['sepsis','neumonia'].forEach(id=>p.push([id,1,`FR ${fr}`]));
  if(gcs!=null&&gcs<15)p.push(['alt_conciencia',2,`Glasgow ${gcs}`]);
  return p;
}

// Devuelve SIEMPRE 3 impresiones (si hay datos): las más probables y, si faltan,
// los diferenciales del cuadro principal. Cada una dice por qué y qué confirmar.
// Cuadros que no se proponen en un niño y diferenciales pediátricos por sistema.
const SOLO_ADULTO=new Set(['iam','angina','crisis_hta','epoc','aneurisma','caida_mayor','disnea_icc','preeclampsia','parto','amenaza_aborto']);
const PEDIATRICOS={Respiratorio:['ovace','neumonia','anafilaxia'],Neurológico:['convulsion','hipoglucemia','tce'],
  Cardiovascular:['asma','neumonia','anafilaxia'],Shock:['sepsis','anafilaxia','hemorragia_int']};
export function tresImpresiones(texto,{sv,ctx={}}={}){
  const toks=preparar(texto);
  const sen=detectarSenales(texto);
  const pts=new Map();
  const add=(id,s,por)=>{if(!POR_ID[id]||!s)return;const o=pts.get(id)||{s:0,por:[]};o.s+=s;if(por&&!o.por.includes(por)&&o.por.length<4)o.por.push(por);pts.set(id,o);};
  // 1. Señales clínicas (raíces, fonética, negación) y combinaciones.
  for(const [id,w] of Object.entries(PESOS))for(const [k,p] of Object.entries(w))if(sen[k])add(id,p,sen[k]);
  for(const [id,req,p] of COMBOS)if(req.every(k=>sen[k]))add(id,p,req.map(k=>sen[k]).join(' + '));
  // 2. Frases propias de cada cuadro y códigos E (máx. 6 puntos por cuadro).
  for(const d of DX){let s=0;for(const k of d.k){if(s>=6)break;const h=buscarFrase(toks,k);if(h){const p=/^e\d\d$/.test(k)?6:(k.includes(' ')?2:1.5);s+=p;add(d.id,p,h);}}}
  for(const [id,s,por] of pistasVitales(sv,ctx))add(id,s,por);
  for(const t of triadasPresentes(texto,{sv}))add(t.dx,t.completa?10:5,t.n+(t.completa?'':' (2/3)'));
  // Con mecanismo de trauma, el dolor de pecho es traumático hasta demostrar lo contrario.
  if(sen.vehiculo||sen.altura||sen.penetrante||(sen.golpe&&sen.r_torax))for(const id of ['iam','angina'])if(pts.has(id))pts.get(id).s*=0.35;
  // Contexto: embarazo, edad.
  if(ctx.embarazo){['parto','amenaza_aborto','preeclampsia'].forEach(id=>{if(pts.has(id))add(id,2,'embarazo');});}
  if(ctx.mayor&&pts.has('caida_mayor'))add('caida_mayor',2,'adulto mayor');
  // En un niño los cuadros de adulto no se proponen: se quitan (y se recuerda su sistema por
  // si no queda nada, para ofrecer los pediátricos de ese sistema). El ACV pediátrico existe
  // pero es raro: solo baja su peso.
  let sistemaAdulto=null;
  if(ctx.nino){
    if(pts.has('acv'))pts.get('acv').s*=0.3;
    for(const id of SOLO_ADULTO)if(pts.has(id)){if(!sistemaAdulto||pts.get(id).s>sistemaAdulto.s)sistemaAdulto={s:pts.get(id).s,g:POR_ID[id].g,por:pts.get(id).por};pts.delete(id);}
  }
  if(ctx.edad!=null&&ctx.edad<9)for(const id of ['parto','amenaza_aborto','preeclampsia'])pts.delete(id);
  const orden=[...pts.entries()].sort((a,b)=>b[1].s-a[1].s);
  if(!orden.length){
    if(!sistemaAdulto)return [];
    // Solo había cuadros de adulto: se ofrecen los pediátricos de ese sistema para descartar.
    return (PEDIATRICOS[sistemaAdulto.g]||['sepsis','intox','hipoglucemia']).slice(0,3).map(id=>({...POR_ID[id],por:['niño: '+(sistemaAdulto.por[0]||'síntomas del despacho')],conf:'descartar'}));
  }
  const top=orden[0][1].s;
  // Los candidatos con muy poco respaldo ceden su lugar a los diferenciales clínicos.
  const res=orden.slice(0,3).filter(([,o],i)=>i===0||o.s>=Math.max(3,top*0.3)).map(([id,o])=>({...POR_ID[id],por:o.por,conf:o.s>=Math.max(7,top*0.8)?'alta':o.s>=4?'media':'baja'}));
  // Completar con diferenciales para que siempre haya 3 que considerar. En un niño no se
  // proponen cuadros de adulto (EPOC, infarto, insuficiencia cardíaca…): van los pediátricos.
  const ppal=POR_ID[orden[0][0]];
  const difs=ctx.nino?[...ppal.dif.filter(id=>!SOLO_ADULTO.has(id)),...(PEDIATRICOS[ppal.g]||['sepsis','intox'])]:ppal.dif;
  for(const id of difs){
    if(res.length>=3)break;
    if(POR_ID[id]&&!res.some(r=>r.id===id))res.push({...POR_ID[id],por:['diferencial de '+ppal.n.toLowerCase()],conf:'descartar'});
  }
  return res;
}

