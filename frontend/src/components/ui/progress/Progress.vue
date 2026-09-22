<template>
    <div
        class="h-3 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label="Progreso del OCR"
        :aria-valuenow="value ?? undefined"
        :aria-valuetext="value === null ? 'Preparando documento' : `${value}%`"
        :aria-valuemin="0"
        :aria-valuemax="100"
    >
        <div
            class="h-full rounded-full bg-blue-600 transition-[width] duration-300 motion-reduce:transition-none"
            :class="{ 'animate-pulse motion-reduce:animate-none': value === null }"
            :style="{ width: value === null ? '100%' : `${value}%` }"
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ progress: number | null }>()
const value = computed(() => props.progress !== null && Number.isFinite(props.progress)
    ? Math.min(100, Math.max(0, props.progress))
    : null)
</script>
