// Service Worker — precachea TODO (app + motor Whisper + OCR Tesseract) en la
// primera visita con red, para que después la app funcione 100% sin conexión.
// Subir la versión de CACHE_NAME cuando se publique una actualización real.
const CACHE_NAME='crcr-campo-v16';
const ARCHIVOS=[
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data.js',
  './manifest.webmanifest',
  './icon.svg',
  './engine/chat.js',
  './engine/despacho.js',
  './engine/diagnostico.js',
  './engine/documentacion.js',
  './engine/entrevista.js',
  './engine/ocr.js',
  './engine/store.js',
  './engine/signos.js',
  './engine/arribo.js',
  './engine/impresion.js',
  './engine/triadas.js',
  './engine/senales.js',
  './engine/pesos.js',
  './engine/herramientas.js',
  './engine/util.js',
  './engine/vitals.js',
  './engine/whisper.js',
  './vendor/ort-wasm-simd.wasm',
  './vendor/ort-wasm.wasm',
  './vendor/tesseract-core-simd-lstm.wasm',
  './vendor/tesseract-core-simd-lstm.wasm.js',
  './vendor/tesseract-worker.min.js',
  './vendor/tesseract.esm.min.js',
  './vendor/transformers.min.js',
  './models/tesseract/spa.traineddata.gz',
  './models/whisper-tiny/added_tokens.json',
  './models/whisper-tiny/config.json',
  './models/whisper-tiny/generation_config.json',
  './models/whisper-tiny/merges.txt',
  './models/whisper-tiny/normalizer.json',
  './models/whisper-tiny/preprocessor_config.json',
  './models/whisper-tiny/special_tokens_map.json',
  './models/whisper-tiny/tokenizer.json',
  './models/whisper-tiny/tokenizer_config.json',
  './models/whisper-tiny/vocab.json',
  './models/whisper-tiny/onnx/decoder_model_merged_quantized.onnx',
  './models/whisper-tiny/onnx/encoder_model_quantized.onnx',
];

self.addEventListener('install',(event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(ARCHIVOS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',(event)=>{
  event.waitUntil(
    caches.keys().then(nombres=>Promise.all(
      nombres.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n))
    )).then(()=>self.clients.claim())
  );
});

// Cache-first: si ya está descargado, ni se intenta tocar la red.
self.addEventListener('fetch',(event)=>{
  if(event.request.method!=='GET')return;
  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached)return cached;
      return fetch(event.request).then(resp=>{
        if(resp && resp.ok && event.request.url.startsWith(self.location.origin)){
          const copia=resp.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(event.request, copia));
        }
        return resp;
      }).catch(()=>cached);
    })
  );
});
