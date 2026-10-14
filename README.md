# CRCR Campo — 100% local

Asistente de campo para Cruz Roja Costarricense. Sin nube: interpretación de
despacho, signos vitales, entrevista SAMPLE/OPQRST, diagnóstico diferencial,
boleta APA y buscador corren con reglas propias en `engine/*.js` sobre las
tablas de `data.js`. La voz se transcribe con Whisper local (transformers.js)
y la cédula (y la tabla nutricional en `nutricion.html`) se lee con Tesseract.js local — ningún dato de paciente sale del
dispositivo.

## Estructura

- `index.html`, `styles.css`, `app.js`, `data.js` — la app.
- `engine/` — los "agentes" locales (despacho, vitales, entrevista,
  diagnóstico, documentación/boleta, buscador, whisper, ocr, persistencia).
- `vendor/` — transformers.js + Tesseract.js, vendorizados (no CDN).
- `models/` — pesos de Whisper-tiny (cuantizado, multilingüe) y el idioma
  español de Tesseract, servidos desde el propio dominio.
- `nutricion.html` — escáner de alimentos para bajar de peso (estilo
  MyFitnessPal): se escanea el código de barras (`engine/escaner.js`, con
  BarcodeDetector nativo o ZXing vendorizado), se buscan los datos
  (`engine/codigobarras.js`: memoria del teléfono → Open Food Facts → USDA
  FoodData Central) y se muestran macros por 100 g y por porción, el
  semáforo (umbrales FSA) y el veredicto: Tipo A apto · B con moderación ·
  C no apto para el día a día · D no apto (`engine/nutricion.js`). Si el
  producto no está en ninguna base, se le toma foto a la tabla nutricional
  (OCR local) y queda guardado con su código para la próxima vez, aun sin
  internet. Es la única parte de la app que usa red (solo para buscar
  códigos nuevos).
- `sw.js` / `manifest.webmanifest` — Service Worker que precachea todo
  (~70MB la primera vez) para que después funcione sin conexión.

## Por qué no es un solo archivo HTML

Tesseract.js y los workers WASM de Whisper no pueden cargar bajo `file://`
(el navegador bloquea `fetch`/Web Workers por CORS ahí). Tiene que servirse
por HTTP, aunque sea local.

## Probarlo en este equipo

```bash
npx serve -l 5500 .
```

Abrir `http://localhost:5500/`. La primera carga baja el modelo de Whisper
(~40MB) y los datos de Tesseract (~1MB); con el Service Worker activo,
las cargas siguientes funcionan sin red (probar con las DevTools en modo
"Offline").

## Publicarlo para el equipo (GitHub Pages)

1. Subir esta carpeta completa a un repo de GitHub.
2. Settings → Pages → Source: rama `main` (o la que se use), carpeta `/`
   (o `/CRCR_Campo_PWA` si queda anidada).
3. La cuadrilla abre esa URL una vez con wifi en la base, el navegador le
   ofrece "Agregar a pantalla de inicio" — desde ahí queda instalada como
   app y funciona sin conexión para siempre, hasta que se publique una
   actualización real (en cuyo caso hay que subir la versión de
   `CACHE_NAME` en `sw.js` para que el Service Worker la detecte).

## Qué falta verificar en un teléfono real

Todo lo de abajo se probó con Playwright en un navegador de escritorio real
(no es una suposición): navegación entre las 9 pestañas, algoritmo de
triage completo, buscador local, foto de cédula → OCR local → autocompletado,
grabación de audio → transcripción local con Whisper, Service Worker
activo, y persistencia de datos tras recargar la página — todo sin errores
de consola y sin ninguna llamada de red. Lo único que no se pudo probar
desde acá es el comportamiento real en un teléfono Android con Kiwi/Chrome
(rendimiento de Whisper en ese hardware, permisos de cámara/micrófono en
ese navegador específico, tamaño real de descarga en datos móviles) — antes
de usarlo con un paciente real, probarlo primero en un celular de verdad.
