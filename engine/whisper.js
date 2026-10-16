// Transcripción de voz 100% local con Whisper (transformers.js + ONNX Runtime WASM).
// Reemplaza window.webkitSpeechRecognition (que mandaba el audio a Google).
// El modelo se sirve desde ../models/whisper-tiny (propio, no CDN) y queda cacheado
// por el Service Worker: se baja una sola vez y después no vuelve a tocar la red.
let transformersMod=null;
let transcriberPromise=null;

async function cargarTransformers(){
  if(!transformersMod){
    transformersMod=await import('../vendor/transformers.min.js');
    const {env}=transformersMod;
    env.allowRemoteModels=false;   // nunca bajar nada de huggingface.co en vivo
    env.allowLocalModels=true;
    // OJO: estas rutas se resuelven contra la URL de la página (index.html en la
    // raíz), no contra la ubicación de este módulo — por eso van sin "../".
    env.localModelPath='./models/';
    env.backends.onnx.wasm.wasmPaths='./vendor/';
    env.backends.onnx.wasm.numThreads=1; // evita depender de SharedArrayBuffer/COOP-COEP
    env.useBrowserCache=false; // el Service Worker (sw.js) ya cachea el modelo entero;
                                // esto evita guardarlo dos veces (Cache API + SW).
  }
  return transformersMod;
}

export async function precargarModelo(onProgress){
  const {pipeline}=await cargarTransformers();
  if(!transcriberPromise){
    transcriberPromise=pipeline('automatic-speech-recognition','whisper-tiny',{
      quantized:true,
      progress_callback:onProgress
    });
  }
  return transcriberPromise;
}

// Convierte cualquier Blob de audio grabado a Float32Array mono a 16kHz (lo que Whisper espera).
async function blobA16kMono(blob){
  const arrayBuffer=await blob.arrayBuffer();
  const AC=window.AudioContext||window.webkitAudioContext;
  const ctxTmp=new AC();
  const decoded=await ctxTmp.decodeAudioData(arrayBuffer.slice(0));
  ctxTmp.close();
  if(decoded.sampleRate===16000 && decoded.numberOfChannels===1){
    return decoded.getChannelData(0);
  }
  const offline=new OfflineAudioContext(1, Math.ceil(decoded.duration*16000), 16000);
  const src=offline.createBufferSource();
  src.buffer=decoded;
  src.connect(offline.destination);
  src.start(0);
  const rendered=await offline.startRendering();
  return rendered.getChannelData(0);
}

// chunk_length_s: Whisper solo "ve" 30 s por vez; sin esto un despacho largo
// quedaba cortado en los primeros 30 segundos.
const OPC={language:'spanish',task:'transcribe',chunk_length_s:30,stride_length_s:5};
export async function transcribir(blob, {onProgress}={}){
  const transcriber=await precargarModelo(onProgress);
  const audio=await blobA16kMono(blob);
  const resultado=await transcriber(audio,OPC);
  return (resultado.text||'').trim();
}
// Transcripción en vivo: solo el pedazo nuevo desde el segundo `desde`
// (con 1 s de solape para no cortar palabras). Devuelve hasta dónde llegó.
export async function transcribirDesde(blob, desde=0){
  const transcriber=await precargarModelo();
  const audio=await blobA16kMono(blob);
  const ini=Math.max(0,Math.floor((desde-1)*16000));
  const hasta=audio.length/16000;
  if(hasta-desde<3)return {texto:'',hasta:desde};
  const resultado=await transcriber(audio.subarray(ini),OPC);
  return {texto:(resultado.text||'').trim(),hasta};
}
