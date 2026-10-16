// Rutas SIN señal sobre la red vial de Costa Rica (OpenStreetMap, ver
// scripts de extracción). Grafo compacto en mapa/rutas.bin.gz:
//   cabecera JSON {v,e,g,nombres} + V (lat,lon ×1e5) + E (u,v,décimas de s,
//   flags,nombre,metros) + GO (offsets de geometría) + G (puntos intermedios).
// A* con tiempo de viaje según tipo de vía. No conoce el tránsito en vivo.

let red=null,cargando=null;

async function leerBinario(resp){
  const gz=resp.headers.get('content-type')?.includes('gzip')||resp.url.endsWith('.gz');
  if(gz&&typeof DecompressionStream!=='undefined'){
    // Si el servidor ya lo descomprimió (Content-Encoding), esto fallaría: se prueba.
    const buf=await resp.arrayBuffer();
    const b=new Uint8Array(buf);
    if(b[0]===0x1f&&b[1]===0x8b)return await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    return buf;
  }
  return await resp.arrayBuffer();
}

export async function cargarRed(obtener){
  if(red)return red;
  if(cargando)return cargando;
  cargando=(async()=>{
    const resp=await obtener('mapa/rutas.bin.gz');
    const buf=await leerBinario(resp);
    const dv=new DataView(buf);
    const n=dv.getUint32(0,true);
    const cab=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,4,n)));
    let off=4+n;off+=(4-off%4)%4;
    const V=new Int32Array(buf,off,cab.v*2);off+=cab.v*8;
    const E=new Int32Array(buf,off,cab.e*6);off+=cab.e*24;
    const GO=new Int32Array(buf,off,cab.e+1);off+=(cab.e+1)*4;
    const G=new Int32Array(buf,off,cab.g*2);
    // Lista de adyacencia (CSR) con aristas dirigidas.
    const grado=new Int32Array(cab.v+1);
    for(let i=0;i<cab.e;i++){
      const s=(E[i*6+3]&3)-1;      // 0 doble vía, 1 sentido u→v, -1 sentido v→u
      if(s>=0)grado[E[i*6]+1]++;
      if(s<=0)grado[E[i*6+1]+1]++;
    }
    for(let i=0;i<cab.v;i++)grado[i+1]+=grado[i];
    const adj=new Int32Array(grado[cab.v]);   // índice de arista con signo: +i (u→v), -(i+1) (v→u)
    const pos=grado.slice(0,cab.v);
    for(let i=0;i<cab.e;i++){
      const u=E[i*6],w=E[i*6+1],s=(E[i*6+3]&3)-1;
      if(s>=0)adj[pos[u]++]=i;
      if(s<=0)adj[pos[w]++]=-(i+1);
    }
    // Índice espacial en celdas de ~1 km para hallar el vértice más cercano.
    const celda=new Map();
    const clave=(la,lo)=>(Math.floor(la/900)*100000+Math.floor(lo/900));
    for(let i=0;i<cab.v;i++){const k=clave(V[i*2],V[i*2+1]);let a=celda.get(k);if(!a){a=[];celda.set(k,a);}a.push(i);}
    red={...cab,V,E,GO,G,ini:grado,adj,celda,clave};
    return red;
  })();
  try{return await cargando;}finally{cargando=null;}
}

function metros(la1,lo1,la2,lo2){ // en grados
  const x=(lo2-lo1)*Math.PI/180*Math.cos((la1+la2)/2*Math.PI/180),y=(la2-la1)*Math.PI/180;
  return 6371000*Math.hypot(x,y);
}

// Vértice de la red más cercano a un punto (busca en celdas vecinas).
export function masCercano(lat,lon){
  const r=red;const la=Math.round(lat*1e5),lo=Math.round(lon*1e5);
  let mejor=-1,md=Infinity;
  for(let radio=1;radio<=6&&mejor<0;radio+=2){
    for(let dy=-radio;dy<=radio;dy++)for(let dx=-radio;dx<=radio;dx++){
      const k=(Math.floor(la/900)+dy)*100000+(Math.floor(lo/900)+dx);
      const a=r.celda.get(k);if(!a)continue;
      for(const i of a){const d=metros(lat,lon,r.V[i*2]/1e5,r.V[i*2+1]/1e5);if(d<md){md=d;mejor=i;}}
    }
  }
  return {v:mejor,distancia:md};
}

// Montículo binario mínimo (para A*).
class Monticulo{
  constructor(){this.k=[];this.p=[];}
  push(k,p){const K=this.k,P=this.p;K.push(k);P.push(p);let i=K.length-1;while(i>0){const j=(i-1)>>1;if(P[j]<=P[i])break;[K[i],K[j]]=[K[j],K[i]];[P[i],P[j]]=[P[j],P[i]];i=j;}}
  pop(){const K=this.k,P=this.p;const top=K[0];const lk=K.pop(),lp=P.pop();if(K.length){K[0]=lk;P[0]=lp;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<K.length&&P[l]<P[m])m=l;if(r<K.length&&P[r]<P[m])m=r;if(m===i)break;[K[i],K[m]]=[K[m],K[i]];[P[i],P[m]]=[P[m],P[i]];i=m;}}return top;}
  get size(){return this.k.length;}
}

// Ruta más rápida entre dos puntos. Devuelve tiempo (s), distancia (m), geometría y vías.
export function calcularRuta(desde,hasta){
  const r=red;if(!r)throw new Error('La red vial no está cargada');
  const a=masCercano(desde.lat,desde.lon),b=masCercano(hasta.lat,hasta.lon);
  if(a.v<0||b.v<0)return null;
  const N=r.v;
  const g=new Float64Array(N).fill(Infinity),prev=new Int32Array(N).fill(-2147483648);
  const tla=r.V[b.v*2]/1e5,tlo=r.V[b.v*2+1]/1e5;
  const h=i=>metros(r.V[i*2]/1e5,r.V[i*2+1]/1e5,tla,tlo)/25; // 90 km/h ≈ 25 m/s (admisible)
  const q=new Monticulo();g[a.v]=0;q.push(a.v,h(a.v));
  const cerrado=new Uint8Array(N);
  while(q.size){
    const u=q.pop();if(cerrado[u])continue;cerrado[u]=1;
    if(u===b.v)break;
    for(let j=r.ini[u];j<r.ini[u+1];j++){
      const e=r.adj[j],i=e>=0?e:-e-1;const w=e>=0?r.E[i*6+1]:r.E[i*6];
      const nd=g[u]+r.E[i*6+2]/10;
      if(nd<g[w]){g[w]=nd;prev[w]=e;q.push(w,nd+h(w));}
    }
  }
  if(!isFinite(g[b.v]))return null;
  // Reconstrucción
  const tramos=[];let v=b.v;
  while(v!==a.v){const e=prev[v];const i=e>=0?e:-e-1;tramos.push({i,ida:e>=0});v=e>=0?r.E[i*6]:r.E[i*6+1];}
  tramos.reverse();
  const coords=[[desde.lon,desde.lat],[r.V[a.v*2+1]/1e5,r.V[a.v*2]/1e5]];
  let metrosTot=0;const vias=[];
  for(const {i,ida} of tramos){
    const pts=[];for(let k=r.GO[i];k<r.GO[i+1];k++)pts.push([r.G[k*2+1]/1e5,r.G[k*2]/1e5]);
    if(!ida)pts.reverse();
    const fin=ida?r.E[i*6+1]:r.E[i*6];
    coords.push(...pts,[r.V[fin*2+1]/1e5,r.V[fin*2]/1e5]);
    const m=r.E[i*6+5];metrosTot+=m;
    const nom=r.nombres[r.E[i*6+4]]||'';
    if(vias.length&&vias.at(-1).nombre===nom)vias.at(-1).m+=m;else vias.push({nombre:nom,m});
  }
  coords.push([hasta.lon,hasta.lat]);
  const extra=(a.distancia+b.distancia);   // tramo a pie/fuera de la red
  return {segundos:g[b.v]+extra/8,metros:metrosTot+extra,coords,
    vias:vias.filter(x=>x.m>=150).map(x=>({nombre:x.nombre||'calle sin nombre',km:Math.round(x.m/100)/10})),
    fueraDeRed:Math.round(Math.max(a.distancia,b.distancia))};
}
export function redCargada(){return !!red;}
