<template>
    <p>OVERVIEW</p>

    <div class="flex flex-row p-2 w-52">
        <button :class="`min-w-0 shrink btn ${canUndo ? 'btn-active' : 'btn-disabled'}`" @click="undo()">
            <Undo2 />
        </button>
        <button :class="`min-w-0 shrink btn ${canRedo ? 'btn-active' : 'btn-disabled'}`" @click="redo()">
            <Redo2 />
        </button>
        <button class="min-w-0 shrink  btn" @click="initializePipelines">init</button>
        <button class="min-w-0 shrink  btn" @click="clearLocalStorage()">clear</button>
    </div>

    <div class="border border-1 my-4">
        <PipelineDiagram :pipelines="orderedPipelines.slice(1, -1)" />
    </div>

    <div class="my-4">
        <p class="mb-2 text-primary-content/100">{{ data.stopwords.size }} Stopwords selected</p>
        <button @click="downloadSavefile" class="btn">
            <SaveAll />
        </button>
        <button @click="downloadStopwords" class="btn">
            <FileDown />
        </button>

    </div>


    <div class="my-8">
        <h2 class="text-sm font-bold">DEPENDENCIES</h2>
        <DependencyOverview />
    </div>


    {{ data.stopwords }}

    <p v-for="p in orderedPipelines">{{ p.stages }}</p> -->
</template>

<script setup>
import { computed, inject } from 'vue';
import DependencyOverview from "@/components/DependencyOverview.vue";
import PipelineDiagram from "@/components/PipelineDiagram.vue";
import { FileDown, Redo2, SaveAll, Undo2 } from "@lucide/vue";
import SuperJSON from 'superjson';

const { data, updateStageState, initializePipelines, refHistory } = inject('injectGlobalState')
const { undo, redo, canUndo, canRedo } = refHistory
const orderedPipelines = computed(() => [...data.value.stagePipelines.values()].sort((a, b) => a.position - b.position))

function clearLocalStorage() {
    localStorage.clear()
    location.reload()

}

function downloadStopwords() {
    const text = data.value.stopwords.values().join('\n').trim()
    var blob = new Blob([text], { type: "text/txt" });
    downloadBlob(blob, 'stopwords.txt')
}

async function downloadSavefile() {
    const json = SuperJSON.stringify(data.value)
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/downloadSavefile`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: json,
    })
    if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
    }
    const blob = await response.blob()
    const filename = getFilename(response)

    downloadBlob(blob, filename)
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    link.click()
    URL.revokeObjectURL(url)
}

function getFilename(response) {
    const disposition = response.headers.get('Content-Disposition')
    if (!disposition) return null
    // matches filename="foo.zip" or filename*=UTF-8''foo.zip
    const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)
    return match ? decodeURIComponent(match[1].replace(/"$/, '')) : null
}

</script>
