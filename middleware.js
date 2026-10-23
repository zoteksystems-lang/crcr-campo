// Acceso privado: sin la cookie de acceso (se obtiene con el código en /acceso.html)
// el servidor no entrega ningún archivo de la app. Corre en Vercel antes de todo.
// Ya instalada, la app funciona sin señal desde la caché del teléfono.
export const config={matcher:'/((?!acceso\\.html|api/entrar|icon\\.svg|manifest\\.webmanifest).*)'};

const COOKIE='crcr_acceso';
const enc=new TextEncoder();
async function firmaValida(valor,secreto){
  const [exp,firma]=String(valor||'').split('.');
  if(!exp||!firma||!(+exp>Date.now()))return false;
  const k=await crypto.subtle.importKey('raw',enc.encode(secreto),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const bytes=Uint8Array.from(atob(firma.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  return crypto.subtle.verify('HMAC',k,bytes,enc.encode(exp));
}

export default async function middleware(request){
  const secreto=process.env.ACCESO_SECRETO;
  const cookie=(request.headers.get('cookie')||'').split(/;\s*/).find(c=>c.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  try{if(secreto&&await firmaValida(cookie,secreto))return;}catch{}
  // Navegación → pantalla del código; lo demás (archivos, API) → 401 (no se cachea una página de login como si fuera la app).
  const nav=request.headers.get('sec-fetch-mode')==='navigate'||(request.headers.get('accept')||'').includes('text/html');
  if(nav)return Response.redirect(new URL('/acceso.html',request.url),302);
  return new Response('Acceso privado',{status:401,headers:{'cache-control':'no-store'}});
}
