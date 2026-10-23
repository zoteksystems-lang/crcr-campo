// Cambia el código de acceso de la app por una cookie firmada (1 año). El código vive
// solo en la variable ACCESO_CODIGO de Vercel; para cambiarlo, se cambia ahí (y para
// sacar a todos, se cambia ACCESO_SECRETO).
import {timingSafeEqual,createHash,createHmac} from 'node:crypto';

const DIAS=365;
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Usá POST'});
  const h=x=>createHash('sha256').update(String(x)).digest();
  const codigo=String(req.body?.codigo||'').trim().toLowerCase();
  if(!process.env.ACCESO_CODIGO||!process.env.ACCESO_SECRETO||!timingSafeEqual(h(codigo),h(process.env.ACCESO_CODIGO.toLowerCase()))){
    await new Promise(r=>setTimeout(r,1000));   // frena intentos repetidos
    return res.status(401).json({error:'Código incorrecto'});
  }
  const exp=String(Date.now()+DIAS*864e5);
  const firma=createHmac('sha256',process.env.ACCESO_SECRETO).update(exp).digest('base64url');
  res.setHeader('Set-Cookie',`crcr_acceso=${exp}.${firma}; Path=/; Max-Age=${DIAS*86400}; HttpOnly; Secure; SameSite=Lax`);
  res.setHeader('Cache-Control','no-store');
  return res.status(200).json({ok:true});
}
