<template>
    <div class="h-screen flex flex-col pb-6">
        <div class="font-typewriter flex items-center gap-2">
            <img class="h-12 w-12" src="/favicon.png" alt="">
            <p class="text-primary">STOPPERWARE</p>
        </div>

        <div class="flex flex-row gap-2 my-4 items-center">
            <FilePlusCorner class="size-10 rounded-sm p-2 hover:bg-base-200" @click="handleClickedNewSession" />
            <SaveAll v-show="!savefileLoading" class="size-10 rounded-sm p-2 hover:bg-base-200"
                :class="{ 'pointer-events-none': !canDownloadSavefile }"
                :style="{ opacity: canDownloadSavefile ? 1 : 0.6 }" @click="downloadSavefile" />
            <span v-show="savefileLoading"
                class="size-6 mx-2 text-neutral/50 loading loading-spinner loading-sm"></span>
            <Undo2 class="size-10 rounded-sm p-2 hover:bg-base-200" @click="undo()"
                :style="{ opacity: refHistoryState.canUndo ? 1 : 0.6 }" />
            <Redo2 class="size-10 rounded-sm p-2 hover:bg-base-200" @click="redo()"
                :style="{ opacity: refHistoryState.canRedo ? 1 : 0.6 }" />
        </div>

        <div class="border border-1 my-4 rounded-sm">
            <PipelineDiagram :pipelines="orderedPipelines.slice(1, -1)" />
        </div>

        <div class="grow flex flex-col min-h-0">
            <h2 class="text-sm font-bold">DEPENDENCIES</h2>

            <div class="my-4">
                <p class="text-[12px]">{{ stopwords.size }} Stopwords selected</p>
                <p class="text-[12px]">{{ sizeReduction }}% Corpus size reduction </p>
            </div>

            <div
                class="text-[10px] border border-1 rounded-sm p-4 flex flex-wrap items-start content-start gap-2 flex-1 overflow-auto min-h-48">
                <span class="bg-base-200 font-bold flex p-1 items-center gap-1 rounded-md"
                    v-for="d in Array.from(stopwords).sort()">
                    <span class="">{{ d }}</span>
                    <X :size=16 @click="stopwords.delete(d)" />
                </span>
            </div>

            <button class="btn btn-primary btn-outline btn-wide my-2" @click="downloadStopwords">Export List
                <FileDown />
            </button>
        </div>

        <div class="my-8">
            <h2 class="text-sm font-bold">DEPENDENCIES</h2>
            <ServerStateDisplay />
        </div>
    </div>


    <div>
        <h1>Dev</h1>

        <p v-for="p in orderedPipelines">{{ p.stages }}</p> -->

        <button class="min-w-0 shrink  btn" @click="initializeDataStore()">init</button>
        <button class="min-w-0 shrink  btn" @click="clearLocalStorage()">clear</button>
    </div>


</template>

<script setup>
import { ref, computed, inject, onMounted, toRaw } from 'vue';
import ServerStateDisplay from "@/components/ServerStateDisplay.vue"
import PipelineDiagram from "@/components/PipelineDiagram.vue";
import { FileDown, FilePlusCorner, Redo2, SaveAll, Undo2, X } from "@lucide/vue";
import { REQUEST_STATUS } from './composables/Dependency';
import { serializeDataStore, useDataStore } from './composables/useDataStore';
import { storeToRefs } from 'pinia';
import { useDependencyStore } from './composables/useDependencyStore';

const dataStore = useDataStore()
const { initializeDataStore, refHistoryFuncs } = dataStore
const { stagePipelines, stopwords, refHistoryState } = storeToRefs(dataStore)

const dependencyStore = useDependencyStore()
const { requestDependencies } = storeToRefs(dependencyStore)
const { undo, redo } = refHistoryFuncs
const orderedPipelines = computed(() => [...stagePipelines.value.values()].sort((a, b) => a.position - b.position))

const sizeReduction = computed(() => {
    const d = requestDependencies.value['wordcount']
    if (d.requestStatus !== REQUEST_STATUS.AVAILABLE) return null
    const wordcount = d.data
    const total = wordcount.reduce((acc, w) => acc += w.count, 0)

    const filtered = wordcount.filter(w => stopwords.value.has(w.word)).reduce((acc, w) => acc += w.count, 0)

    return (filtered / total * 100).toFixed(2)
})

function clearLocalStorage() {
    localStorage.clear()
    location.reload()
}

function downloadStopwords() {
    const text = stopwords.value.values().join('\n').trim()
    var blob = new Blob([text], { type: "text/txt" });
    downloadBlob(blob, 'stopwords.txt')
}


import { useCookies } from '@vueuse/integrations/useCookies'

const cookies = useCookies(['stopperware_session_id'])
const sessionId = computed(() => cookies.get('stopperware_session_id', { doNotParse: true }) ?? null)
const canDownloadSavefile = computed(() => !!sessionId.value && !savefileLoading.value)
const savefileLoading = ref(false)
const savefileError = ref(null)


const savefileData = useStorage('stopperwareLocalData', '', localStorage, {
    writeDefaults: false,
    listenToStorageChanges: true,
})

async function downloadSavefile() {
    if (!canDownloadSavefile.value) return

    savefileLoading.value = true
    savefileError.value = null
    try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/downloadSavefile`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serializeDataStore(dataStore)),
        })
        if (!res.ok) throw new Error(`Savefile request failed: ${res.status} ${res.statusText}`)

        downloadBlob(await res.blob(), `${sessionId.value}.zip`)
    } catch (err) {
        savefileError.value = err
        useStatus().setStatus(`Failed to download savefile ${err}`, 'error')
    } finally {
        savefileLoading.value = false
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    link.click()
    URL.revokeObjectURL(url)
}

import { useConfirm } from '@/components/composables/useConfirm'
import { useStorage } from '@vueuse/core';
import { useStatus } from './composables/useStatus';
async function handleClickedNewSession() {
    const { confirm } = useConfirm()
    const ok = await confirm('Are you sure you want to start a new session? Consider saving your old session')
    if (ok) {
        localStorage.clear()
        cookies.remove('stopperware_session_id', { path: '/' })
        location.reload()
    }
}

onMounted(() => {
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "z") {
            e.preventDefault();
            e.stopPropagation()
            undo();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === "y") {
            e.preventDefault();
            e.stopPropagation()
            redo();
        }

    })
})


</script>
