// Detector de señales clínicas en texto libre (despacho, transcripción, notas).
// En vez de buscar frases exactas, reconoce SÍNTOMAS / SIGNOS / MECANISMOS
// aunque vengan dichos de otra forma o mal transcritos:
//  · raíces: "sudor*" cubre sudoroso, sudorosa, sudando, sudoración
//  · ortografía/fonética: z=s, v=b, ll=y, ce/ci=se/si, x=s, sin tildes
//  · palabras intermedias: "dolor fuerte en el pecho" = "dolor … pecho"
//  · negación: "niega dolor de pecho", "no es diabética", "sin fiebre" no cuentan
//  · números: "glicemia de 35", "presión de 210"
// Todo local y determinístico.

// ── Normalización ────────────────────────────────────────────────────────
function base(t){
  return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ñ/g,'n');
}
// Fonética del español hablado/transcrito: lo que suena igual se escribe igual.
function fon(w){
  return w.replace(/^h/,'').replace(/ll/g,'y').replace(/v/g,'b').replace(/z/g,'s').replace(/x/g,'s')
    .replace(/c([ei])/g,'s$1').replace(/qu([ei])/g,'k$1').replace(/c([aou])/g,'k$1').replace(/(.)\1/g,'$1');
}
const CORTE=new Set(['|','pero','aunque','sino','mientras']);
const NEG=new Set(['no','niega','sin','tampoco','nunca','ni','descarta','negativo']);

// Texto → tokens fonéticos con marca de negación y de cortes de frase.
export function preparar(texto){
  const t=base(texto)
    .replace(/\be[\s-]+(\d{2})\b/g,'e$1')          // "E 21" / "E-21" → e21
    .replace(/[.;:!?\n]+/g,' | ').replace(/,/g,' , ')
    .replace(/[^a-z0-9|, ]+/g,' ');
  const crudo=t.split(/\s+/).filter(Boolean);
  const toks=[];let negar=0;
  for(const w of crudo){
    if(w===','){negar=Math.max(0,negar-2);continue;}   // la coma corta parcialmente
    if(CORTE.has(w)){negar=0;toks.push({w:'|',f:'|',neg:false,raw:w});continue;}
    const esNeg=NEG.has(w);
    toks.push({w,f:fon(w),neg:negar>0&&!esNeg,raw:w,esNeg});
    if(esNeg)negar=4;else if(negar>0)negar--;
  }
  return toks;
}

// ── Coincidencia de una frase ("dolor* pecho") contra los tokens ─────────
function lev1(a,b){ // ¿distancia de edición ≤ 1?
  if(a===b)return true;
  const la=a.length,lb=b.length;if(Math.abs(la-lb)>1)return false;
  let i=0,j=0,e=0;
  while(i<la&&j<lb){
    if(a[i]===b[j]){i++;j++;continue;}
    if(++e>1)return false;
    if(la>lb)i++;else if(lb>la)j++;else{i++;j++;}
  }
  return e+(la-i)+(lb-j)<=1;
}
function compilarTermino(t){
  const pref=t.endsWith('*');const raiz=fon(base(pref?t.slice(0,-1):t));
  return {pref,raiz,neg:NEG.has(base(t))};
}
function encaja(term,tok){
  if(tok.w==='|')return false;
  if(term.pref)return tok.f.startsWith(term.raiz)||(term.raiz.length>=6&&lev1(tok.f.slice(0,term.raiz.length),term.raiz));
  if(tok.f===term.raiz)return true;
  if(tok.f===term.raiz+'s'||tok.f===term.raiz+'es')return true;           // plural
  return term.raiz.length>=6&&lev1(tok.f,term.raiz);                      // typo de 1 letra
}
const cacheFrases=new Map();
function compilarFrase(f){
  let c=cacheFrases.get(f);
  if(!c){c=f.trim().split(/\s+/).map(compilarTermino);cacheFrases.set(f,c);}
  return c;
}
// Busca la frase con hasta 3 palabras entre término y término, sin cruzar "|".
// Si la frase no trae su propia negación ("no respira"), no cuenta en zona negada.
function buscarFrase(toks,frase){
  const ts=compilarFrase(frase);
  const traeNeg=ts.some(t=>t.neg);
  for(let i=0;i<toks.length;i++){
    if(!encaja(ts[0],toks[i]))continue;
    if(!traeNeg&&toks[i].neg)continue;
    let pos=i,ok=true;
    for(let k=1;k<ts.length;k++){
      let hall=-1;
      for(let j=pos+1;j<=Math.min(toks.length-1,pos+4);j++){
        if(toks[j].w==='|')break;
        if(encaja(ts[k],toks[j])&&(traeNeg||!toks[j].neg)){hall=j;break;}
      }
      if(hall<0){ok=false;break;}
      pos=hall;
    }
    if(ok)return toks.slice(i,pos+1).map(t=>t.raw).join(' ');
  }
  return null;
}

// ── Catálogo de señales ──────────────────────────────────────────────────
export const SENALES={
  dolor_torax:['dolor* pecho','dolor* torax','dolor* torasic*','dolor* precordial*','opresi* pecho','opresi* torax','peso* pecho','presion* pecho','apret* pecho','angina*','dolor* corazon'],
  irradiacion:['brazo izquierd*','mandibul*','corre* espalda','corre* brazo','va* brazo','irradi*','baja* brazo','pasa* espalda'],
  sudoracion:['sudor*','sudad*','sudand*','diaforet*','empapad* sudor'],
  nausea:['nause*','gana* vomitar','asco'],
  vomito:['vomit*','devolvi*','trasbocad*'],
  palidez:['palid*','piel fri*','frio* sudoros*','pulso debil','shock','choque hipovolem*','gris*'],
  disnea:['falta* aire','no puede respirar','no puede respirar bien','dificultad* respir*','cuesta* respirar','disne*','ahog*','respira* mal','respira* rapid*','respira* con dificultad','se cansa','fatiga*','no le entra aire','le falta el aire'],
  sibilancia:['sibilan*','silbid*','pito* pecho','chill* pecho','pecho apretado','bronco*'],
  asma:['asma*','bombita','inhalador*','salbutamol'],
  epoc:['epoc','enfisem*','bronquitis cronica','oxigeno casa','oxigeno domicili*','fumador* cronic*'],
  fiebre:['fiebre*','calentura*','febril*','temperatura alta','escalofri*'],
  tos:['tos','tosiend*','flema*','expector*','gargaj*'],
  ortopnea:['ahog* acost*','no puede acostarse','duerme sentad*','pie* hinchad*','pierna* hinchad*','tobillo* hinchad*','edema* pierna*','edema* pie*'],
  inconsciente:['inconscien*','no respond*','no reaccion*','sin respuesta','colaps*','desplom*','perdio conocimiento','perdio el conocimiento','tirad* suelo','no despierta'],
  paro:['no respira','sin respira*','boque*','gasping','sin signos de vida','no tiene pulso','sin pulso','paro*','rcp','reanimac*','muerte subita','dea','desfibril*'],
  cara:['cara torcid*','boca torcid*','cara caid*','boca caid*','cara chuec*','boca chuec*','desviac* comisura','paralisis facial','cara de un lado'],
  habla:['habla enredad*','habla rar*','habla mal','no puede hablar','dificultad* hablar','arrastr* palabra*','no se le entiende','no le entiende','no entiende lo que habla','disartri*','afasi*','balbuce*','sin poder hablar','lengua trabad*'],
  debilidad_lado:['debilidad* lado','debilidad* brazo','debilidad* pierna','debilidad* mitad','perdio* fuerza','perdida* fuerza','no mueve brazo','no mueve pierna','no mueve el lado','no puede levantar brazo','no puede levantar el brazo','hemipleji*','hemipare*','paralisis','paralizad*','lado derecho cuerpo','lado izquierdo cuerpo','adormec* lado','se le durmio el lado'],
  inicio_subito:['de repente','de pronto','subit*','amanecio','repentin*'],
  convulsion:['convuls*','ataque* epilep*','epilep*','espuma boca','temblando todo','se mordio lengua','postictal','crisis epilep*','tuvo un ataque','le dio un ataque','sacudid*','se puso rigid*'],
  diabetes:['diabet*','insulin*','metformin*'],
  glucosa_baja:['azucar baja','glucosa baja','glisemia baja','hipogluc*','hipoglis*','bajon de azucar'],
  glucosa_alta:['azucar alta','glucosa alta','glisemia alta','hipergluc*','hiperglis*','cetoacid*'],
  confusion:['confus*','confundid*','desorient*','incoheren*','no sabe donde','somnolient*','dormid*','raro','extrañ*','extran*','agitad*'],
  atragantamiento:['atragant*','atoro','atoro*','se trago','trago* pieza','trago* juguete','trago* moneda','cuerpo extran*','confite','moneda','canica','manos cuello','manos en el cuello','comiendo y','despues de comer','se le fue algo','obstruc* via aerea'],
  alergeno:['alergi*','picad*','pico*','abeja*','avispa*','enjambre*','marisco*','mani','penicilin*','reaccion alergic*','alergic*'],
  piel_alergia:['ronch*','urticari*','hinchaz* cara','cara hinchad*','labios hinchad*','garganta cerr*','cierra* garganta','cerrando garganta','comezon*','rasquin*','lengua hinchad*'],
  ingesta:['ingest*','se tomo','tomo un frasco','tomo veneno','pastilla*','frasco*','veneno*','cloro','plaguicid*','herbicid*','raticid*','insecticid*','sobredosis','intoxic*','gramoxon*','paraquat','organofosfor*','tomo algo','se trago'],
  alcohol:['licor*','alcohol*','ebri*','borrach*','tomad*','aliento licor','aliento a licor','guaro*','cerveza*','etilic*'],
  opioide:['pupila* chiquit*','pupila* puntiform*','pupila* punta alfiler','miosis','respira lent*','respira poco','heroin*','fentanil*','morfin*'],
  estimulante:['cocain*','crack','piedra','metanfetamin*','drogad*','droga*','sobredosis'],
  serpiente:['serpiente*','culebra*','terciopelo','bocaraca','cascabel','ofidi*','toboba','mordedura serpiente'],
  humo:['humo','monoxid*','calentador*','inhalac* humo','incendi*','gas','intoxicad* humo'],
  vehiculo:['colision*','chok*','chocaron','choco','atropell*','moto*','motociclist*','vehicul*','carro*','automobil*','bus','buseta','volcad*','vuelco','derrap*','accidente transito','accidente de transito','interamericana','autopista','ciclist*','bicicleta','camion*','e36'],
  altura:['cayo de','cayo desde','caida de','caida desde','andamio*','techo*','escalera*','altura','precipit*','metros','tapia','arbol','balcon*','segundo piso'],
  caida:['cayo','caida*','resbal*','tropes*','se fue al suelo'],
  golpe:['golpe*','golpead*','traum*','contus*','agredid*','agresion','impacto','paliza','pateado'],
  penetrante:['arma blanca','apunal*','punal*','puñal*','cuchill*','navaj*','arma fuego','arma de fuego','bala*','balazo*','disparo*','baleado*','herida penetrante','machete*','perdigon*'],
  herida:['herida*','herido*','cortad*','lacerac*','sangr*','hemorrag*','vidrio*','corte*'],
  r_cabeza:['cabeza','craneo','cranea*','frente','cuero cabelludo','oido','sien','cara'],
  r_torax:['pecho','torax','torasic*','costilla*','costal*','esternon'],
  r_abdomen:['abdomen','abdominal*','panza','barriga','estomago','vientre','ombligo'],
  r_columna:['cuello','nuca','espalda','columna','cervical*','lumbar*'],
  r_extremidad:['brazo*','antebrazo*','pierna*','muslo*','femur','tobillo*','muneca*','mano*','pie','pies','rodilla*','hombro*','codo*','dedo*','cadera'],
  deformidad:['deform*','fractur*','quebr*','torcid*','hueso expuesto','hueso afuera','luxac*','safad*','esguins*','no puede apoyar'],
  quemadura:['quemad*','quemadur*','agua hirbiend*','agua caliente','aceite caliente','escald*','fuego','llamas'],
  electrica:['descarga*','electrocut*','alta tension','corriente electric*','cable*','rayo'],
  calor:['calor','insolac*','sol','golpe de calor','deshidrat*'],
  agua:['ahogad*','ahogo en','sumergid*','sacad* rio','sacad* agua','piscina','rio','mar','playa','posa','represa','lago'],
  embarazo:['embaras*','gestant*','semanas gestac*','encinta','gravid*','semanas de embarazo'],
  parto:['contraccion*','rompio fuente','rompio la fuente','fuente rota','pujar','puja*','viene el bebe','ya viene','dando a luz','trabajo de parto','parto','se ve la cabeza'],
  sangrado_vaginal:['sangrado vaginal','sangr* vagin*','sangrado* embaras*','perdida* sangre','aborto*','manch* sangre'],
  cefalea:['dolor de cabeza','dolor cabeza','cefale*','migran*','jaqueca*'],
  vision:['vision borrosa','bista borrosa','lucesitas','ve luces','ve borroso','fosfen*','ve manchas','destellos'],
  hta:['presion alta','hipertens*','pa alta','presion arterial alta','tension alta'],
  edema_cara:['cara hinchad*','mano* hinchad*','edema*','pie* hinchad*'],
  dolor_abd:['dolor* abdom*','dolor* estomago','dolor* barriga','dolor* panza','dolor* bientre','colico*','dolor* bajit*','dolor* lado derecho','dolor* boca del estomago'],
  sangre_digestiva:['vomit* sangre','hematemesis','melena','hese* negr*','evacuacion* negr*','sangrado digestiv*','popo negr*','caca negr*','rectorragi*','sangre heces'],
  sincope:['desmay*','desbanec*','se fue de lado','sincope','perdio el sentido','ya reacciono','ya esta despiert*','se recupero','lipotimi*','se le fue el mundo'],
  palpitaciones:['palpitac*','corazon acelerad*','corazon rapid*','taquicardi*','pulso irregular','arritmi*','bradicardi*','pulso lento','marcapas*','se le sale el corazon'],
  conducta:['agresiv*','agitad*','biolent*','escucha voses','alusina*','psikiatr*','psiquiatr*','incoheren*','esquisofren*','bipolar','fuera de si','descontrolad*'],
  suicida:['suisid*','matarse','quitarse la vida','se corto las venas','ahork*','se colgo','se quiere morir','autolesion*','autolitic*'],
  infeccion:['infecc*','infeksion*','orina mal olor','ardor al orinar','herida infectada','pus','encamad*','decaid*','postrad*','sepsis'],
  meningeo:['rigidez nuca','rigides nuca','cuello rigid*','nuca rigid*','mancha* morad*','petequi*','no puede bajar la cabeza','le molesta la lus'],
  ansiedad:['panico','ansiedad','ansios*','nervios*','hormigue*','manos engarrotad*','hiperventil*','crisis nerviosa','discusion','susto'],
  dolor_espalda_subito:['desgarr*','dolor* espalda subit*','dolor* lumbar subit*','masa que late','masa pulsatil','aneurism*','disecc*'],
  frio:['hipotermi*','mucho frio','temblando de frio','agua fria','mojad*'],
  fatiga:['cansanci*','cansad*','agotad*','debilidad general','sin fuerzas','decaimiento'],
  anticoagulante:['anticoagul*','warfarin*','rivaroxab*','apixab*','clopidogrel'],
  ectopico:['retraso menstrual','no le ha venido la regla','atraso*','ectopic*'],
};

// Números asociados: glicemia, presión, temperatura, saturación.
function numeros(toks){
  const s=new Set();const txt=toks.map(t=>t.w).join(' ');
  const m=(re)=>[...txt.matchAll(re)].map(x=>+x[1]);
  for(const v of m(/(?:glicemia|glucemia|glucosa|azucar|hgt|glucometro)\D{0,20}?(\d{2,3})/g)){if(v<70)s.add('glucosa_baja');if(v>250)s.add('glucosa_alta');}
  for(const v of m(/(?:presion|pa|tension)\D{0,12}?(\d{2,3})/g)){if(v>=180)s.add('hta');if(v<90&&v>=40)s.add('palidez');}
  for(const v of m(/(?:temperatura|fiebre|temp)\D{0,12}?(\d{2})/g)){if(v>=38&&v<=43)s.add('fiebre');if(v<35&&v>=25)s.add('frio');}
  for(const v of m(/(?:saturacion|spo2|saturando|oximetro)\D{0,12}?(\d{2,3})/g)){if(v<92)s.add('disnea');}
  return s;
}

// Detecta todas las señales; devuelve {señal: frase encontrada}.
export function detectarSenales(texto){
  const toks=preparar(texto);
  const out={};
  for(const [k,frases] of Object.entries(SENALES)){
    for(const f of frases){const h=buscarFrase(toks,f);if(h){out[k]=h;break;}}
  }
  for(const k of numeros(toks))if(!out[k])out[k]='(valor medido)';
  return out;
}
// Para usar desde otros módulos con las mismas reglas (frases sueltas).
export function contieneFrase(texto,frase){return !!buscarFrase(preparar(texto),frase);}
export {buscarFrase};
