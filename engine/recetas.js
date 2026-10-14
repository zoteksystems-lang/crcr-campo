// Recetas con gramos por porción calculados para TI: según las calorías de un
// tiempo de comida de tu plan (o de tu perfil) y con los datos nutricionales
// de los productos que compraste (si escaneaste el yogur Dos Pinos, se usa la
// etiqueta de ese yogur; si no, un valor de referencia).
import {chocaConPlan} from './plan.js';

// Valores de referencia por 100 g (USDA FoodData Central, redondeados).
// k=kcal, p=proteína, c=carbohidratos, g=grasa, f=fibra, u=gramos por unidad.
export const ALIMENTOS={
  avena:{n:'Avena en hojuelas',k:380,p:13,c:66,g:7,f:10,buscar:['avena'],no:['bebida','galleta','barra']},
  yogurGriego:{n:'Yogur griego natural',k:59,p:10,c:3.6,g:0.4,f:0,buscar:['yogur griego','yogurt griego','griego']},
  huevo:{n:'Huevo',k:143,p:12.6,c:0.7,g:9.5,f:0,u:50,un:'huevo',buscar:['huevo']},
  clara:{n:'Claras de huevo',k:52,p:11,c:0.7,g:0.2,f:0,u:33,un:'clara',buscar:['clara']},
  pollo:{n:'Pechuga de pollo cocida',k:165,p:31,c:0,g:3.6,f:0,buscar:['pechuga','pollo']},
  atun:{n:'Atún en agua (escurrido)',k:116,p:26,c:0,g:0.8,f:0,buscar:['atun en agua','atun']},
  pescado:{n:'Pescado blanco (tilapia) cocido',k:128,p:26,c:0,g:2.7,f:0,buscar:['tilapia','pescado','corvina','filete']},
  carneMagra:{n:'Carne molida magra cocida',k:217,p:26,c:0,g:12,f:0,buscar:['carne molida','molida']},
  frijoles:{n:'Frijoles negros cocidos',k:132,p:8.9,c:23.7,g:0.5,f:8.7,buscar:['frijol']},
  arrozIntegral:{n:'Arroz integral cocido',k:123,p:2.7,c:25.6,g:1,f:1.6,buscar:['arroz integral','arroz']},
  tortilla:{n:'Tortilla de maíz',k:218,p:5.7,c:44.6,g:2.9,f:6.3,u:30,un:'tortilla',buscar:['tortilla']},
  panIntegral:{n:'Pan integral',k:250,p:12,c:43,g:3.5,f:7,u:28,un:'rebanada',buscar:['pan integral','pan de molde integral','pan cuadrado integral']},
  papa:{n:'Papa cocida',k:87,p:1.9,c:20,g:0.1,f:1.8,buscar:['papa']},
  camote:{n:'Camote cocido',k:90,p:2,c:20.7,g:0.2,f:3.3,buscar:['camote']},
  banano:{n:'Banano',k:89,p:1.1,c:22.8,g:0.3,f:2.6,u:120,un:'banano',buscar:['banano']},
  fresa:{n:'Fresas',k:32,p:0.7,c:7.7,g:0.3,f:2,buscar:['fresa']},
  papaya:{n:'Papaya',k:43,p:0.5,c:10.8,g:0.3,f:1.7,buscar:['papaya']},
  manzana:{n:'Manzana',k:52,p:0.3,c:13.8,g:0.2,f:2.4,u:180,un:'manzana',buscar:['manzana']},
  lechuga:{n:'Lechuga',k:15,p:1.4,c:2.9,g:0.2,f:1.3,buscar:['lechuga']},
  tomate:{n:'Tomate',k:18,p:0.9,c:3.9,g:0.2,f:1.2,buscar:['tomate']},
  pepino:{n:'Pepino',k:15,p:0.7,c:3.6,g:0.1,f:0.5,buscar:['pepino']},
  brocoli:{n:'Brócoli',k:34,p:2.8,c:6.6,g:0.4,f:2.6,buscar:['brocoli']},
  zanahoria:{n:'Zanahoria',k:41,p:0.9,c:9.6,g:0.2,f:2.8,buscar:['zanahoria']},
  chayote:{n:'Chayote',k:19,p:0.8,c:4.5,g:0.1,f:1.7,buscar:['chayote']},
  espinaca:{n:'Espinaca',k:23,p:2.9,c:3.6,g:0.4,f:2.2,buscar:['espinaca']},
  hongos:{n:'Hongos',k:22,p:3.1,c:3.3,g:0.3,f:1,buscar:['hongo','champinon']},
  cebolla:{n:'Cebolla y chile dulce',k:36,p:1,c:8,g:0.2,f:1.7,buscar:['cebolla']},
  aguacate:{n:'Aguacate',k:160,p:2,c:8.5,g:14.7,f:6.7,buscar:['aguacate']},
  aceite:{n:'Aceite de oliva',k:884,p:0,c:0,g:100,f:0,buscar:['aceite de oliva','aceite']},
  leche:{n:'Leche descremada',k:34,p:3.4,c:5,g:0.1,f:0,buscar:['leche descremada','leche'],no:['condensada','evaporada','polvo','chocolate','fresa','saborizada']},
  mani:{n:'Maní sin sal',k:567,p:26,c:16,g:49,f:8.5,buscar:['mani'],no:['mantequilla','crema','confitado','garapinado']},
  manteqMani:{n:'Mantequilla de maní natural',k:588,p:25,c:20,g:50,f:6,buscar:['mantequilla de mani','crema de mani']},
  chia:{n:'Semillas de chía',k:486,p:17,c:42,g:31,f:34,buscar:['chia']},
  proteinaPolvo:{n:'Proteína en polvo (whey)',k:400,p:80,c:8,g:6,f:0,buscar:['proteina','whey']},
  cottage:{n:'Queso cottage',k:98,p:11,c:3.4,g:4.3,f:0,buscar:['cottage','requeson']}
};

// Ingredientes: [alimento, gramos base, fijo?]. Los fijos (aceite, condimentos)
// no se escalan con la porción.
export const RECETAS=[
  {id:'avena-noche',n:'Avena nocturna con yogur griego y fresas',comida:'desayuno',min:5,
    ing:[['avena',40],['yogurGriego',150],['fresa',80],['chia',5,true]],
    pasos:['Mezcla avena, yogur y chía en un frasco.','Pon las fresas encima.','Refrigera toda la noche (o mínimo 2 h).']},
  {id:'pinto',n:'Gallo pinto ligero con huevo',comida:'desayuno',min:15,
    ing:[['arrozIntegral',80],['frijoles',80],['huevo',100],['cebolla',30],['tomate',50],['aceite',3,true]],
    pasos:['Sofríe cebolla y chile con el aceite.','Agrega frijoles y arroz; mezcla 3 min.','Huevos revueltos o cocidos aparte. Tomate picado al lado.']},
  {id:'omelette',n:'Omelette de claras con vegetales y tortilla',comida:'desayuno',min:10,
    ing:[['clara',150],['huevo',50],['espinaca',40],['hongos',40],['tomate',50],['tortilla',30],['aceite',3,true]],
    pasos:['Saltea hongos y espinaca 2 min.','Bate claras y huevo, viértelos y cocina tapado a fuego bajo.','Acompaña con la tortilla y el tomate.']},
  {id:'bowl-yogur',n:'Bowl de yogur con papaya y maní',comida:'merienda',min:3,
    ing:[['yogurGriego',170],['papaya',120],['mani',10]],
    pasos:['Sirve el yogur, la papaya picada y el maní encima.']},
  {id:'manzana-mani',n:'Manzana con mantequilla de maní',comida:'merienda',min:2,
    ing:[['manzana',150],['manteqMani',15]],
    pasos:['Corta la manzana en gajos y úntalos con la mantequilla de maní.']},
  {id:'batido',n:'Batido de proteína con banano y avena',comida:'merienda',min:3,
    ing:[['proteinaPolvo',30],['leche',250],['banano',100],['avena',20]],
    pasos:['Licúa todo con hielo.']},
  {id:'casado',n:'Casado ligero de pollo',comida:'almuerzo',min:25,
    ing:[['pollo',120],['arrozIntegral',100],['frijoles',80],['chayote',80],['lechuga',40],['tomate',40],['aceite',5,true]],
    pasos:['Pollo a la plancha con sal y especias.','Picadillo de chayote salteado con el aceite.','Sirve con arroz, frijoles y ensalada.']},
  {id:'ensalada-atun',n:'Ensalada de atún con aguacate',comida:'almuerzo',min:10,
    ing:[['atun',100],['lechuga',60],['tomate',60],['pepino',60],['aguacate',30],['frijoles',60],['aceite',5,true]],
    pasos:['Escurre el atún.','Pica los vegetales y mezcla con frijoles.','Aliña con aceite de oliva, limón y sal.']},
  {id:'pescado-camote',n:'Pescado con camote y brócoli',comida:'cena',min:25,
    ing:[['pescado',130],['camote',120],['brocoli',100],['aceite',5,true]],
    pasos:['Hornea o cocina el camote en trozos (20 min).','Pescado a la plancha con limón.','Brócoli al vapor 5 min.']},
  {id:'picadillo',n:'Picadillo de chayote con carne y tortillas',comida:'cena',min:25,
    ing:[['carneMagra',90],['chayote',150],['zanahoria',40],['cebolla',20],['tortilla',60]],
    pasos:['Dora la carne con la cebolla.','Agrega chayote y zanahoria en cubitos; tapa 10 min.','Sirve con tortillas tostadas.']},
  {id:'sandwich-pollo',n:'Sándwich integral de pollo',comida:'almuerzo',min:10,
    ing:[['panIntegral',56],['pollo',80],['lechuga',20],['tomate',40],['aguacate',25]],
    pasos:['Desmecha el pollo y mézclalo con aguacate machacado.','Arma el sándwich con lechuga y tomate.']},
  {id:'tostadas-aguacate',n:'Tostadas de aguacate y huevo',comida:'desayuno',min:10,
    ing:[['panIntegral',56],['aguacate',40],['huevo',100],['tomate',40]],
    pasos:['Tuesta el pan.','Unta el aguacate, pon el huevo cocido o pochado y el tomate.']},
  {id:'sopa-pollo',n:'Sopa de pollo con vegetales',comida:'cena',min:35,
    ing:[['pollo',100],['papa',80],['zanahoria',50],['chayote',80],['cebolla',20]],
    pasos:['Hierve el pollo con cebolla 15 min.','Agrega papa, zanahoria y chayote; 15 min más.','Desmecha el pollo y sirve.']},
  {id:'cottage-fruta',n:'Cottage con fresas y chía',comida:'merienda',min:3,
    ing:[['cottage',150],['fresa',100],['chia',5,true]],
    pasos:['Sirve el cottage con las fresas y la chía.']}
];

function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}

// Busca en lo que compraste (productos guardados con datos por 100 g) el
// producto que corresponde a un alimento de la receta.
// Procesados que comparten nombre con un alimento base ("jamón de pollo") no cuentan.
const NO_ES_BASE=['jamon','salchicha','mortadela','nugget','empanizad','sopa instantanea','galleta','cereal'];
export function buscarEnDespensa(clave,despensa){
  const a=ALIMENTOS[clave];
  const vale=x=>{
    const n=norm(x.nombre);
    return x.datos&&x.datos.kcal>0&&!NO_ES_BASE.concat(a.no||[]).some(w=>n.includes(w));
  };
  for(const termino of a.buscar){
    const p=despensa.find(x=>vale(x)&&norm(x.nombre).includes(termino));
    if(p)return p;
  }
  return null;
}

function redondear(g){return g<20?Math.round(g):Math.round(g/5)*5;}

// Calcula la receta para unas calorías objetivo. Devuelve ingredientes con
// gramos, de dónde salen los datos (tu producto o referencia) y los totales.
export function calcularReceta(receta,{kcalObjetivo=450,despensa=[],plan=null}={}){
  const filas=receta.ing.map(([clave,base,fijo])=>{
    const ref=ALIMENTOS[clave];
    const prod=buscarEnDespensa(clave,despensa);
    const d=prod?{k:prod.datos.kcal,p:prod.datos.proteina??ref.p,c:prod.datos.carbos??ref.c,g:prod.datos.grasa??ref.g,f:prod.datos.fibra??ref.f}:ref;
    return{clave,base,fijo:!!fijo,ref,prod,d};
  });
  const kcalDe=(f,g)=>f.d.k*g/100;
  const fijas=filas.filter(f=>f.fijo).reduce((s,f)=>s+kcalDe(f,f.base),0);
  const variables=filas.filter(f=>!f.fijo).reduce((s,f)=>s+kcalDe(f,f.base),0);
  const factor=Math.min(2.5,Math.max(0.4,(kcalObjetivo-fijas)/variables));
  const tot={k:0,p:0,c:0,g:0,f:0};
  const ingredientes=filas.map(f=>{
    const gramos=redondear(f.fijo?f.base:f.base*factor);
    for(const x of ['k','p','c','g','f'])tot[x]+=(f.d[x]||0)*gramos/100;
    const unidades=f.ref.u?Math.round(gramos/f.ref.u*2)/2:null;
    const choque=chocaConPlan(`${f.ref.n} ${f.prod?.nombre||''}`,plan);
    return{clave:f.clave,nombre:f.prod?.nombre||f.ref.n,gramos,unidades,unidad:f.ref.un,
      deTuCompra:!!f.prod,choque};
  });
  const choques=ingredientes.filter(i=>i.choque);
  return{...receta,factor,ingredientes,total:Object.fromEntries(Object.entries(tot).map(([k,v])=>[k,Math.round(v)])),
    deTuCompra:ingredientes.filter(i=>i.deTuCompra).length,choques};
}

// Recetas ordenadas: primero las que usan más cosas que compraste y no chocan
// con tu plan.
export function sugerirRecetas({comida=null,...opciones}={}){
  return RECETAS.filter(r=>!comida||r.comida===comida)
    .map(r=>calcularReceta(r,opciones))
    .sort((a,b)=>(a.choques.length-b.choques.length)||(b.deTuCompra-a.deTuCompra));
}
