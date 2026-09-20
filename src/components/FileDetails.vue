<template>
  <div
    v-if="file"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
    @click.self="close"
  >
    <div
      class="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-details-title"
    >
      <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-wider text-blue-600">Detalles</p>
          <h2 id="file-details-title" class="mt-1 truncate text-xl font-semibold text-slate-900">
            {{ file.name }}
          </h2>
        </div>

        <button
          type="button"
          class="shrink-0 rounded-lg p-2 text-2xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Cerrar modal"
          @click="close"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div class="p-6">
        <div class="flex h-72 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
          <FilePreview :file="file" />
        </div>

        <dl class="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Nombre</dt>
            <dd class="mt-1 truncate text-sm font-medium text-slate-900">{{ file.name }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Tamaño</dt>
            <dd class="mt-1 text-sm font-medium text-slate-900">
              {{ (file.size / 1024 / 1024).toFixed(2) }} MB
            </dd>
          </div>
        </dl>

        <div class="mt-6 text-sm text-slate-600">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import FilePreview from './FilePreview.vue';

const props = defineProps<{
  file: File | null
}>()

const emit = defineEmits<{
  close: []
}>()

function close() {
  emit('close')
}
</script>
