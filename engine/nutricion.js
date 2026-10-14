// Agente de Nutrición — semáforo nutricional (umbrales FSA Reino Unido, usados
// también en UE/España) por 100 g o 100 ml, y una clasificación por "tipo"
// (A/B/C/D) para decidir en el súper si un envasado sirve en una dieta para
// bajar de peso. 100% local, sin dependencias.
import {normalize} from './util.js';

// Umbrales por 100 g (sólidos) y por 100 ml (bebidas): [bajo ≤, alto >].
// Entre ambos es medio (ámbar).
export const UMBRALES={
  solido:{
    grasa:{bajo:3,alto:17.5},
    saturada:{bajo:1.5,alto:5},
    azucar:{bajo:5,alto:22.5},
    sal:{bajo:0.3,alto:1.5}
  },
  bebida:{
    grasa:{bajo:1.5,alto:8.75},
    saturada:{bajo:0.75,alto:2.5},
    azucar:{bajo:2.5,alto:11.25},
    sal:{bajo:0.3,alto:0.75}
  }
};

// Criterios extra "modo bajar de peso" (más estrictos que el semáforo oficial).
export const DIETA={
  // Sistemas estrictos: "alto en azúcares" > 12,5 g/100 g. Para bebidas se usa la
  // mitad (6,25 g/100 ml), la misma proporción que el umbral oficial 11,25 vs 22,5.
  azucarAlto:{solido:12.5,bebida:6.25},
  azucarIdealSolido:10,   // para bajar de peso, idealmente < 5–10 g
  salMax:1,               // evitar > 1 g sal/100 g
  kcalBaja:{solido:40,bebida:20},
  fibraFuente:3,
  fibraAlta:6,
  proteinaBuena:10
};

// Valores de referencia diarios (adulto, 2000 kcal).
export const IR={kcal:2000,grasa:70,saturada:20,azucar:90,sal:6};

export const NOMBRES={
  grasa:'Grasas totales',
  saturada:'Grasas saturadas',
  azucar:'Azúcares',
  sal:'Sal'
};

// Nombres con que aparecen el azúcar y la sal/sodio en la lista de ingredientes.
const AZUCARES=['azucar','jarabe de glucosa','jarabe de maiz','jarabe de fructosa','jarabe',
  'glucosa','fructosa','dextrosa','sacarosa','maltosa','lactosa anadida','maltodextrina',
  'miel','melaza','panela','tapa de dulce','dulce de cana','caramelo','concentrado de jugo',
  'zumo concentrado','azucar invertido','sirope','agave','extracto de malta','malta'];
const SALES=['sal','sodio','glutamato','glutamato monosodico','bicarbonato de sodio',
  'benzoato de sodio','nitrito de sodio','nitrato de sodio','fosfato de sodio',
  'citrato de sodio','caldo','extracto de levadura','salsa de soya','salsa de soja'];

export const TIPOS={
  A:{veredicto:'✅ APTO',titulo:'Tipo A — Apto',detalle:'Cumple los parámetros: compra habitual en dieta para bajar de peso.',color:'verde'},
  B:{veredicto:'🟡 APTO CON MODERACIÓN',titulo:'Tipo B — Permitido con moderación',detalle:'Sin rojos, pero con varios ámbar o alguna alerta de dieta. Porciones controladas.',color:'ambar'},
  C:{veredicto:'⚠️ NO APTO PARA EL DÍA A DÍA',titulo:'Tipo C — Ocasional',detalle:'Un nutriente en rojo. Solo de vez en cuando; mejor buscar alternativa.',color:'naranja'},
  D:{veredicto:'❌ NO APTO',titulo:'Tipo D — Evitar',detalle:'Dos o más nutrientes en rojo. Busca otra opción.',color:'rojo'}
};

function num(v){
  if(v===null||v===undefined||v==='')return null;
  const n=parseFloat(String(v).replace(',','.'));
  return isNaN(n)||n<0?null:n;
}

// Sodio (g) → sal (g): sal = sodio × 2,5.
export function salDesdeSodio(sodioG){
  const n=num(sodioG);
  return n===null?null:Math.round(n*2.5*1000)/1000;
}

export function semaforo(nutriente, valor, tipo='solido'){
  const v=num(valor);
  if(v===null)return null;
  const u=UMBRALES[tipo][nutriente];
  if(v<=u.bajo)return'verde';
  if(v>u.alto)return'rojo';
  return'ambar';
}

// Busca nombres de azúcar/sal en la lista de ingredientes. Devuelve qué encontró
// y si alguno de azúcar está entre los 3 primeros (= ingrediente principal).
export function analizarIngredientes(texto){
  const lista=(texto||'').split(/[,;()\[\]]+/).map(normalize).filter(Boolean);
  const buscar=(nombres)=>{
    const hallados=new Set();let primeraPos=-1;
    lista.forEach((ing,i)=>{
      for(const n of nombres){
        if(new RegExp(`(^| )${n}( |$)`).test(ing)){
          hallados.add(n);
          if(primeraPos<0)primeraPos=i;
        }
      }
    });
    // "jarabe de glucosa" ya cubre "jarabe" y "glucosa": no repetir.
    const unicos=[...hallados].filter(h=>![...hallados].some(o=>o!==h&&o.includes(h)));
    return{hallados:unicos,primeraPos};
  };
  const az=buscar(AZUCARES),sa=buscar(SALES);
  return{
    azucares:az.hallados,
    sales:sa.hallados,
    azucarPrincipal:az.primeraPos>=0&&az.primeraPos<3
  };
}

// p = {tipo:'solido'|'bebida', kcal, grasa, saturada, azucar, sal, sodio,
//      fibra, proteina, ingredientes}, todo por 100 g / 100 ml.
// opciones = {bajarPeso:true}
export function evaluar(p, opciones={}){
  const tipo=p.tipo==='bebida'?'bebida':'solido';
  const bajarPeso=opciones.bajarPeso!==false;
  const valores={
    grasa:num(p.grasa),
    saturada:num(p.saturada),
    azucar:num(p.azucar),
    sal:num(p.sal)!==null?num(p.sal):salDesdeSodio(p.sodio)
  };
  const kcal=num(p.kcal),fibra=num(p.fibra),proteina=num(p.proteina);

  const nutrientes={};
  for(const k of Object.keys(UMBRALES[tipo])){
    const color=semaforo(k,valores[k],tipo);
    nutrientes[k]={
      nombre:NOMBRES[k],
      valor:valores[k],
      color,
      pctIR:valores[k]===null?null:Math.round(valores[k]/IR[k]*100)
    };
  }

  const alertas=[],positivos=[];
  if(bajarPeso&&nutrientes.azucar.color==='ambar'){
    const alto=DIETA.azucarAlto[tipo];
    if(valores.azucar>alto){
      nutrientes.azucar.color='rojo';
      nutrientes.azucar.estricto=true;
      alertas.push(`Azúcares > ${alto} g/100 ${tipo==='bebida'?'ml':'g'}: "alto" según el criterio estricto para bajar de peso.`);
    }else if(tipo==='solido'&&valores.azucar>DIETA.azucarIdealSolido){
      alertas.push(`Azúcares entre ${DIETA.azucarIdealSolido} y ${alto} g: por encima de lo ideal para bajar de peso.`);
    }
  }
  if(bajarPeso&&valores.sal!==null&&valores.sal>DIETA.salMax&&nutrientes.sal.color==='ambar'){
    alertas.push(`Sal > ${DIETA.salMax} g/100: conviene limitar.`);
  }

  const ing=analizarIngredientes(p.ingredientes);
  if(ing.azucarPrincipal)alertas.push(`Un azúcar está entre los 3 primeros ingredientes (${ing.azucares.join(', ')}).`);

  let bonos=0;
  if(kcal!==null){
    if(kcal<=DIETA.kcalBaja[tipo]){bonos++;positivos.push(`Bajo en calorías (≤ ${DIETA.kcalBaja[tipo]} kcal/100 ${tipo==='bebida'?'ml':'g'}).`);}
  }
  if(fibra!==null){
    if(fibra>=DIETA.fibraAlta){bonos+=2;positivos.push(`Alto en fibra (≥ ${DIETA.fibraAlta} g).`);}
    else if(fibra>=DIETA.fibraFuente){bonos++;positivos.push(`Fuente de fibra (≥ ${DIETA.fibraFuente} g).`);}
  }
  if(proteina!==null&&proteina>=DIETA.proteinaBuena){bonos++;positivos.push(`Buena proteína (≥ ${DIETA.proteinaBuena} g): más saciedad.`);}

  const colores=Object.values(nutrientes).map(n=>n.color).filter(Boolean);
  const rojos=colores.filter(c=>c==='rojo').length;
  const ambar=colores.filter(c=>c==='ambar').length;
  const verdes=colores.filter(c=>c==='verde').length;
  const faltan=Object.values(nutrientes).filter(n=>n.color===null).map(n=>n.nombre);

  // Puntos: verde 0, ámbar 1, rojo 3; fibra/proteína/kcal baja restan.
  // Los rojos mandan: 2+ rojos = D, 1 rojo = C, sin importar los bonos.
  const puntos=ambar+rojos*3-bonos;
  let clase;
  if(colores.length===0)clase=null;
  else if(rojos>=2)clase='D';
  else if(rojos===1)clase='C';
  else if(puntos<=1&&alertas.length===0)clase='A';
  else clase='B';

  return{
    tipo,clase,...(clase?TIPOS[clase]:{titulo:'Sin datos',detalle:'Ingresa al menos un nutriente por 100 g / 100 ml.',color:null}),
    nutrientes,kcal,fibra,proteina,
    pctKcal:kcal===null?null:Math.round(kcal/IR.kcal*100),
    conteo:{verdes,ambar,rojos},
    puntos,alertas,positivos,ingredientes:ing,faltan,
    completo:faltan.length===0
  };
}

// ---------------------------------------------------------------------------
// Lectura de la tabla nutricional a partir del texto del OCR (Tesseract).
// Soporta el formato centroamericano/EE. UU. ("Tamaño de porción", "Calorías",
// "Grasa total", "Sodio … mg", %VD) y el europeo ("Valor energético kJ/kcal",
// "de las cuales saturadas", "Sal"), en español o inglés, con columna por
// 100 g / 100 ml o solo por porción. Devuelve solo lo que pudo leer.

// Orden importa: la primera regla que calce gana para cada línea.
const REGLAS_TABLA=[
  {campo:null,re:/\btrans\b|monoinsat|poliinsat|mono insat|poli insat|colesterol|cholesterol|potasio|potassium|calcio|calcium|hierro|iron|vitamina|vitamin/},
  {campo:'saturada',re:/saturad|saturated/},
  {campo:'grasa',re:/\bgrasas?\b|lipidos|\bfat\b/},
  {campo:'azucarAnadido',re:/anadid|added/},
  {campo:'azucar',re:/azucar|sugar/},
  {campo:'fibra',re:/fibra|fiber|fibre/},
  {campo:'proteina',re:/protein/},
  {campo:'carbos',re:/carbohidrat|hidratos de carbono|carbohydrate/},
  {campo:'sodio',re:/sodio|sodium/},
  {campo:'sal',re:/^sal\b|\bsal\b|\bsalt\b/},
  {campo:'kcal',re:/calori|energ|kcal|\bkj\b/}
];

function aNumero(s){return parseFloat(s.replace(',','.'));}

// Arregla confusiones típicas del OCR dentro de números: O→0, l/I→1, "5 g" leído "5g".
function limpiarLineaOCR(l){
  return l
    .replace(/calor[ií]as? de grasa\s*\d+([.,]\d+)?|calories from fat\s*\d+/gi,' ')
    .replace(/(\d)[oO](?=\d|\b|\s*(?:g|mg|kcal|kj)\b)/g,'$10')
    .replace(/\b[oO](?=[.,]\d)/g,'0')
    .replace(/(\d)[lI](?=\d)/g,'$11');
}

// Valores de una línea: números con su unidad, ignorando los %VD.
function valoresLinea(linea){
  const sinPct=linea.replace(/\d+(?:[.,]\d+)?\s*%/g,' ');
  const out=[];
  const re=/(<\s*)?(\d+(?:[.,]\d+)?)\s*(mg|g|kcal|kj|ml)?\b/gi;
  let m;
  while((m=re.exec(sinPct))){
    out.push({v:m[1]?0:aNumero(m[2]),u:(m[3]||'').toLowerCase()});
  }
  return out;
}

export function parsearTablaNutricional(texto){
  const lineas=(texto||'').split(/\n+/).map(l=>limpiarLineaOCR(l.trim())).filter(Boolean);
  const res={};
  let col=0,hay100=false,bebida=false;

  // Encabezado de columnas: ¿hay "100 g/ml"? ¿va antes o después de "porción"?
  for(const l of lineas){
    const n=normalize(l);
    const i100=n.search(/100\s*(g|ml|gr)\b/);
    if(i100<0)continue;
    hay100=true;
    if(/100\s*ml/.test(n))bebida=true;
    const iPor=n.search(/porcion|racion|serving|envase/);
    col=iPor>=0&&iPor<i100?1:0;
    break;
  }

  // Tamaño de porción (para convertir si no hay columna por 100).
  for(const l of lineas){
    const n=normalize(l);
    if(!/porcion|racion|serving size/.test(n))continue;
    const m=n.match(/(\d+(?:[ .]\d+)?)\s*(g|gr|ml)\b/);
    if(m){
      res.porcion=aNumero(m[1].replace(' ','.'));
      if(m[2]==='ml')bebida=true;
      break;
    }
  }

  for(const l of lineas){
    const n=normalize(l);
    const regla=REGLAS_TABLA.find(r=>r.re.test(n));
    if(!regla||!regla.campo)continue;
    const campo=regla.campo;
    if(res[campo]!==undefined)continue;
    let vals=valoresLinea(l).filter(x=>!(x.v===100&&/100\s*(g|ml)/i.test(l)));
    if(campo==='kcal'){
      const kcal=vals.filter(x=>x.u==='kcal'),kj=vals.filter(x=>x.u==='kj');
      if(kcal.length)vals=kcal;
      else if(kj.length)vals=kj.map(x=>({v:Math.round(x.v/4.184),u:'kcal'}));
      else vals=vals.filter(x=>!x.u);
    }else{
      // En nutrientes solo valen números con unidad (o sin unidad si no hay otros).
      const conUnidad=vals.filter(x=>x.u==='g'||x.u==='mg');
      if(conUnidad.length)vals=conUnidad;
    }
    if(!vals.length)continue;
    const x=vals[Math.min(col,vals.length-1)];
    if(campo==='sodio')res.sodioMg=x.u==='g'?x.v*1000:x.v;
    else res[campo]=x.u==='mg'?x.v/1000:x.v;
  }
  if(res.azucar===undefined&&res.azucarAnadido!==undefined)res.azucar=res.azucarAnadido;
  delete res.azucarAnadido;
  if(res.sodio!==undefined)delete res.sodio;
  // Con columna por 100 g los valores ya están normalizados: la porción no se aplica.
  if(hay100)delete res.porcion;
  res.tipo=bebida?'bebida':'solido';
  res.por100=hay100;
  return res;
}
