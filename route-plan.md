# Hoja de ruta — tiny-ocr-front

## Objetivo
Frontend Vue 3 (Composition API) + Tailwind v4 + shadcn-vue que sirva de interfaz al servicio OCR `tiny-ocr` (FastAPI en `:3000`): subir un PDF/imagen, seguir el estado del job y descargar el texto resultante.

## Backend de referencia (tiny-ocr)
- `POST /ocr/async` → `{job_id}` (requiere PocketBase en `:8090`)
- `GET /jobs/{job_id}` → `status` (`starting`/`processing`/`done`/`error`) + detalles (`filename`, `size`, `pages_processed`, `total_pages`, `pages_text_layer`, `avg_score`, `text` si ≤10k chars, `result_path` si >10k)
- `GET /results/{job_id}.txt` → descarga del resultado (solo existe si `result_path`)
- `GET /alive` → healthcheck
- Límite: 10 MB (HTTP 413)

## Decisiones
- **Flujo async** con polling (~2s) para el seguimiento de estado.
- **URLs relativas + proxy de Vite** a `localhost:3000` (sin CORS ni URLs hardcodeadas).
- **Drag & drop nativo** + `<input type="file">` (sin librería de dropzone).
- **shadcn-vue**: solo `button` y `progress`; el resto HTML plano + Tailwind.
- **Validación cliente**: tamaño ≤10 MB antes de subir.
- **Descarga**: si `text` viene en el job → blob `.txt`; si hay `result_path` → enlace a `/results/{id}.txt`.
- **Resultado**: mostrar texto en pantalla + botón descargar.

## Fases
1. **Setup Tailwind v4 + shadcn-vue** en el proyecto Vite existente.
   - Verificación: `npm run dev` muestra un botón con estilos shadcn.
2. **Proxy de Vite + módulo API** (`src/api.ts`: submitFile, getJob, getResultUrl).
   - Verificación: `curl localhost:5173/alive` responde `{"status":"alive"}`.
3. **Dropzone + selección de archivo** (drag & drop + click, validación 10 MB).
   - Verificación: arrastrar/seleccionar muestra nombre y tamaño; >10 MB muestra error.
4. **Enviar + polling de estado** (starting → processing → done/error).
   - Verificación: job real contra el backend llega a `done` y muestra progreso.
5. **Resultado + botón descargar + manejo de errores** (413, job error).
   - Verificación: descarga funciona en ambos casos (texto corto y largo) y los errores se muestran.

## Progreso
**Estimación actual: 70%** — el flujo principal de subida y polling ya está implementado; faltan los resultados y la verificación con el backend real.

- [x] **Fase 1 — Setup** Tailwind v4 + shadcn-vue (`button` + `progress` instalados, `@/lib/utils` en su sitio, `pnpm build` pasa con `navicenter`, build 108ms)
  - Nota: el CLI de shadcn mal-colocó `utils.ts` en `src/lib/new-york-v4/lib/utils.ts`; se copió a `src/lib/utils.ts` y se borró la subcarpeta.
- [x] **Fase 2 — Dropzone + selección**
  - Hecho: selección mediante `<input type="file">`, drag & drop nativo, listado de archivos, eliminación, vista de detalles y validación de PDF/imágenes de hasta 10 MB con mensajes de error.
- [x] **Fase 3 — Módulo `api.ts` + proxy**
  - Hecho: proxy de Vite configurado para `/alive`, `/ocr`, `/jobs` y `/results`.
  - Hecho: `src/api.ts` con `submitFile`, `getJob` y `getResultUrl`.
- [~] **Fase 4 — Envío + polling de estado**
  - Hecho: `src/composables/useOcr.ts` coordina la subida, guarda el job, consulta el estado cada 2 segundos y cancela el polling al desmontar el componente.
  - Hecho: `Layout.vue` incluye el botón de procesamiento y muestra `starting`, `processing` y `done`.
  - Pendiente: verificar el flujo completo contra el backend real y revisar el contrato del campo multipart (`file`).
- [~] **Fase 5 — Resultado + descargar + errores**
  - Hecho: los errores de subida, consulta y procesamiento se muestran en la interfaz.
  - Falta: mostrar el texto OCR cuando el job devuelve `text`.
  - Falta: añadir descarga del texto corto mediante `Blob`.
  - Falta: añadir descarga/enlace para resultados largos mediante `getResultUrl`.
  - Falta: mostrar detalles de progreso (`pages_processed`, `total_pages`, `avg_score`).

## Pendientes concretos
1. Probar `POST /ocr/async` y el polling con el backend y PocketBase activos.
2. Mostrar el resultado OCR en `Layout.vue`.
3. Añadir descarga para respuestas con `text` y para respuestas con `result_path`.
4. Mostrar progreso y metadatos del job.
5. Decidir si el botón procesa solo el primer archivo o si se implementa una cola para varios archivos.

## Riesgos / prerequisitos
- Backend `tiny-ocr` corriendo en `:3000` y **PocketBase en `:8090`** (el flujo async lo necesita).
- El setup de shadcn-vue + Tailwind v4 es lo más delicado; seguir la doc oficial al pie de la letra.

## Siguiente paso
Probar el flujo actual contra el backend real; después implementar la visualización y descarga del resultado OCR.
