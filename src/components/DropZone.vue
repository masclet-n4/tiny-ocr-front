<template>
<label
  class="block cursor-pointer rounded-lg border-2 border-dashed p-8 text-center"
  :class="dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'"
  @dragover.prevent="dragging = true"
  @dragleave.prevent="dragging = false"
  @drop.prevent="onDrop"
>
  <input
    class="hidden"
    type="file"
    accept=".pdf,image/*"
    @change="addFile(($event.target as HTMLInputElement).files)"
  />

  <ul>
      <li v-for="(file, index) in files" :key="index">{{ file.name }}</li>
  </ul>
</label>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const emit = defineEmits<{
  selectedFiles: [files: File[]]
  handleRemove: [index: number]
}>()

const files = ref<File[]>([])
const dragging = ref(false)

watch(files, (newFiles) => {
  if(newFiles) emit('selectedFiles', newFiles)
})

function addFile(newFile: FileList | null) {
  if(newFile) files.value = [...files.value, ...newFile]
}

function handleRemove(index: number) {
  files.value.splice(index, 1)
}

function onDrop() {
  dragging.value = false
}
</script>
