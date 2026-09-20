<template>
  <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-6 py-3 text-left font-semibold uppercase tracking-wider text-slate-600">
              Name
            </th>
            <th class="px-6 py-3 text-left font-semibold uppercase tracking-wider text-slate-600">
              Size
            </th>
            <th class="px-6 py-3 text-right font-semibold uppercase tracking-wider text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="(file, index) in props.files"
            :key="`${file.name}-${file.lastModified}`"
            class="transition-colors hover:bg-slate-50"
          >
            <td class="max-w-xs truncate px-6 py-4 font-medium text-slate-900"
              @click="handleSelectFile(file)">
              {{ file.name }}
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-slate-500">
              {{ (file.size / 1024 / 1024).toFixed(2) }} MB
            </td>
            <td class="px-6 py-4 text-right">
              <button
                type="button"
                class="rounded-md px-3 py-1.5 font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                @click="removeFile(index)"
              >
                Remove
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  files: File[]
}>()

const emit = defineEmits<{
  'remove': [number]
  'selectFile': [File]
}>()

function removeFile(index: number) {
  emit('remove', index)
}

function handleSelectFile(file: File) {
  emit('selectFile', file)
}


</script>
