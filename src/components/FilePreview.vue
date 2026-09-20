<template>
<div class="flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100 p-4">
   <img
     v-if="imageUrl"
     :src="imageUrl"
     :alt="file.name"
     class="rounded object-contain shadow"
   />

   <div
     v-else-if="file.type === 'application/pdf'"
     class="flex min-h-0 w-full items-center justify-between gap-3"
   >
     <button
       type="button"
       :disabled="pageNumber === 1"
       aria-label="Página anterior"
       class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-2xl text-slate-600 shadow transition hover:bg-slate-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
       @click="handlePageChange(-1)"
       >
       <span aria-hidden="true">‹</span>
     </button>

     <div class="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden">
       <canvas
         ref="canvas"
         class="h-auto max-h-60 max-w-full rounded bg-white shadow"
       />
     </div>

     <button
       type="button"
       :disabled="pageNumber === totalPages"
       aria-label="Página siguiente"
       class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-2xl text-slate-600 shadow transition hover:bg-slate-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
       @click="handlePageChange(1)"
       >
       <span aria-hidden="true">›</span>
     </button>
   </div>

   <p v-else class="text-sm text-slate-500">
     No hay preview disponible para este archivo.
   </p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api'

const props = defineProps<{
  file: File
}>()


const canvas = ref<HTMLCanvasElement | null>(null)
const imageUrl = ref<string | null>(null)
const pageNumber = ref<number>(1)
const totalPages = ref<number>(0)
let pdfDocument: PDFDocumentProxy | null = null
let loadedFile: File | null = null
let renderTask: { cancel: () => void; promise: Promise<void> } | null = null
let previewRequest = 0


async function loadPreview() {
  const request = ++previewRequest
  imageUrl.value = null

  if (props.file.type.startsWith('image/')) {
    imageUrl.value = URL.createObjectURL(props.file)
    return
  }

  if (props.file.type === 'application/pdf' && canvas.value) {
    if (loadedFile !== props.file) {
      await destroyPdf()
      loadedFile = props.file
    }

    const [pdfjsLib, { default: pdfWorker }] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])

    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

    if (!pdfDocument) {
      const buffer = await props.file.arrayBuffer()
      const document = await pdfjsLib.getDocument({ data: buffer }).promise
      if (request !== previewRequest) {
        document.cleanup()
        return
      }
      pdfDocument = document
    }

    if (request !== previewRequest || !canvas.value) return

    const page = await pdfDocument.getPage(pageNumber.value)

    const viewport = page.getViewport({ scale: 0.7 })
    const context = canvas.value.getContext('2d')

    if (!context) return

    canvas.value.width = viewport.width
    canvas.value.height = viewport.height

    renderTask?.cancel()
    renderTask = page.render({
      canvasContext: context,
      canvas: canvas.value,
      viewport,
    })

    try {
      await renderTask.promise
    } catch (error) {
      if ((error as { name?: string }).name !== 'RenderingCancelledException') throw error
      return
    }

    if (request === previewRequest) totalPages.value = pdfDocument.numPages
  }
}

async function destroyPdf() {
  renderTask?.cancel()
  renderTask = null
  const documentToDestroy = pdfDocument
  pdfDocument = null
  loadedFile = null
  totalPages.value = 0
  documentToDestroy?.cleanup()
}

watch(
  () => [props.file, pageNumber.value],
  () => {
    if (imageUrl.value) {
      URL.revokeObjectURL(imageUrl.value)
    }

    loadPreview()
  },
)

onMounted(loadPreview)


function handlePageChange(delta: number) {
  if (pageNumber.value + delta < 1) return
  pageNumber.value += delta
}

onBeforeUnmount(() => {
  previewRequest++
  void destroyPdf()
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
})

</script>
