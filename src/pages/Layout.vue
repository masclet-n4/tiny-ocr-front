<template>
  <main class="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
    <div class="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <header class="text-center">
        <p class="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          Document processing
        </p>
        <h1 class="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          JK tiny OCR
        </h1>
      </header>

      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div class="mb-5">
          <h2 class="text-lg font-semibold text-slate-900">Añadir archivos</h2>
          <p class="mt-1 text-sm text-slate-500">Selecciona o arrastra tus documentos aquí.</p>
        </div>
        <DropZone @selectedFiles="handleSelectedFiles" @handleRemove="handleRemove" />
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Archivos seleccionados</h2>
            <p class="mt-1 text-sm text-slate-500">
              {{ files.length }} archivo(s) preparado(s).
            </p>
          </div>

          <button
            type="button"
            :disabled="files.length === 0 || loading"
            class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleUpload"
          >
            {{ loading ? 'Procesando...' : 'Procesar archivo' }}
          </button>
        </div>

        <div v-if="files.length !== 0">
          <FileTable
            :files="files"
            @selectFile="handleShowDetails"
            @remove="handleRemove"
          />
        </div>

        <div v-if="loading" class="mt-4 text-sm text-blue-600">
          Estado: {{ job?.status ?? 'starting' }}
        </div>

        <div v-if="job?.status === 'done'" class="mt-4 text-sm text-green-600">
          Procesamiento completado.
        </div>

        <div v-if="error" class="mt-4 text-sm text-red-600" role="alert">
          {{ error }}
        </div>
      </section>

    </div>
    <FileDetails :file="showDetails" @close="handleClose"/>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useOcr } from '@/composables/useOcr';
import DropZone from '@/components/DropZone.vue';
import FileTable from '@/components/FileTable.vue';
import FileDetails from '@/components/FileDetails.vue';

const files = ref<File[]>([])
const showDetails = ref<File | null>(null)

const { job, loading, error, upload } = useOcr()

async function handleUpload() {
  const file = files.value[0]

  if (!file) return

  await upload(file)
}




function handleRemove(index: number) {
  files.value.splice(index, 1)
}

function handleSelectedFiles(newFiles: File[]) {
  files.value = newFiles
}

function handleShowDetails(file: File) {
  showDetails.value = file
}

function handleClose() {
  showDetails.value = null
}

</script>
