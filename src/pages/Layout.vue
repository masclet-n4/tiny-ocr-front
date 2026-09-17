<template>
  <div class="container mx-auto my-auto justify-center">
      <div class="text-4xl">JK tiny OCR</div>
      <DropZone @selectedFiles="handleSelectedFiles" @handleRemove="handleRemove" />
      <FileTable :files="files" @remove="handleRemove" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DropZone from '@/components/DropZone.vue';
import FileTable from '@/components/FileTable.vue';
const files = ref<File[]>([])

function handleRemove(index: number) {
  files.value = files.value.splice(index, 1)

}

function handleSelectedFiles(newFiles: File[]) {
  console.log("DESDE EL PADRE:", files)
  files.value = newFiles
}

</script>
