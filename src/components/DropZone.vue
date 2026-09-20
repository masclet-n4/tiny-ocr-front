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

   <p class="text-sm text-gray-500">PDF o imagen, máximo 10 MB por archivo.</p>

   <p v-if="error" class="mt-3 text-sm font-medium text-red-600" role="alert">
     {{ error }}
   </p>

   <ul>
       <li v-for="(file, index) in files" :key="index">{{ file.name }}</li>
   </ul>
</label>
</template>

<script setup lang="ts">
 import { ref, watch } from 'vue'

 const MAX_FILE_SIZE = 10 * 1024 * 1024

const emit = defineEmits<{
  selectedFiles: [files: File[]]
  handleRemove: [index: number]
}>()

 const files = ref<File[]>([])
 const dragging = ref(false)
 const error = ref('')

watch(files, (newFiles) => {
  if(newFiles) emit('selectedFiles', newFiles)
})

 function addFile(newFile: FileList | null) {
   if (!newFile) return

   const validFiles: File[] = []
   const invalidFiles: string[] = []

   for (const file of newFile) {
     const validType = file.type === 'application/pdf' || file.type.startsWith('image/')
     const validSize = file.size <= MAX_FILE_SIZE

     if (validType && validSize) {
       validFiles.push(file)
     } else {
       invalidFiles.push(file.name)
     }
   }

   files.value = [...files.value, ...validFiles]
   error.value = invalidFiles.length
     ? `No se han añadido: ${invalidFiles.join(', ')}. Solo se aceptan PDF o imágenes de hasta 10 MB.`
     : ''
 }

function onDrop(event: DragEvent) {
  dragging.value = false
  addFile(event.dataTransfer?.files ?? null)
}
</script>
