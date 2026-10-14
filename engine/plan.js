// Plan de nutrición personal — se sube el plan del nutricionista (PDF, foto o
// texto) o se arma a mano, y cada producto escaneado se juzga contra ESE plan:
// calorías por tiempo de comida, límites diarios de azúcar y sal, macros,
// condiciones (diabetes, hipertensión, sin gluten, keto…) y las listas de
// "evitar" / "preferir" del propio plan. 100% local.

const CLAVE='crcr-nutricion-plan';

export const CONDICIONES={
  diabetes:{nombre:'Diabetes / control de azúcar',re:/diabet|glucosa alta|glicemia|insulin|prediabet|resistencia a la insulina/},
  hipertension:{nombre:'Hipertensión / bajo en sodio',re:/hipertens|presion alta|presion arterial|bajo en sodio|baja en sodio|hiposodic|\bdash\b/},
  sinGluten:{nombre:'Sin gluten',re:/celiac|sin gluten|libre de gluten|gluten free|intoleran\w* al gluten/},
  sinLactosa:{nombre:'Sin lactosa',re:/intoleran\w* a la lactosa|sin lactosa|libre de lactosa/},
  keto:{nombre:'Keto / cetogénica',re:/\bketo\b|cetogenic/},
  bajoCarbos:{nombre:'Bajo en carbohidratos',re:/baj[ao] en carbohidratos|low carb|baj[ao] en hidratos|restriccion de carbohidratos/},
  altoProteina:{nombre:'Alto en proteína',re:/hiperproteic|alt[ao] en proteina|rica en proteina/},
  vegetariano:{nombre:'Vegetariano / vegano',re:/vegetarian|vegan/}
};

// Palabras que suelen aparecer en las listas de "evitar" de los planes y cómo
// reconocerlas en un producto (nombre, ingredientes o categorías de la base).
const SINONIMOS={
  gaseosa:['gaseosa','refresco','soda','cola','bebida azucarada','en:sodas'],
  refresco:['gaseosa','refresco','soda','cola','en:sodas'],
  'bebidas azucaradas':['gaseosa','refresco','soda','cola','jugo','nectar','te frio','bebida','en:sweetened-beverages','en:sodas'],
  jugo:['jugo','nectar','zumo','en:juices','en:fruit-juices'],
  embutido:['jamon','salchicha','mortadela','chorizo','salami','salchichon','tocino','pepperoni','en:sausages','en:hams','en:prepared-meats'],
  galleta:['galleta','cookie','en:biscuits','en:cookies'],
  frituras:['frito','frita','papas tostadas','chips','snack','tortilla chips','en:chips','en:salty-snacks'],
  snack:['snack','chips','papas tostadas','frituras','en:salty-snacks'],
  dulce:['dulce','confite','golosina','caramelo','chocolate','gomita','en:confectioneries','en:candies','en:chocolates'],
  golosina:['confite','golosina','caramelo','chocolate','gomita','en:confectioneries','en:candies'],
  'pan blanco':['pan blanco','pan cuadrado blanco','pan de molde blanco'],
  reposteria:['queque','pastel','reposteria','bizcocho','donas','pan dulce','en:cakes','en:pastries'],
  alcohol:['cerveza','vino','licor','ron','guaro','vodka','en:alcoholic-beverages'],
  enlatado:['enlatado','lata','conserva','en:canned-foods'],
  'comida rapida':['hamburguesa','pizza','hot dog','nuggets'],
  azucar:['azucar'],
  harina:['harina'],
  cereal:['cereal','en:breakfast-cereals']
};

function norm(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
}

// "1.500" → 1500 · "1,5" → 1.5 · "1,500" → 1500 · "2.5" → 2.5
export function numeroPlan(s){
  const t=String(s).trim();
  if(/^\d{1,2}[.,]\d{3}$/.test(t))return parseFloat(t.replace(/[.,]/,''));
  return parseFloat(t.replace(',','.'));
}

const NUM='(\\d+(?:[.,]\\d+)?)';
const MACROS={
  proteina:{re:'proteinas?',rango:[20,350],kcalG:4},
  carbos:{re:'(?:carbohidratos?|hidratos de carbono|carbs|\\bcho\\b)',rango:[10,600],kcalG:4},
  grasa:{re:'(?:grasas? totales|grasas?|lipidos)',rango:[10,250],kcalG:9},
  fibra:{re:'fibra',rango:[10,80]},
  azucar:{re:'azucar(?:es)?(?: anadidos?| libres?)?',rango:[5,100]},
  sodio:{re:'sodio',rango:[500,5000]},
  sal:{re:'sal\\b',rango:[1,10]}
};

// Valor de un macro: "proteína: 120 g", "120 g de proteína", "proteína 25 %".
function buscarMacro(lineas,clave){
  const m=MACROS[clave];
  const unidad=clave==='sodio'?'(mg|g)':'(g|gr|gramos|%)';
  const a=new RegExp(`${m.re}[^0-9%\\n]{0,30}?${NUM}\\s*${unidad}`);
  const b=new RegExp(`${NUM}\\s*${unidad}\\s*(?:de\\s+|por dia de\\s+)?${m.re}`);
  // Preferir líneas que hablan del total diario, no de un tiempo de comida.
  const orden=[...lineas].sort((x,y)=>(/dia|diari|total|meta|objetivo|requer/.test(y)?1:0)-(/dia|diari|total|meta|objetivo|requer/.test(x)?1:0));
  for(const l of orden){
    if(clave==='sal'&&/sin sal|sal marina|salsa/.test(l)&&!/\bsal\b\s*[:<≤]/.test(l))continue;
    const r=l.match(a)||l.match(b);
    if(!r)continue;
    let v=numeroPlan(r[1]);const u=r[2];
    if(u==='%')return{pct:v};
    if(clave==='sodio'&&u==='g')v*=1000;
    if(v>=m.rango[0]&&v<=m.rango[1])return{g:v};
  }
  return null;
}

function extraerLista(lineas,cabecera){
  const items=[];
  for(let i=0;i<lineas.length;i++){
    const l=lineas[i];
    const m=l.match(cabecera);
    if(!m)continue;
    const resto=l.slice(m.index+m[0].length).replace(/^[\s:.\-–]+/,'');
    const trozos=[resto];
    // Viñetas en las líneas siguientes, hasta otra cabecera o línea vacía.
    for(let j=i+1;j<lineas.length&&j<i+25;j++){
      const s=lineas[j];
      if(!s.trim()||/:\s*$/.test(s)||/^(evitar|no consumir|prohibid|restringid|limitar|permitid|preferir|recomendad|incluir|desayuno|almuerzo|cena|merienda|refrigerio|colacion|meriendas?)\b/.test(s.trim()))break;
      if(/^\s*([-•*·▪●✓✔]|\d+[.)])\s*/.test(s)||s.length<45)trozos.push(s.replace(/^\s*([-•*·▪●✓✔]|\d+[.)])\s*/,''));
      else break;
    }
    for(const t of trozos)for(const it of t.split(/[,;•·]|\sy\s|\so\s/)){
      const x=it.replace(/\(.*?\)/g,'').replace(/[.:]+$/,'').trim();
      if(x.length>=3&&x.length<=40&&!items.includes(x))items.push(x);
    }
  }
  return items;
}

export function parsearPlan(texto){
  const lineas=String(texto||'').split(/\n+/).map(norm).map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean);
  const todo=lineas.join('\n');
  const plan={kcal:null,comidas:null,proteina:null,carbos:null,grasa:null,fibra:null,azucarMax:null,salMax:null,condiciones:{},evitar:[],preferir:[]};

  // Calorías del día: números de 800–5000 kcal, mejor en una línea de total/día.
  const cands=[];
  lineas.forEach(l=>{
    for(const m of l.matchAll(/(\d{1,2}[.,]\d{3}|\d{3,4})\s*(kcal|calorias|cal\b|kilocalorias)/g)){
      const v=numeroPlan(m[1]);
      if(v>=800&&v<=5000)cands.push({v,pref:/dia|diari|total|meta|objetivo|requer|plan|dieta/.test(l)});
    }
    const m2=l.match(/(?:calorias|kcal|energia)[^0-9\n]{0,25}(\d{1,2}[.,]\d{3}|\d{3,4})\b/);
    if(m2){const v=numeroPlan(m2[1]);if(v>=800&&v<=5000)cands.push({v,pref:/dia|diari|total|meta|objetivo|requer|plan|dieta/.test(l)});}
  });
  const kc=cands.find(c=>c.pref)||cands[0];
  if(kc)plan.kcal=kc.v;

  // Tiempos de comida: "5 tiempos de comida" o contar las cabeceras del menú.
  const mc=todo.match(/(\d)\s*(?:tiempos de comida|tiempos|comidas al dia|comidas)/);
  if(mc&&+mc[1]>=2&&+mc[1]<=8)plan.comidas=+mc[1];
  else{
    const cab=lineas.filter(l=>l.length<=40&&/^(desayuno|merienda|media manana|almuerzo|comida|cena|refrigerio|colacion|snack)\b/.test(l));
    if(cab.length>=2)plan.comidas=Math.min(8,new Set(cab.map(l=>l.replace(/[^a-z ]/g,'').trim())).size||cab.length);
  }

  for(const k of ['proteina','carbos','grasa','fibra']){
    const r=buscarMacro(lineas,k);
    if(!r)continue;
    if(r.g!==undefined)plan[k]=r.g;
    else if(r.pct&&plan.kcal&&MACROS[k].kcalG)plan[k]=Math.round(plan.kcal*r.pct/100/MACROS[k].kcalG);
  }
  const az=buscarMacro(lineas,'azucar');if(az?.g)plan.azucarMax=az.g;
  const sod=buscarMacro(lineas,'sodio');
  const sal=buscarMacro(lineas,'sal');
  if(sal?.g)plan.salMax=sal.g;
  else if(sod?.g)plan.salMax=Math.round(sod.g/1000*2.5*100)/100;

  for(const [k,c] of Object.entries(CONDICIONES))if(c.re.test(todo))plan.condiciones[k]=true;
  if(plan.condiciones.keto)plan.condiciones.bajoCarbos=true;

  plan.evitar=extraerLista(lineas,/(?:^|\b)(alimentos a evitar|evitar|no consumir|prohibidos?|restringidos?|limitar|no permitidos?)\b/);
  plan.preferir=extraerLista(lineas,/(?:^|\b)(alimentos permitidos|permitidos?|preferir|recomendados?|libre consumo|incluir)\b/)
    .filter(x=>!plan.evitar.includes(x));
  return plan;
}

// --- Guardar / leer ---------------------------------------------------------
export function leerPlan(){try{return JSON.parse(localStorage.getItem(CLAVE));}catch{return null;}}
export function guardarPlan(plan){try{localStorage.setItem(CLAVE,JSON.stringify(plan));}catch{}}
export function borrarPlan(){try{localStorage.removeItem(CLAVE);}catch{}}

export function resumenPlan(p){
  if(!p)return'';
  const partes=[];
  if(p.kcal)partes.push(`${p.kcal} kcal/día`);
  if(p.comidas)partes.push(`${p.comidas} comidas`);
  for(const [k,n] of [['proteina','prot'],['carbos','carbs'],['grasa','grasa']])if(p[k])partes.push(`${p[k]} g ${n}`);
  for(const k of Object.keys(p.condiciones||{}))if(p.condiciones[k])partes.push(CONDICIONES[k].nombre.split(' /')[0].toLowerCase());
  return partes.join(' · ');
}

// --- Juzgar un producto contra el plan --------------------------------------
function contiene(texto,termino){
  const t=norm(termino).trim();
  if(!t)return false;
  if(t.startsWith('en:'))return texto.includes(t);
  const raiz=t.replace(/(es|s)$/,'');
  return new RegExp(`(^|[^a-z])${raiz.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(es|s)?([^a-z]|$)`).test(texto);
}
function coincide(item,texto){
  const n=norm(item).replace(/(es|s)$/,'');
  const clave=Object.keys(SINONIMOS).find(k=>n===k||n===k.replace(/(es|s)$/,'')||n.startsWith(k));
  const terminos=clave?[item,...SINONIMOS[clave]]:[item];
  return terminos.some(t=>contiene(texto,t));
}

const ORDEN={encaja:0,cuidado:1,no:2};
// d = valores por 100 g/ml (kcal, grasa, saturada, azucar, sal, fibra, proteina, carbos)
// ctx = {porcion, nombre, ingredientes, categorias, tipo, colores:{grasa,saturada,azucar,sal}}
export function evaluarConPlan(d,plan,ctx={}){
  const razones=[],positivos=[];
  let estado='encaja';
  const subir=(e,txt)=>{if(ORDEN[e]>ORDEN[estado])estado=e;razones.push({e,txt});};
  const c=plan.condiciones||{};
  const u=ctx.tipo==='bebida'?'ml':'g';
  const porc=ctx.porcion>0?ctx.porcion:100;
  const sinPorcion=!(ctx.porcion>0);
  const enPorc=v=>v===null||v===undefined?null:v*porc/100;
  const texto=norm([ctx.nombre,ctx.ingredientes,(ctx.categorias||[]).join(' ')].join(' '));
  const ingr=norm(ctx.ingredientes||'');

  // Semáforo general, sin castigar la grasa en planes keto / bajos en carbohidratos.
  const col=ctx.colores||{};
  const claves=c.bajoCarbos?['azucar','sal']:['grasa','saturada','azucar','sal'];
  const NOM={grasa:'grasas',saturada:'grasas saturadas',azucar:'azúcares',sal:'sal'};
  const rojos=claves.filter(k=>col[k]==='rojo').map(k=>NOM[k]);
  if(rojos.length>=2)subir('no',`Semáforo: ${rojos.length} nutrientes en rojo (${rojos.join(', ')}).`);
  else if(rojos.length===1)subir('cuidado',`Semáforo: ${rojos[0]} en rojo.`);

  const comidas=plan.comidas||4;
  const kcalComida=plan.kcal?plan.kcal/comidas:null;
  let porcionMax=null;
  if(kcalComida&&d.kcal>0){
    porcionMax=Math.round(kcalComida*0.5*100/d.kcal); // que no pase de media comida
    const k=enPorc(d.kcal),pct=Math.round(k/kcalComida*100);
    if(pct>150)subir('no',`${sinPorcion?'100 '+u:'La porción'} = ${Math.round(k)} kcal: ${pct}% de un tiempo de comida (${Math.round(kcalComida)} kcal).`);
    else if(pct>100)subir('cuidado',`${sinPorcion?'100 '+u:'La porción'} ocupa un tiempo de comida completo (${pct}%).`);
  }

  const lim=(clave,max,nombre,unidad='g')=>{
    if(!max||d[clave]===null||d[clave]===undefined)return;
    const v=enPorc(d[clave]),pct=Math.round(v/max*100);
    if(pct>50)subir('no',`${nombre}: ${String(Math.round(v*10)/10).replace('.',',')} ${unidad} = ${pct}% de tu límite del día (${max} ${unidad}).`);
    else if(pct>25)subir('cuidado',`${nombre}: ${pct}% de tu límite del día en una sola porción.`);
  };
  lim('azucar',plan.azucarMax||(c.diabetes?25:null),'Azúcar');
  lim('sal',plan.salMax||(c.hipertension?3.75:null),'Sal');
  if(c.diabetes&&d.azucar!=null){
    if(d.azucar>10)subir('no',`Plan para control de azúcar: ${d.azucar} g de azúcar por 100 ${u} es mucho.`);
    else if(d.azucar>5)subir('cuidado','Plan para control de azúcar: azúcar moderada, cuida la porción.');
  }
  if(c.hipertension&&d.sal!=null&&d.sal>1.25)subir('no',`Plan bajo en sodio: ${Math.round(d.sal*100)/100} g de sal por 100 ${u} es alto.`);

  if(d.carbos!=null){
    const neto=Math.max(0,d.carbos-(d.fibra||0)),netoP=enPorc(neto);
    if(c.keto){
      if(netoP>10)subir('no',`Keto: ${Math.round(netoP)} g de carbohidratos netos en la porción.`);
      else if(netoP>5)subir('cuidado',`Keto: ${Math.round(netoP)} g de carbohidratos netos; cuenta con ellos.`);
    }else if(plan.carbos){
      const pct=Math.round(enPorc(d.carbos)/plan.carbos*100);
      if(pct>40)subir('no',`Carbohidratos: ${pct}% de los del día en una porción.`);
      else if(pct>(c.bajoCarbos?15:25))subir('cuidado',`Carbohidratos: ${pct}% de los del día en una porción.`);
    }else if(c.bajoCarbos&&d.carbos>30)subir('cuidado',`Plan bajo en carbohidratos: ${d.carbos} g por 100 ${u}.`);
  }
  if(plan.grasa&&d.grasa!=null&&!c.keto){
    const pct=Math.round(enPorc(d.grasa)/plan.grasa*100);
    if(pct>35)subir('cuidado',`Grasa: ${pct}% de la del día en una porción.`);
  }
  if(d.proteina!=null&&d.kcal>0){
    const dens=d.proteina*4/d.kcal;
    if(dens>=0.25)positivos.push(`Rico en proteína (${Math.round(dens*100)}% de sus calorías)${plan.proteina?`: la porción aporta ${Math.round(enPorc(d.proteina))} de tus ${plan.proteina} g del día`:''}.`);
    else if(c.altoProteina&&dens<0.1)subir('cuidado','Tu plan es alto en proteína y este producto casi no aporta.');
  }
  if(plan.fibra&&d.fibra>=3)positivos.push(`Aporta ${Math.round(enPorc(d.fibra)*10)/10} g de tus ${plan.fibra} g de fibra.`);

  // Restricciones por ingredientes.
  const sinTexto=!ingr;
  if(c.sinGluten){
    if(/sin gluten|libre de gluten|gluten free/.test(texto))positivos.push('Dice "sin gluten".');
    else if(/trigo|cebada|centeno|malta|gluten|semola|espelta|seitan/.test(texto))subir('no','Tu plan es sin gluten y este producto lleva trigo, cebada, centeno o malta.');
    else if(sinTexto)razones.push({e:'info',txt:'Sin gluten: no tengo los ingredientes; confirma en el empaque.'});
  }
  if(c.sinLactosa){
    if(/deslactosad|sin lactosa|libre de lactosa/.test(texto))positivos.push('Sin lactosa.');
    else if(/leche|lactosa|suero de leche|lacteo|crema de leche|queso|mantequilla/.test(texto))subir('no','Tu plan es sin lactosa y este producto lleva leche o derivados.');
    else if(sinTexto)razones.push({e:'info',txt:'Sin lactosa: no tengo los ingredientes; confirma en el empaque.'});
  }
  if(c.vegetariano&&/carne|pollo|\bres\b|cerdo|jamon|tocino|pescado|atun|camaron|gelatina|manteca de cerdo|en:meats/.test(texto))
    subir('no','Tu plan es vegetariano y este producto lleva carne, pescado o gelatina.');

  for(const it of plan.evitar||[])if(coincide(it,texto)){subir('no',`Tu plan dice evitar: "${it}".`);break;}
  for(const it of plan.preferir||[])if(coincide(it,texto)){positivos.push(`Tu plan lo recomienda: "${it}".`);break;}

  return{estado,razones,positivos,porcionMax,kcalComida,sinPorcion};
}

export const VEREDICTO_PLAN={
  encaja:{texto:'✅ APTO PARA TU PLAN',color:'verde'},
  cuidado:{texto:'🟡 CON CUIDADO EN TU PLAN',color:'ambar'},
  no:{texto:'❌ NO APTO PARA TU PLAN',color:'rojo'}
};

// ¿Este texto (nombre de alimento/receta) choca con la lista "evitar" del plan?
// Devuelve el elemento de la lista con el que choca, o null.
export function chocaConPlan(texto,plan){
  const t=norm(texto);
  for(const it of plan?.evitar||[])if(coincide(it,t))return it;
  return null;
}
export function recomendadoPorPlan(texto,plan){
  const t=norm(texto);
  for(const it of plan?.preferir||[])if(coincide(it,t))return it;
  return null;
}
