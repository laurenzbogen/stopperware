<template>
    <div class="relative h-[230px]">
        <div v-bind="getRootProps()"
            :class="`absolute top-0 left-0 bottom-0 right-0 ${isDragActive ? 'bg-secondary/20' : 'bg-none'} p-2`">
            <div v-if="!file" class="size-full flex justify-center items-center">
                <p class="font-bold">Drag .txt file to use stopwords</p>
            </div>

            <template v-else>
                <p class="my-2 font-bold text-sm">{{ file.name }}</p>
                <p class="my-2">List of <span class="font-bold text-accent">{{ file.content.length }}</span> Stopword{{
                    file.content.length !== 1 ? 's' : '' }}</p>
                <div class="my-6 flex justify-around">
                    <div>
                        <progress class="progress w-56" :value="corpusPercentage" max="100"></progress>
                        <p class="text-[12px]"><span class="font-bold">{{ Math.round(corpusPercentage) }}%</span> of
                            List are in Corpus</p>
                    </div>
                    <div>
                        <progress class="progress progress-accent w-56" :value="stopwordsPercentage"
                            max="100"></progress>
                        <p class="text-[12px]"><span class="font-bold text-accent">{{ Math.round(stopwordsPercentage)
                                }}%</span> of List are Stopwords</p>
                    </div>
                </div>


                <SmallButton @click="setOperationStopwords(new Set(file.content), 'union')">
                    <SquaresUnite />
                </SmallButton>
                <SmallButton @click="setOperationStopwords(new Set(file.content), 'difference')">
                    <SquaresSubtract />
                </SmallButton>
                <SmallButton @click="setOperationStopwords(new Set(file.content), 'intersection')">
                    <SquaresIntersect />
                </SmallButton>

            </template>

        </div>
    </div>
</template>

<script setup>
import SmallButton from '../design/SmallButton.vue';
import { SquaresUnite } from '@lucide/vue';
import { SquaresSubtract } from '@lucide/vue';
import { SquaresIntersect } from '@lucide/vue';

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
