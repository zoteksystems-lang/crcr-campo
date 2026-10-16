// Signos a ubicar por código E — guía visual de campo. Cada signo dice DÓNDE
// mirar (zona del cuerpo, que se marca en el mapa) y QUÉ buscar. Texto de
// apoyo para la evaluación; no reemplaza el protocolo ni la valoración.
// Zonas del mapa: cabeza, ojos, oidos, cara, boca, cuello, torax, abdomen,
// pelvis, brazos, brazoIzq, munecas, manos, piernas, talones, piel, general.

export const SIGNOS={
  sca:[
    ['torax','Dolor opresivo en el centro del pecho (presión, peso, ardor). Que duela al presionar NO descarta infarto. Preguntá desde cuándo.'],
    ['brazos','Presión arterial ANTES de la nitroglicerina (solo si PA >100). Preguntá si tomó sildenafil (Viagra) o similar en las últimas 48 h.'],
    ['brazoIzq','Dolor que baja al brazo izquierdo (o a ambos brazos).'],
    ['cara','Dolor que sube a mandíbula o cuello; también puede ir a la espalda.'],
    ['piel','Piel pálida, fría y sudorosa ("se ve mal").'],
    ['munecas','Pulso radial: rápido, lento o irregular; débil = alarma.'],
    ['general','Náuseas, ansiedad, falta de aire. En mujeres, diabéticos y adultos mayores puede haber solo cansancio o disnea.']
  ],
  pcr:[
    ['general','Respuesta: tocá los hombros y hablá fuerte. ¿Responde?'],
    ['torax','Respiración: mirá el pecho máximo 10 s, a la vez que buscás pulso. Boqueadas (gasping) NO son respiración normal.'],
    ['cuello','Pulso carotídeo máximo 10 s (solo personal entrenado). Si dudás, iniciá RCP.'],
    ['boca','Labios morados o grises; revisá si hay algo visible en la boca.']
  ],
  avc:[
    ['cara','F — Cara: pedile que sonría. ¿Un lado de la boca cae?'],
    ['brazos','A — Brazos: que levante los dos 10 s con ojos cerrados. ¿Uno baja?'],
    ['boca','S — Habla: que repita una frase. ¿Arrastra palabras o no entiende?'],
    ['ojos','E — Ojos: visión doble o pérdida de visión, mirada desviada a un lado; pupilas desiguales = gravedad.'],
    ['piernas','B — Equilibrio: mareo súbito, no puede caminar o se va de lado.'],
    ['manos','Glucosa capilar: la hipoglucemia imita un derrame.'],
    ['general','T — Tiempo: anotá la hora exacta en que lo vieron bien por última vez.']
  ],
  conv:[
    ['brazos','Movimientos rítmicos de brazos y piernas: cronometrá cuánto dura.'],
    ['cabeza','Protegé la cabeza; buscá golpes o heridas de la caída.'],
    ['boca','Mordedura de lengua y secreciones. No metás nada en la boca.'],
    ['pelvis','Pérdida de orina o heces (relajación de esfínteres).'],
    ['manos','Glucosa capilar cuando sea seguro medirla.'],
    ['general','Después: confusión y somnolencia (postictal). Si convulsiona más de 5 min o no despierta entre crisis = estatus.']
  ],
  hipog:[
    ['piel','Sudoración fría y palidez.'],
    ['manos','Temblor. Glucosa capilar: menos de 70 mg/dL confirma.'],
    ['cabeza','Confusión, conducta extraña o agresiva, somnolencia (puede parecer ebriedad).'],
    ['boca','¿Está despierto, obedece y traga bien? Solo así se da azúcar por boca; si no, NADA por boca.'],
    ['munecas','Buscá brazalete de diabético; preguntá por insulina u otros medicamentos.']
  ],
  hipona:[
    ['cabeza','Confusión, dolor de cabeza, somnolencia.'],
    ['abdomen','Náuseas y vómitos.'],
    ['piernas','Calambres, debilidad muscular, caídas.'],
    ['general','Convulsiones en casos graves. Sospechá en adulto mayor con diuréticos o en quien tomó mucha agua (deporte de resistencia).']
  ],
  disnea:[
    ['boca','Habla entrecortada (solo frases cortas o palabras sueltas); labios morados.'],
    ['cara','Aleteo nasal.'],
    ['cuello','Músculos del cuello marcados, hundimiento sobre las clavículas, venas del cuello hinchadas.'],
    ['torax','Hundimiento entre costillas, pecho que no se expande parejo, silbidos o ruidos. Asmático grave con pecho "silencioso" (sin silbidos) = alarma, no mejoría.'],
    ['manos','Oximetría: SpO₂ menor de 94 % = baja; menor de 90 % = grave (en EPOC la meta es 88-92 %). Dedos morados.'],
    ['piernas','Hinchazón de tobillos (posible insuficiencia cardíaca).'],
    ['general','Posición de trípode (sentado, inclinado, apoyado en las manos) = esfuerzo grande.']
  ],
  trauma:[
    ['piernas','M — Hemorragia masiva: revisá extremidades, ingle y axilas; charcos de sangre.'],
    ['boca','A — Vía aérea con control cervical: sangre, dientes, vómito, ronquidos.'],
    ['torax','R — Respiración: heridas, pecho que se mueve desparejo, crujidos al tocar.'],
    ['munecas','C — Circulación: pulso radial débil o ausente, piel fría, llenado capilar mayor de 2 s.'],
    ['pelvis','Dolor o deformidad en pelvis: NO la balanceés; cinturón pélvico si hay sospecha y shock.'],
    ['cabeza','H — Cabeza e hipotermia: heridas, pupilas, nivel de conciencia; cubrí al paciente.'],
    ['cuello','Dolor o deformidad en la columna: restringí el movimiento.']
  ],
  anafilaxia:[
    ['piel','Ronchas, enrojecimiento o picazón. OJO: puede NO haber ronchas; si tras la exposición hay problema respiratorio o presión baja, igual es anafilaxia.'],
    ['cara','Labios, lengua o párpados hinchados.'],
    ['cuello','Voz ronca, ruido al respirar (estridor), sensación de que se cierra la garganta.'],
    ['torax','Silbidos y dificultad para respirar.'],
    ['munecas','Pulso rápido y débil; mareo o desmayo = presión baja.'],
    ['abdomen','Vómitos, dolor abdominal tipo cólico.'],
    ['brazos','Buscá el sitio de la picadura o inyección y si trae autoinyector. La adrenalina va en el MUSLO (cara externa), no en el brazo.']
  ],
  etilic:[
    ['cabeza','Golpes o heridas: el trauma craneal se esconde detrás de la ebriedad.'],
    ['oidos','Moretón detrás de la oreja (signo de Battle) o salida de líquido por oído o nariz.'],
    ['ojos','Ojos de mapache (moretones alrededor) y pupilas desiguales.'],
    ['manos','Glucosa capilar: la hipoglucemia parece borrachera.'],
    ['boca','Vómito en la boca: posición lateral y vía aérea libre (si hay sospecha de trauma, girarlo en bloque).'],
    ['torax','Respiración lenta (menos de 12 por minuto) o pausas = alarma.'],
    ['piel','Piel fría: hipotermia.']
  ],
  colision:[
    ['cabeza','Parabrisas en estrella = golpe en la cabeza. Revisá heridas y conciencia.'],
    ['cuello','Dolor o deformidad en el cuello: restringí el movimiento de la columna.'],
    ['torax','Marca del volante o del cinturón en el pecho.'],
    ['abdomen','Marca del cinturón en el abdomen, abdomen duro o doloroso.'],
    ['pelvis','Dolor de cadera o pelvis: no la balanceés; si se sospecha fractura, estabilizá.'],
    ['piernas','Rodillas y muslos (golpe contra el tablero), pies atrapados.'],
    ['general','Mecanismo: deformación del vehículo, intrusión en la cabina, ocupantes fallecidos = alta energía.']
  ],
  incendio:[
    ['cara','Quemaduras en la cara; cejas, pestañas o vellos de la nariz chamuscados.'],
    ['boca','Hollín en boca o nariz; esputo negro.'],
    ['cuello','Voz ronca o ruido al respirar: la vía aérea se puede cerrar en minutos a horas; vigilá aunque ahora hable bien.'],
    ['torax','Tos y silbidos.'],
    ['cabeza','Dolor de cabeza, mareo o confusión: monóxido de carbono (la oximetría puede salir normal).'],
    ['piel','Extensión de las quemaduras (regla de los 9; NO contés el simple enrojecimiento). Quemaduras que rodean pecho o extremidades = alarma.']
  ],
  gineco:[
    ['abdomen','Contracciones: cada cuántos minutos y cuánto duran. Abdomen duro y doloroso entre contracciones = alarma. Dolor en la boca del estómago o bajo las costillas derechas = preeclampsia grave.'],
    ['pelvis','Coronamiento (se ve la cabeza), sangrado, salida de líquido: anotá color (verde = meconio). Cordón visible = prolapso: posición genupectoral y Código 1.'],
    ['cabeza','Dolor de cabeza fuerte, visión borrosa o luces: posible preeclampsia.'],
    ['brazos','Presión arterial: 140/90 o más es alarma en el embarazo.'],
    ['manos','Hinchazón súbita de manos y cara (apoya sospecha de preeclampsia; lo que manda es la presión).'],
    ['general','Convulsión en embarazada o con parto reciente (hasta 6 semanas) = eclampsia. Preguntá semanas de embarazo y número de partos.']
  ],
  comp:[
    ['general','Seguridad de la escena primero; no te quedés solo con el paciente.'],
    ['manos','Glucosa capilar y oximetría: la hipoglucemia y la falta de oxígeno causan agitación.'],
    ['ojos','Pupilas muy grandes o muy pequeñas (sustancias), desiguales (lesión).'],
    ['cabeza','Golpes o heridas en la cabeza.'],
    ['piel','Fiebre, sudoración o piel fría.'],
    ['boca','Olor del aliento: alcohol, olor a fruta (cetonas).'],
    ['brazos','Marcas de inyección en brazos.'],
    ['munecas','Cortes en muñecas o antebrazos: preguntá directamente si quiere hacerse daño.']
  ],
  expl:[
    ['oidos','Sordera, zumbido o sangre en el oído = onda expansiva. Oídos normales NO descartan lesión interna.'],
    ['cuello','Si fue lanzado por la explosión: restringí el movimiento de la columna.'],
    ['torax','Falta de aire o tos con sangre (pulmón de blast), aunque no haya heridas visibles.'],
    ['abdomen','Dolor abdominal (lesión de órganos internos).'],
    ['piernas','Amputaciones, hemorragias y esquirlas en extremidades.'],
    ['ojos','Lesiones en los ojos por fragmentos.'],
    ['piel','Quemaduras.']
  ],
  caida:[
    ['cabeza','Heridas, moretones; Battle u ojos de mapache = fractura de cráneo (aparecen tarde: si no están, no la descartan).'],
    ['cuello','Dolor en cuello o espalda: restringí el movimiento de la columna.'],
    ['talones','Si cayó de pie: talones y columna lumbar (suelen ir juntas).'],
    ['pelvis','Adulto mayor: pierna más corta y girada hacia afuera = fractura de cadera.'],
    ['munecas','Muñecas deformes (cayó con las manos extendidas).'],
    ['general','Altura de la caída y por qué cayó: desmayo, mareo, medicamentos. ¿Toma anticoagulantes? Un golpe leve en la cabeza puede sangrar por dentro.']
  ]
};

// Posición de cada zona en el mapa (silueta de frente, viewBox 0 0 200 420).
// La izquierda del paciente queda a la derecha del dibujo.
export const ZONAS={
  cabeza:[[100,20]],ojos:[[87,36]],oidos:[[73,42],[127,42]],cara:[[114,46]],boca:[[100,58]],
  cuello:[[100,76]],torax:[[100,130]],abdomen:[[100,190]],pelvis:[[100,236]],
  brazos:[[42,160],[158,160]],brazoIzq:[[158,160]],munecas:[[32,206],[168,206]],manos:[[26,228]],
  piernas:[[78,320],[122,320]],talones:[[80,404],[120,404]]
};
