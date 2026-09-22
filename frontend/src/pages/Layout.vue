<template>
    <main class="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <div class="mx-auto flex w-full max-w-4xl flex-col gap-8">
            <header class="text-center">
                <p
                    class="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600"
                >
                    Document processing
                </p>
                <h1
                    class="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl"
                >
                    JK tiny OCR
                </h1>
            </header>

            <section
                class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
            >
                <div class="mb-5">
                    <h2 class="text-lg font-semibold text-slate-900">
                        Añadir archivos
                    </h2>
                    <p class="mt-1 text-sm text-slate-500">
                        Selecciona o arrastra tus documentos aquí.
                    </p>
                </div>
                <DropZone
                    @selectedFiles="handleSelectedFiles"
                    @handleRemove="handleRemove"
                />
            </section>

            <section
                class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
            >
                <div class="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <h2 class="text-lg font-semibold text-slate-900">
                            Archivos seleccionados
                        </h2>
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
                        {{ loading ? "Procesando..." : "Procesar archivo" }}
                    </button>
                </div>

                <div v-if="files.length !== 0">
                    <FileTable
                        :files="files"
                        @selectFile="handleShowDetails"
                        @remove="handleRemove"
                    />
                </div>

                <div
                    v-if="loading || job?.status === 'done'"
                    class="mt-4 text-sm text-blue-600"
                >
                    <p v-if="computedProgress === null" role="status">
                        Preparando documento...
                    </p>
                    <p v-else-if="job?.status === 'done'" role="status">
                        Procesamiento completado
                    </p>
                    <div class="mt-2 flex items-center gap-3">
                        <Progress
                            class="min-w-0 flex-1"
                            :progress="computedProgress"
                        />
                        <div
                            v-if="computedProgress !== null"
                            class="shrink-0 text-right text-xs text-slate-500"
                        >
                            {{ computedProgress }}%
                        </div>
                    </div>
                </div>

                <div
                    v-if="job?.status === 'done'"
                    class="mt-4 text-sm text-green-600"
                >
                    <button
                        v-if="canDownload"
                        type="button"
                        :disabled="downloading"
                        @click="handleDownload"
                        class="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                    >
                        {{ downloading ? "Descargando..." : "Descargar" }}
                    </button>
                    <p v-else role="status" class="text-slate-600">
                        {{
                            job?.result_key
                                ? "Resultado listo para descargar."
                                : "El servicio no ha proporcionado un resultado descargable."
                        }}
                    </p>
                </div>

                <div
                    v-if="error || downloadError"
                    class="mt-4 text-sm text-red-600"
                    role="alert"
                >
                    {{ error || downloadError }}
                </div>
            </section>
        </div>
        <FileDetails :file="showDetails" @close="handleClose" />
    </main>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useOcr } from "@/composables/useOcr";
import { getResultUrl } from "@/api";
import DropZone from "@/components/DropZone.vue";
import FileTable from "@/components/FileTable.vue";
import FileDetails from "@/components/FileDetails.vue";
import { Progress } from "@/components/ui/progress";

const files = ref<File[]>([]);
const showDetails = ref<File | null>(null);

const { job, jobId, loading, error, upload } = useOcr();
const submittedFilename = ref("resultado.pdf");
const downloading = ref(false);
const downloadError = ref<string | null>(null);
const canDownload = computed(
    () =>
        typeof job.value?.text === "string" ||
        Boolean(job.value?.result_key && jobId.value),
);

const computedProgress = computed(() => {
    if (job.value?.status === "done") return 100;
    const processed = job.value?.pages_processed;
    const total = job.value?.total_pages;
    if (
        typeof processed !== "number" ||
        !Number.isFinite(processed) ||
        typeof total !== "number" ||
        !Number.isFinite(total) ||
        total <= 0
    )
        return null;
    return Math.max(0, Math.min(100, Math.round((processed / total) * 100)));
});
async function handleUpload() {
    const file = files.value[0];

    if (!file) return;

    submittedFilename.value = file.name;
    downloadError.value = null;
    await upload(file);
}

async function handleDownload() {
    if (!job.value || !canDownload.value || downloading.value) return;
    downloading.value = true;
    downloadError.value = null;
    try {
        let blob: Blob;
        if (typeof job.value.text === "string") {
            blob = new Blob([job.value.text], {
                type: "text/plain;charset=utf-8",
            });
        } else {
            // Only use our known endpoint, never a filesystem path or arbitrary URL from the job.
            const response = await fetch(getResultUrl(jobId.value!));
            if (!response.ok)
                throw new Error(
                    `No se pudo descargar el resultado: HTTP ${response.status}`,
                );
            if (
                !response.headers.get("content-type")?.startsWith("text/plain")
            ) {
                throw new Error(
                    "El servicio de descarga no ha devuelto un archivo de texto.",
                );
            }
            blob = await response.blob();
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${submittedFilename.value.replace(/\.[^.]+$/, "")}.txt`;
        document.body.append(link);
        link.click();
        link.remove();
        // Give the browser time to start consuming the blob before releasing it.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
        downloadError.value =
            err instanceof Error
                ? err.message
                : "No se pudo descargar el resultado";
    } finally {
        downloading.value = false;
    }
}

function handleRemove(index: number) {
    files.value.splice(index, 1);
}

function handleSelectedFiles(newFiles: File[]) {
    files.value = newFiles;
}

function handleShowDetails(file: File) {
    showDetails.value = file;
}

function handleClose() {
    showDetails.value = null;
}
</script>
