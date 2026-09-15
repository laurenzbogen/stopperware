<template>
    <div class="relative h-[230px]">
        <div v-bind="getRootProps()" :class="[
            'absolute top-0 left-0 bottom-0 right-0 rounded-xl border-2 border-dashed p-4 transition-all duration-200',
            isDragActive
                ? 'bg-secondary/20 border-secondary scale-[1.01]'
                : 'bg-base-200/40 border-base-300 hover:border-base-content/20'
        ]">
            <div v-if="!file" class="size-full flex flex-col justify-center items-center gap-2 text-center">
                <UploadCloud class="size-6 opacity-40" />
                <p class="font-bold text-sm opacity-70">Drag a .txt file to use stopwords</p>
                <p class="text-xs opacity-40">One word per line</p>
            </div>

            <template v-else>
                <div class="flex items-center justify-between gap-2">
                    <p class="font-bold text-sm truncate" :title="file.name">{{ file.name }}</p>
                    <div class="flex items-center gap-1.5">
                        <span
                            class="badge badge-sm whitespace-nowrap border-accent text-accent-content transition-colors duration-300"
                            :style="{ backgroundColor: `color-mix(in srgb, var(--color-accent) ${Math.max(stopwordsPercentage, 15)}%, transparent)` }">
                            {{ file.content.length }} word{{ file.content.length !== 1 ? 's' : '' }}
                        </span>
                        <button class="cursor-auto btn btn-ghost btn-xs rounded-sm" @click="file = null">
                            <X class="size-3.5" />
                        </button>
                    </div>
                </div>

                <div class="my-5 flex justify-around gap-4">
                    <div class="flex-1 max-w-56">
                        <div class="flex justify-between items-baseline mb-1">
                            <p class="text-[11px] font-medium opacity-60">In Corpus</p>
                            <p class="text-[12px] font-bold">{{ Math.round(corpusPercentage) }}%</p>
                        </div>
                        <progress class="progress w-full" :value="corpusPercentage" max="100"></progress>
                    </div>
                    <div class="flex-1 max-w-56">
                        <div class="flex justify-between items-baseline mb-1">
                            <p class="text-[11px] font-medium opacity-60">Already Stopwords</p>
                            <p class="text-[12px] font-bold text-accent">{{ Math.round(stopwordsPercentage) }}%</p>
                        </div>
                        <progress class="progress progress-accent w-full" :value="stopwordsPercentage"
                            max="100"></progress>
                    </div>
                </div>

                <div class="flex items-center justify-center gap-3 pt-1">
                    <SmallButton @click="setOperationStopwords(new Set(file.content), 'union')">
                        <SquaresUnite class="size-4" />
                    </SmallButton>
                    <SmallButton @click="setOperationStopwords(new Set(file.content), 'difference')">
                        <SquaresSubtract class="size-4" />
                    </SmallButton>
                    <SmallButton @click="setOperationStopwords(new Set(file.content), 'intersection')">
                        <SquaresIntersect class="size-4" />
                    </SmallButton>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup>
import SmallButton from '../design/SmallButton.vue';
import { SquaresUnite } from '@lucide/vue';
import { SquaresSubtract } from '@lucide/vue';
import { SquaresIntersect } from '@lucide/vue';
import { UploadCloud } from '@lucide/vue';
import { X } from '@lucide/vue';

import { hashString } from "@/helpers";
import { computed, hydrate, inject, onMounted, ref, watch } from "vue";
import { useDropzone } from "vue3-dropzone";
const { getRootProps, isDragActive } = useDropzone({ onDrop });

import { useDataStore } from '@/components/composables/useDataStore';
import { storeToRefs } from 'pinia';
import { useDependencyStore } from '../composables/useDependencyStore';
import { useState } from '../composables/useState';

const { id } = defineProps(["id", "stage"])

// === DEPENDENCIES ===
const dependencyStore = useDependencyStore()
const { requestDependencies } = storeToRefs(dependencyStore)

const corpusWords = computed(() => new Set(requestDependencies.value['wordcount'].data.map(w => w.word)))


// === STATE ===

const dataStore = useDataStore()
const { updateStageState, setOperationStopwords } = dataStore
const { stopwords, stagesStateHistory } = storeToRefs(dataStore)
const { file } = useState(id, {
    file: { default: null, history: true }
})


// ===


const { globalDropzoneEnabled } = inject('injectGlobalState')
watch(isDragActive, (val, oldVal) => {
    if (val === true && oldVal === false) {
        globalDropzoneEnabled.value = false
    }
    if (val === false && oldVal === true) {
        setTimeout(() => {
            globalDropzoneEnabled.value = true
        }, 200)
    }
})


const corpusPercentage = computed(() => (file.value.content.reduce((count, item) => count + (corpusWords.value.has(item) ? 1 : 0), 0) / file.value.content.length) * 100)
const stopwordsPercentage = computed(() => (file.value.content.reduce((count, item) => count + (stopwords.value.has(item) ? 1 : 0), 0) / file.value.content.length) * 100)




async function onDrop(acceptFiles, rejectReasons) {
    for (let f of acceptFiles) {
        const t = await f.text()
        const id = await hashString(t)
        const newFile = { content: t.trim().split('\n'), name: f.name }
        file.value = newFile
    }
}

</script>
