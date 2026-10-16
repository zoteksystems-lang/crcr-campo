// Guarda TEMPORALMENTE una grabación (audio o su transcripción) en un Blob
// privado de Vercel para que pueda revisarse. Solo con el PIN de revisión.
// La app lo hace solo si el socorrista activa "copia para revisión".
import {put} from '@vercel/blob';

const TIPOS=/^(audio\/(webm|ogg|mp4|mpeg|wav)|text\/plain)(;.*)?$/;
const MAX=4*1024*1024; // límite de cuerpo de las funciones de Vercel (~4,5 MB)

export const config={api:{bodyParser:false}};

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Usá POST'});
  const pin=String(req.headers['x-pin']||'');
  if(!process.env.REVISION_PIN||pin!==process.env.REVISION_PIN)return res.status(401).json({error:'PIN incorrecto'});
  const tipo=String(req.headers['content-type']||'');
  if(!TIPOS.test(tipo))return res.status(415).json({error:'Tipo de archivo no permitido'});
  const nombre=String(req.headers['x-nombre']||'').replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,120);
  if(!/^crcr_[a-z0-9_.-]+\.(webm|ogg|m4a|mp3|wav|txt)$/i.test(nombre))return res.status(400).json({error:'Nombre inválido'});
  const partes=[];let total=0;
  for await(const c of req){total+=c.length;if(total>MAX)return res.status(413).json({error:'Archivo muy grande (máx. 4 MB): usá Compartir'});partes.push(c);}
  const blob=await put('revision/'+nombre,Buffer.concat(partes),{access:'private',contentType:tipo.split(';')[0],addRandomSuffix:false,allowOverwrite:true});
  return res.status(200).json({ok:true,ruta:blob.pathname});
}
