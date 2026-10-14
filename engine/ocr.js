// OCR local de cédula con Tesseract.js — reemplaza extractOCR() (llamada a IA con la foto).
// Todos los archivos (worker, núcleo wasm, datos de idioma) se sirven desde el propio
// dominio (../vendor/, ../models/tesseract/); nunca desde el CDN por defecto de Tesseract.
let workerPromise=null;

async function obtenerWorker(){
  if(!workerPromise){
    const {default:Tesseract}=await import('../vendor/tesseract.esm.min.js');
    // OJO: workerPath/corePath/langPath se resuelven contra la URL de la página
    // (index.html en la raíz), no contra este módulo — por eso van sin "../".
    workerPromise=Tesseract.createWorker('spa', 1, {
      workerPath:'./vendor/tesseract-worker.min.js',
      corePath:'./vendor/tesseract-core-simd-lstm.wasm.js',
      langPath:'./models/tesseract/',
      gzip:true,
      workerBlobURL:false,
      logger:()=>{}
    });
  }
  return workerPromise;
}

// Cédula costarricense: 1-2345-6789 (con o sin guiones)
const RE_CEDULA=/\b(\d)[-\s]?(\d{4})[-\s]?(\d{4})\b/;
// Línea en mayúsculas de 2+ palabras, sin dígitos → candidato a nombre.
const RE_NOMBRE=/^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,60}$/;

function parsearTexto(texto){
  const lineas=texto.split('\n').map(l=>l.trim()).filter(Boolean);
  const out={nombre:'',cedula:''};
  const mCed=texto.match(RE_CEDULA);
  if(mCed)out.cedula=`${mCed[1]}-${mCed[2]}-${mCed[3]}`;
  const candidato=lineas.find(l=>RE_NOMBRE.test(l) && !/CAJA|COSTARRICENSE|REPUBLICA|TARJETA|IDENTIDAD/i.test(l));
  if(candidato)out.nombre=candidato.replace(/\s+/g,' ').trim();
  return out;
}

export async function leerCedula(dataUrlOrBlob, {onProgress}={}){
  const worker=await obtenerWorker();
  if(onProgress)worker.setLogger?.(onProgress);
  const {data}=await worker.recognize(dataUrlOrBlob);
  return {...parsearTexto(data.text||''), textoCrudo:data.text};
}

// Texto crudo de cualquier foto (p. ej. tabla nutricional en nutricion.html).
export async function leerTexto(dataUrlOrBlob){
  const worker=await obtenerWorker();
  const {data}=await worker.recognize(dataUrlOrBlob);
  return data.text||'';
}

export async function cerrarOCR(){
  if(workerPromise){
    const w=await workerPromise;
    await w.terminate();
    workerPromise=null;
  }
}
