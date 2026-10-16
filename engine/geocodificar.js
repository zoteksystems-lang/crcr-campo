// Convierte una dirección "a la tica" en un punto, SIN señal, con ~31 000
// lugares de referencia de OpenStreetMap (pueblos, barrios, iglesias,
// escuelas, parques, plazas, bancos…) en mapa/lugares.json.
//   "200 m norte de la iglesia católica de San Rafael de Heredia"
//   → busca "San Rafael" (y "Heredia") → la iglesia más cercana → +200 m al norte.
// Devuelve también qué entendió, para que el socorrista lo confirme en el mapa.

let lugares=null;
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
const LOCALIDAD=new Set(['city','town','village','hamlet','suburb','neighbourhood','quarter','locality']);
// Palabra del despacho → categoría de OSM
const REFERENCIA=[[/\b(iglesia|templo|parroquia|capilla|catedral|ermita)\b/,'place_of_worship'],[/\b(escuela|colegio|liceo|kinder)\b/,'school'],
  [/\b(universidad|tec|ucr|una)\b/,'university'],[/\b(parque|parquecito)\b/,'park'],[/\b(plaza|cancha|plaza de deportes)\b/,'pitch'],
  [/\b(estadio)\b/,'stadium'],[/\b(delegacion|policia|fuerza publica)\b/,'police'],[/\b(bomberos)\b/,'fire_station'],
  [/\b(banco|bn|bcr)\b/,'bank'],[/\b(bomba|gasolinera|estacion de servicio)\b/,'fuel'],[/\b(super|supermercado|pali|maxipali|mas x menos|walmart|automercado)\b/,'supermarket'],
  [/\b(municipalidad)\b/,'townhall'],[/\b(salon comunal)\b/,'community_centre'],[/\b(mercado)\b/,'marketplace'],[/\b(hotel)\b/,'hotel'],[/\b(mall|centro comercial)\b/,'mall']];

export async function cargarLugares(obtener){
  if(lugares)return lugares;
  const r=await obtener('mapa/lugares.json');
  lugares=(await r.json()).map(([n,c,la,lo])=>({n,c,la,lo,k:norm(n)}));
  return lugares;
}
function km(a,b){const x=(b.lo-a.lo)*Math.PI/180*Math.cos((a.la+b.la)/2*Math.PI/180),y=(b.la-a.la)*Math.PI/180;return 6371*Math.hypot(x,y);}

// Desplazamiento "200 m norte", "100 varas al sur", "300 metros este".
function desplazamiento(t){
  const out={n:0,e:0};
  for(const m of t.matchAll(/(\d+)\s*(m|mts|metros|varas|km)?\s*(?:al\s+)?(norte|sur|este|oeste)/g)){
    let d=+m[1];if(m[2]==='varas')d*=0.84;if(m[2]==='km')d*=1000;
    if(m[3]==='norte')out.n+=d;if(m[3]==='sur')out.n-=d;if(m[3]==='este')out.e+=d;if(m[3]==='oeste')out.e-=d;
  }
  return out;
}

// En Costa Rica "la iglesia" es la católica, salvo que el despacho diga otra.
const OTRAS=/(bautista|adventista|evangel|pentecost|testigos|mormon|jesucristo de los|asamblea|metodista|luterana|cristiana|ministerio|templo biblico)/;
let pideOtra=false;
const catolica=l=>l.c!=='place_of_worship'||pideOtra?0:(OTRAS.test(l.k)?-1:(/(catolica|parroquia|catedral|basilica|nuestra senora|inmaculada|san |santa |santo |sagrado|virgen)/.test(l.k)?1:0));
export function geocodificar(texto,{cerca}={}){
  if(!lugares)return null;
  const t=' '+norm(texto)+' ';
  pideOtra=OTRAS.test(t);
  // Coordenadas directas
  const c=String(texto).match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{2,3}\.\d{3,})/);
  if(c)return {lat:+c[1],lon:+c[2],texto:'coordenadas',precision:'exacta'};
  // 1. Localidades nombradas en el texto (la más larga primero: "San Rafael de Heredia" > "Heredia")
  // Se ignoran barrios que se llaman como una referencia común ("La Plaza", "El Parque", "Centro").
  const GENERICO=/^(la |el |los |las )?(plaza|parque|iglesia|escuela|colegio|centro|mercado|estadio|cancha|bomba|super|cruce|entrada|esquina|puente|rio|playa|calle|ruta|barrio)( central| de deportes)?$/;
  const locs=lugares.filter(l=>LOCALIDAD.has(l.c)&&l.k.length>=4&&!GENERICO.test(l.k)&&t.includes(' '+l.k+' '));
  locs.sort((a,b)=>b.k.length-a.k.length);
  // Nombres repetidos en el país ("Barrio Los Ángeles", "Paraíso"): se elige el
  // candidato más cercano a las OTRAS localidades mencionadas (o a la unidad).
  let zona=null;
  if(locs.length){
    const grupos=new Map();for(const l of locs){if(!grupos.has(l.k))grupos.set(l.k,[]);grupos.get(l.k).push(l);}
    const nombres=[...grupos.keys()];           // ya ordenados del más largo al más corto
    const PESO={city:0,town:1,suburb:2,village:3,quarter:3,neighbourhood:4,hamlet:5,locality:6};
    const costo=l=>{
      // Como ancla valen más las ciudades/pueblos ("Heredia" ciudad, no un caserío Heredia).
      let s=0;for(const k of nombres){if(k===l.k)continue;
        const g=grupos.get(k);const grandes=g.filter(o=>o.c==='city'||o.c==='town');
        s+=Math.min(...(grandes.length?grandes:g).map(o=>km(l,o)));}
      if(cerca)s+=km(l,{la:cerca.lat,lo:cerca.lon})*0.3;
      return s+(PESO[l.c]??6)*0.01;
    };
    zona=grupos.get(nombres[0]).sort((a,b)=>costo(a)-costo(b))[0];
    // Si el barrio elegido queda lejos (>8 km) de la ciudad mencionada, no existe ese
    // barrio en esa ciudad en los datos: mejor usar la ciudad.
    const grande=nombres.slice(1).map(k=>grupos.get(k).filter(o=>o.c==='city'||o.c==='town')).flat()
      .sort((a,b)=>km(a,zona)-km(b,zona))[0];
    if(grande&&km(grande,zona)>8)zona=grande;
  }
  // 2. Referencia (iglesia, escuela…) con nombre propio o por categoría cerca de la zona
  let ref=null;
  const nombrados=lugares.filter(l=>!LOCALIDAD.has(l.c)&&l.k.length>=6&&t.includes(' '+l.k+' '));
  if(nombrados.length){
    nombrados.sort((a,b)=>(zona?km(a,zona)-km(b,zona):0)||(b.k.length-a.k.length));
    if(!zona||km(nombrados[0],zona)<3)ref=nombrados[0];
  }
  if(!ref&&zona){
    for(const [re,cat] of REFERENCIA){
      const m=t.match(re);if(!m)continue;
      // "frente al Palí": primero los que se llaman como lo dicho; si no, el más cercano de esa categoría.
      const palabra=m[1];
      const cand=lugares.filter(l=>l.c===cat&&km(l,zona)<3)
        .sort((a,b)=>((b.k.includes(palabra)?1:0)-(a.k.includes(palabra)?1:0))||(catolica(b)-catolica(a))||(km(a,zona)-km(b,zona)));
      if(cand.length){ref=cand[0];break;}
    }
  }
  const base=ref||zona;
  if(!base)return null;
  const d=desplazamiento(t);
  const lat=base.la+d.n/110540,lon=base.lo+d.e/(111320*Math.cos(base.la*Math.PI/180));
  const partes=[ref?ref.n:null,zona&&ref!==zona?zona.n:null].filter(Boolean);
  const despl=[d.n?`${Math.abs(Math.round(d.n))} m ${d.n>0?'norte':'sur'}`:'',d.e?`${Math.abs(Math.round(d.e))} m ${d.e>0?'este':'oeste'}`:''].filter(Boolean).join(', ');
  return {lat:+lat.toFixed(5),lon:+lon.toFixed(5),texto:(despl?despl+' de ':'')+partes.join(', '),precision:ref?'referencia':'localidad'};
}
