<template>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Size</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(file, index) in props.files" :key="file.name">
        <td>{{ file.name }}</td>
        <td>{{ file.size }}</td>
        <td>
          <button @click="removeFile(index)">Remove</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
const props = defineProps<{
  files: File[]
}>()

const emit = defineEmits<{
  'remove': [number]
}>()

function removeFile(index: number) {
  emit('remove', index)
}

console.log("tachan", props.files)
</script>
