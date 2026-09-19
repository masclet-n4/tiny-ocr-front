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
            <p class="mt-1 text-sm text-slate-500">{{ files.length }} archivo(s) preparado(s).</p>
          </div>
        </div>
        <div v-if="files.length !== 0">
            <FileTable :files="files" @remove="handleRemove" />
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DropZone from '@/components/DropZone.vue';
import FileTable from '@/components/FileTable.vue';
const files = ref<File[]>([])

function handleRemove(index: number) {
  files.value.splice(index, 1)
}

function handleSelectedFiles(newFiles: File[]) {
  files.value = newFiles
}

</script>
