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

// Cómo SUENA el nombre (Whisper escribe "Eredia" por Heredia, "Sandra Fael" por San Rafael).
const fon=s=>norm(s).split(' ').map(w=>w.replace(/^h/,'').replace(/ll/g,'y').replace(/v/g,'b').replace(/z/g,'s').replace(/c([ei])/g,'s$1').replace(/qu/g,'k').replace(/c/g,'k').replace(/(.)\1/g,'$1')).join('');
function lev(a,b,max){
  if(Math.abs(a.length-b.length)>max)return max+1;
  let prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){const cur=[i];let min=i;
    for(let j=1;j<=b.length;j++){cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));if(cur[j]<min)min=cur[j];}
    if(min>max)return max+1;prev=cur;}
  return prev[b.length];
}
let porSonido=null;   // índice: primeras 2 letras del sonido → localidades
function indiceSonido(){
  porSonido=new Map();
  for(const l of lugares){if(!LOCALIDAD.has(l.c)||l.k.length<4)continue;l.f=fon(l.n);const k=l.f.slice(0,2);if(!porSonido.has(k))porSonido.set(k,[]);porSonido.get(k).push(l);}
}
// Localidades que SUENAN como alguna frase de 1 a 3 palabras del texto (tolera 1 error cada 5 letras).
function localidadesPorSonido(t){
  if(!porSonido)indiceSonido();
  const pal=t.trim().split(' ');const out=new Map();   // localidad → distancia
  for(let i=0;i<pal.length;i++)for(let n=1;n<=3&&i+n<=pal.length;n++){
    const f=fon(pal.slice(i,i+n).join(' '));if(f.length<5)continue;
    const max=Math.floor(f.length/5);
    for(const l of porSonido.get(f.slice(0,2))||[]){const d=lev(f,l.f,max);if(d<=max&&!(/[0-9]/.test(l.f)&&!/[0-9]/.test(f))&&(!out.has(l)||out.get(l).d>d))out.set(l,{d,pos:i});}
  }
  return out;
}
// Cantones cuyo pueblo principal tiene otro nombre: "Pérez Zeledón" = San Isidro de El General.
const CABECERA={'perez zeledon':'san isidro de el general','goicoechea':'guadalupe','montes de oca':'san pedro','tibas':'san juan',
  'moravia':'san vicente','vasquez de coronado':'san isidro','coronado':'san isidro','mora':'ciudad colon','tarrazu':'san marcos',
  'dota':'santa maria','leon cortes':'san pablo','acosta':'san ignacio','puriscal':'santiago','poas':'san pedro','san carlos':'ciudad quesada',
  'guatuso':'san rafael','la union':'tres rios','jimenez':'juan vinas','alvarado':'pacayas','oreamuno':'san rafael','el guarco':'tejar',
  'belen':'san antonio','flores':'san joaquin','sarapiqui':'puerto viejo','carrillo':'filadelfia','abangares':'las juntas',
  'nandayure':'carmona','montes de oro':'miramar','osa':'ciudad cortes','coto brus':'san vito','corredores':'ciudad neily',
  'garabito':'jaco','pococi':'guapiles','talamanca':'bribri','aguirre':'quepos','sarchi':'sarchi norte','valverde vega':'sarchi norte'};
const ALIAS=new RegExp('(^| )('+Object.keys(CABECERA).join('|')+')( |$)','g');
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
  const vistos=new Set();
  for(const m of t.matchAll(/(\d+)\s*(m|mts|metros|varas|km)?\s*(?:al\s+)?(norte|sur|este|oeste)/g)){
    if(vistos.has(m[0]))continue;vistos.add(m[0]);   // la misma frase repetida cuenta una vez
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
  // Se agrega el pueblo principal después del cantón (así cuenta como lo más específico).
  const t=(' '+norm(texto)+' ').replace(ALIAS,(m,a,c,b)=>`${a}${c} ${CABECERA[c]}${b}`);
  pideOtra=OTRAS.test(t);
  // Coordenadas directas
  const c=String(texto).match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{2,3}\.\d{3,})/);
  if(c)return {lat:+c[1],lon:+c[2],texto:'coordenadas',precision:'exacta'};
  // 1. Localidades nombradas en el texto (la más larga primero: "San Rafael de Heredia" > "Heredia")
  // Se ignoran barrios que se llaman como una referencia común ("La Plaza", "El Parque", "Centro").
  const GENERICO=/^(la |el |los |las )?(plaza|parque|iglesia|escuela|colegio|centro|mercado|estadio|cancha|bomba|super|cruce|entrada|esquina|puente|rio|playa|calle|ruta|barrio)( central| de deportes)?$/;
  const exactas=lugares.filter(l=>LOCALIDAD.has(l.c)&&l.k.length>=4&&!GENERICO.test(l.k)&&t.includes(' '+l.k+' '));
  // Si el nombre vino mal transcrito, se busca por cómo suena.
  const info=localidadesPorSonido(t);
  for(const l of exactas)info.set(l,{d:0,pos:t.slice(0,t.indexOf(' '+l.k+' ')+1).trim().split(' ').filter(Boolean).length});
  const dist=new Map([...info].map(([l,v])=>[l,v.d]));
  const locs=[...dist.keys()].filter(l=>!GENERICO.test(l.k));
  // Primero lo que mejor coincide; entre iguales, lo más específico (Paraíso antes que Cartago) y lo más largo.
  const ESPEC={city:0,town:1,suburb:2,village:2,quarter:3,neighbourhood:3,hamlet:3,locality:3};
  // Caseríos solo si coinciden exacto (evita que una palabra común parezca un caserío).
  for(const l of [...locs])if((l.c==='hamlet'||l.c==='locality')&&dist.get(l)>0)locs.splice(locs.indexOf(l),1);
  // En CR se dice de lo general a lo específico ("Cartago, Paraíso"): manda lo último
  // mencionado, salvo "San Rafael de Heredia" (ahí el primero es el específico).
  const pos=l=>{let p=info.get(l).pos;for(const o of locs)if(o.k!==l.k&&t.includes(' '+l.k+' de '+o.k+' '))p+=1000;return p;};
  locs.sort((a,b)=>(pos(b)-pos(a))||(dist.get(a)-dist.get(b))||((ESPEC[b.c]??3)-(ESPEC[a.c]??3))||(b.k.length-a.k.length));
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
    // Si hay un pueblo/ciudad con ese nombre a menos de 15 km de lo demás mencionado,
    // es a eso a lo que se refieren ("Cartago, Paraíso" = el cantón, no un barrio Paraíso).
    const cand=grupos.get(nombres[0]).sort((a,b)=>costo(a)-costo(b));
    zona=cand.find(l=>(l.c==='city'||l.c==='town')&&costo(l)<15)||cand[0];
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
