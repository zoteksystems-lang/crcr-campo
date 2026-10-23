// Prueba general de CRCR Campo: abre todas las pantallas, motores clínicos (3 impresiones,
// tríadas, NEWS2), despacho → guía + ubicación del paciente, y que no haya errores JS.
// Uso: node humo.mjs [url]   (local: python -m http.server 5602 en la carpeta del proyecto)
import {chromium} from 'playwright-core';
const URL=process.argv.find(a=>a.startsWith('http'))||'http://localhost:5602/';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const p=await b.newPage({viewport:{width:390,height:844}});const err=[];p.on('pageerror',e=>err.push(e.message));
p.on('dialog',d=>d.dismiss());
let ok=0,mal=0;const check=(n,c,i='')=>{c?ok++:mal++;console.log((c?'✔ ':'✘ ')+n+(i?'  → '+i:''));};
// En producción la app es privada: se prueba que sin código no entrega nada y luego se entra.
// Código en la variable CRCR_CODIGO (no se escribe en el repo).
if(!URL.includes('localhost')){
  const sin=await fetch(URL,{redirect:'manual',headers:{accept:'text/html'}});
  check('privado: sin código, la página manda a /acceso.html',sin.status===302&&/acceso\.html/.test(sin.headers.get('location')||''),sin.status+' '+sin.headers.get('location'));
  const js=await fetch(URL+'app.js');
  check('privado: sin código, los archivos de la app no se entregan',js.status===401,String(js.status));
  const malo=await fetch(URL+'api/entrar',{method:'POST',headers:{'content-type':'application/json'},body:'{"codigo":"crcr-aaaa-bbbb-cccc"}'});
  check('privado: código incorrecto rechazado',malo.status===401,String(malo.status));
  await p.goto(URL);
  check('privado: la app muestra la pantalla del código',/acceso\.html/.test(p.url()));
  await p.fill('#c',process.env.CRCR_CODIGO||'');await p.click('#b');await p.waitForURL(u=>!/acceso/.test(String(u)),{timeout:15000}).catch(()=>{});
  check('privado: con el código correcto entra a la app',!/acceso/.test(p.url())&&await p.evaluate(()=>typeof go==='function'),p.url());
}
await p.goto(URL);await p.waitForTimeout(1500);

// Pantallas
const PANTALLAS=['home','desp','triage','entrev','boleta','herr','enf','repaso','equipo','hist'];
const sinAbrir=[];
for(const s of PANTALLAS){await p.evaluate(s=>go(s),s);await p.waitForTimeout(150);if(!(await p.evaluate(s=>document.getElementById('s-'+s)?.classList.contains('active'),s)))sinAbrir.push(s);}
check('se abren las '+PANTALLAS.length+' pantallas',!sinAbrir.length,sinAbrir.join(','));

// 3 impresiones diagnósticas
const casos=[
  ['hombre de 58 años con dolor en el pecho que irradia al brazo izquierdo, sudoroso','iam',1],
  ['señora con la boca desviada, no puede hablar bien y no mueve el brazo derecho desde hace una hora','acv',3],
  ['diabético encontrado inconsciente, sudando frío, glucosa baja','hipoglucemia',1],
  ['niño de 4 años con dificultad para respirar, silbido en el pecho, antecedente de asma','asma',3],
  ['colisión de motocicleta, paciente con dolor en el pecho y dificultad para respirar','iam',-1],
];
for(const [t,dx,pos] of casos){
  const r=await p.evaluate(async([t])=>{const m=await import('./engine/impresion.js');const a=await import('./engine/arribo.js');
    return m.tresImpresiones(t,{ctx:a.contextoPaciente(t)}).map(d=>d.id);},[t]);
  const i=r.indexOf(dx);
  const bien=pos===-1?i!==0:i>=0&&i<pos;
  check(`impresión "${t.slice(0,45)}…" ${pos===-1?'NO pone '+dx+' primero (es trauma)':dx+' en top '+pos}`,bien&&r.length===3,r.join(', '));
}

// Tríadas
const tri=await p.evaluate(async()=>{const m=await import('./engine/triadas.js');
  return {beck:m.triadasPresentes('herida en el pecho, presion baja, venas del cuello distendidas, ruidos cardiacos apagados').map(t=>t.n+(t.completa?' completa':'')),
          dos:m.triadasPresentes('paciente inconsciente con pupilas puntiformes').map(t=>t.n+':'+t.no.join('/')),
          nada:m.triadasPresentes('dolor de rodilla al caminar').length};});
check('tríada de Beck completa',tri.beck.includes('Tríada de Beck completa'),tri.beck.join(';'));
check('tríada opioide 2/3 dice qué falta buscar',tri.dos.some(x=>/opioide:Respira lento/.test(x)),tri.dos.join(';'));
check('sin tríada si no hay',tri.nada===0);

// NEWS2
const n2=await p.evaluate(async()=>{const m=await import('./engine/herramientas.js');
  return [m.news2({fr:26,spo2:90,pa1:85,fc:135,temp:39.5,gcs:13}),m.news2({fr:16,spo2:98,pa1:120,fc:75,temp:36.8,gcs:15})];});
check('NEWS2 grave = riesgo alto',n2[0].riesgo==='alto',`${n2[0].total} ${n2[0].riesgo}`);
check('NEWS2 normal = riesgo bajo',n2[1].riesgo==='bajo'&&n2[1].total===0,`${n2[1].total} ${n2[1].riesgo}`);

// Despacho escrito → guía de arribo, boleta y ubicación del paciente
const DESP='Unidad 1 E21 masculino de 60 años con dolor en el pecho, sudoroso, 200 metros norte de la iglesia católica de San Rafael de Heredia';
await p.evaluate(()=>go('desp'));await p.fill('#dtxt',DESP);
await p.evaluate(()=>interpDesp());await p.waitForTimeout(3000);
const d=await p.evaluate(()=>({ubic:document.getElementById('dubic')?.value,guia:document.getElementById('guiaCard')?.innerText||'',
  waze:document.getElementById('btnWaze')?.getAttribute('href')||''}));
check('despacho: llena la ubicación',/san rafael/i.test(d.ubic),d.ubic);
check('despacho: guía con impresión de infarto',/infarto|coronario/i.test(d.guia),d.guia.slice(0,80).replace(/\n/g,' '));
check('despacho: botón Waze listo',/waze/.test(d.waze));
const geo=await p.evaluate(async()=>{const g=await import('./engine/geocodificar.js');await g.cargarLugares(u=>fetch(u));
  return g.geocodificar('200 metros norte de la iglesia católica de San Rafael de Heredia');});
// San Rafael de Heredia ≈ 10.01, -84.10
check('ubica al paciente en San Rafael de Heredia (sin internet de mapas)',geo&&Math.abs(geo.lat-10.01)<0.05&&Math.abs(geo.lon+84.10)<0.06,geo?`${geo.lat},${geo.lon} ${geo.texto} (${geo.precision})`:'null');

check('sin errores JS',!err.length,err.join(' | '));
console.log(ok+' bien, '+mal+' mal');await b.close();
