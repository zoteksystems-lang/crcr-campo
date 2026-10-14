// Escáner de código de barras con la cámara, 100% local. Usa el BarcodeDetector
// nativo cuando existe (Chrome Android) y si no ZXing vendorizado
// (vendor/zxing.min.js) — así también funciona en iPhone.
const FORMATOS=['ean_13','ean_8','upc_a','upc_e'];
let zxingPromise=null;

function cargarZXing(){
  if(globalThis.ZXing)return Promise.resolve(globalThis.ZXing);
  if(!zxingPromise)zxingPromise=new Promise((ok,mal)=>{
    const s=document.createElement('script');
    s.src='./vendor/zxing.min.js';
    s.onload=()=>ok(globalThis.ZXing);
    s.onerror=()=>mal(new Error('No se pudo cargar el lector de códigos'));
    document.head.appendChild(s);
  });
  return zxingPromise;
}

async function crearDetector(){
  if('BarcodeDetector' in globalThis){
    try{
      const soportados=await globalThis.BarcodeDetector.getSupportedFormats();
      const fmts=FORMATOS.filter(f=>soportados.includes(f));
      if(fmts.length){
        const det=new globalThis.BarcodeDetector({formats:fmts});
        return async(fuente)=>{
          const r=await det.detect(fuente);
          return r[0]?.rawValue||null;
        };
      }
    }catch{}
  }
  const ZX=await cargarZXing();
  const hints=new Map();
  hints.set(ZX.DecodeHintType.POSSIBLE_FORMATS,[ZX.BarcodeFormat.EAN_13,ZX.BarcodeFormat.EAN_8,ZX.BarcodeFormat.UPC_A,ZX.BarcodeFormat.UPC_E]);
  hints.set(ZX.DecodeHintType.TRY_HARDER,true);
  const lector=new ZX.MultiFormatReader();
  lector.setHints(hints);
  const canvas=document.createElement('canvas');
  return async(fuente)=>{
    const w=fuente.videoWidth||fuente.naturalWidth||fuente.width;
    const h=fuente.videoHeight||fuente.naturalHeight||fuente.height;
    if(!w||!h)return null;
    canvas.width=w;canvas.height=h;
    canvas.getContext('2d',{willReadFrequently:true}).drawImage(fuente,0,0,w,h);
    try{
      const bmp=new ZX.BinaryBitmap(new ZX.HybridBinarizer(new ZX.HTMLCanvasElementLuminanceSource(canvas)));
      return lector.decode(bmp).getText();
    }catch{return null;}finally{lector.reset();}
  };
}

// Lee el código de una foto (sirve de respaldo si el navegador no da la cámara en vivo).
export async function leerDeImagen(file){
  const detectar=await crearDetector();
  const img=new Image();
  img.src=URL.createObjectURL(file);
  await img.decode();
  try{return await detectar(img);}finally{URL.revokeObjectURL(img.src);}
}

// Abre la cámara trasera en <video> y llama onCodigo(texto) con la primera
// lectura que se repita dos veces seguidas (evita lecturas falsas).
// Devuelve una función para detener.
export async function escanear(video,onCodigo){
  const stream=await navigator.mediaDevices.getUserMedia({
    video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false
  });
  video.srcObject=stream;
  video.setAttribute('playsinline','');
  await video.play();
  const detectar=await crearDetector();
  let activo=true,anterior=null;
  const detener=()=>{activo=false;stream.getTracks().forEach(t=>t.stop());video.srcObject=null;};
  (async function ciclo(){
    while(activo){
      const cod=await detectar(video).catch(()=>null);
      if(!activo)break;
      if(cod&&cod===anterior){detener();onCodigo(cod);break;}
      anterior=cod;
      await new Promise(r=>setTimeout(r,180));
    }
  })();
  return detener;
}
