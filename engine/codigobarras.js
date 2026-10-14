// Búsqueda de alimentos por código de barras — como MyFitnessPal, pero con
// bases abiertas: 1) memoria local del dispositivo (funciona sin red),
// 2) Open Food Facts (mundial, sin clave), 3) USDA FoodData Central (productos
// de EE. UU., muy comunes en PriceSmart y Auto Mercado; clave pública DEMO_KEY).
// Si ninguna lo tiene, la página pide la foto de la tabla (OCR) y el resultado
// se guarda aquí con su código, para que la próxima vez salga al instante.

const CLAVE_LOCAL='crcr-nutricion-productos';
const USDA_KEY='DEMO_KEY';

// Solo dígitos; los UPC-A (12) se comparan como EAN-13 con un 0 delante.
export function normalizarCodigo(c){
  const d=String(c||'').replace(/\D/g,'');
  return d.length===12?'0'+d:d;
}

// Dígito verificador EAN-8 / UPC-A / EAN-13 / GTIN-14.
export function codigoValido(c){
  const d=String(c||'').replace(/\D/g,'');
  if(![8,12,13,14].includes(d.length))return false;
  const nums=[...d].map(Number),control=nums.pop();
  const suma=nums.reverse().reduce((s,n,i)=>s+n*(i%2===0?3:1),0);
  return (10-suma%10)%10===control;
}

function num(v){
  const n=typeof v==='number'?v:parseFloat(String(v??'').replace(',','.'));
  return isNaN(n)?undefined:n;
}

// --- Memoria local (productos ya escaneados o capturados a mano/foto) -------
function leerLocal(){try{return JSON.parse(localStorage.getItem(CLAVE_LOCAL))||{};}catch{return{};}}
export function buscarLocal(codigo){return leerLocal()[normalizarCodigo(codigo)]||null;}
export function guardarLocal(prod){
  const todo=leerLocal();
  todo[normalizarCodigo(prod.codigo)]={...prod,guardado:Date.now()};
  try{localStorage.setItem(CLAVE_LOCAL,JSON.stringify(todo));}catch{}
}

// --- Open Food Facts --------------------------------------------------------
export function desdeOFF(json,codigo){
  if(!json||json.status!==1||!json.product)return null;
  const p=json.product,n=p.nutriments||{};
  const g=k=>num(n[k+'_100g']);
  let kcal=g('energy-kcal');
  if(kcal===undefined&&g('energy')!==undefined)kcal=Math.round(g('energy')/4.184); // energy_100g viene en kJ
  let sal=g('salt');
  if(sal===undefined&&g('sodium')!==undefined)sal=g('sodium')*2.5;
  const datos={kcal,grasa:g('fat'),saturada:g('saturated-fat'),azucar:g('sugars'),sal,
    fibra:g('fiber'),proteina:g('proteins'),carbos:g('carbohydrates')};
  if(Object.values(datos).every(v=>v===undefined))return{sinNutricion:true,
    codigo,nombre:p.product_name_es||p.product_name||'',marca:p.brands||'',fuente:'Open Food Facts'};
  const cats=(p.categories_tags||[]).join(' ');
  const cantidad=String(p.quantity||'');
  const bebida=/en:beverages|en:drinks|en:waters|en:juices|en:sodas|en:milks/.test(cats)
    || /\b\d+([.,]\d+)?\s*(ml|cl|l)\b/i.test(cantidad);
  return{
    codigo:normalizarCodigo(codigo||p.code),
    nombre:p.product_name_es||p.product_name||'',
    marca:(p.brands||'').split(',')[0].trim(),
    cantidad,
    imagen:p.image_front_small_url||p.image_small_url||'',
    ingredientes:p.ingredients_text_es||p.ingredients_text||'',
    porcion:num(p.serving_quantity),
    nova:num(p.nova_group),
    tipo:bebida?'bebida':'solido',
    datos,
    fuente:'Open Food Facts'
  };
}

// --- USDA FoodData Central (Branded Foods: foodNutrients por 100 g/ml) -----
const USDA_IDS={1008:'kcal',1004:'grasa',1258:'saturada',2000:'azucar',1093:'sodioMg',
  1079:'fibra',1003:'proteina',1005:'carbos'};
export function desdeUSDA(json,codigo){
  const objetivo=normalizarCodigo(codigo).replace(/^0+/,'');
  const f=(json?.foods||[]).find(x=>normalizarCodigo(x.gtinUpc).replace(/^0+/,'')===objetivo);
  if(!f)return null;
  const datos={};
  for(const n of f.foodNutrients||[]){
    const campo=USDA_IDS[n.nutrientId];
    if(campo&&datos[campo]===undefined)datos[campo]=num(n.value);
  }
  if(datos.sodioMg!==undefined){datos.sal=datos.sodioMg/1000*2.5;}
  delete datos.sodioMg;
  const unidad=String(f.servingSizeUnit||'').toLowerCase();
  return{
    codigo:normalizarCodigo(codigo),
    nombre:(f.description||'').toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase()),
    marca:f.brandName||f.brandOwner||'',
    cantidad:f.packageWeight||'',
    imagen:'',
    ingredientes:f.ingredients||'',
    porcion:num(f.servingSize),
    tipo:unidad==='ml'||/beverage|drink|juice|soda|water/i.test(f.brandedFoodCategory||'')?'bebida':'solido',
    datos,
    fuente:'USDA FoodData Central'
  };
}

async function pedirJSON(url,fetchFn,ms=8000){
  const ctrl=typeof AbortController!=='undefined'?new AbortController():null;
  const t=ctrl?setTimeout(()=>ctrl.abort(),ms):null;
  try{
    const r=await fetchFn(url,ctrl?{signal:ctrl.signal}:{});
    if(!r.ok)return null;
    return await r.json();
  }finally{if(t)clearTimeout(t);}
}

// Devuelve {producto, origen:'local'|'off'|'usda'} o {producto:null, sinRed, parcial}.
export async function buscarProducto(codigo,{fetchFn=globalThis.fetch?.bind(globalThis)}={}){
  const cod=normalizarCodigo(codigo);
  const local=buscarLocal(cod);
  if(local)return{producto:local,origen:'local'};
  let sinRed=false,parcial=null;
  try{
    const off=desdeOFF(await pedirJSON(
      `https://world.openfoodfacts.org/api/v2/product/${cod}.json?fields=code,product_name,product_name_es,brands,quantity,image_front_small_url,image_small_url,ingredients_text,ingredients_text_es,serving_quantity,nova_group,categories_tags,nutriments`,
      fetchFn),cod);
    if(off&&!off.sinNutricion)return{producto:off,origen:'off'};
    if(off)parcial=off;
  }catch{sinRed=true;}
  try{
    const usda=desdeUSDA(await pedirJSON(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}&dataType=Branded&pageSize=5&query=${cod.replace(/^0+/,'')}`,
      fetchFn),cod);
    if(usda)return{producto:usda,origen:'usda'};
  }catch{sinRed=true;}
  return{producto:null,sinRed,parcial};
}
