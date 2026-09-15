<template>
    <div v-show="menuOptions.show" ref="container" class="z-200 fixed left-0 top-0" :style="{
        translate: `${menuOptions.x}px ${menuOptions.y}px`
    }">
        <ul class="menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
            <li>{{ menuWords.length == 1 ? menuWords[0] : `${menuWords.length} items
                selected` }}</li>

            <li v-show="stopwordsAdd"><span @click=" setOperationStopwords(new Set(menuWords), 'union')">Stopwords
                    Add</span></li>
            <li v-show="!stopwordsAdd"><span
                    @click=" setOperationStopwords(new Set(menuWords), 'difference')">Stopwords Remove</span></li>
            <li>
                <span @click="() => menuFindSimilarWords(menuWords[0])">Find Similar Words</span>
            </li>

            <li>
                <span @click="setOperationPipelineExclude(new Set(menuWords), 'union', pipelineId)">Filter in this Pipeline</span>
            </li>
        </ul>

    </div>

</template>
<script setup>
import { computed } from 'vue';
import { useDataStore } from './composables/useDataStore';
import { storeToRefs } from 'pinia';


const dataStore = useDataStore()
const { addPipeline, addStage, setOperationStopwords, setOperationPipelineExclude } = dataStore
const { stopwords, stagePipelines } = storeToRefs(dataStore)
const { menuOptions } = defineProps(["menuOptions"])

const menuWords = computed(() => menuOptions.menuWords)
const stopwordsAdd = computed(() => menuWords.value.some(w => !stopwords.value.has(w)))
const pipelineId = computed(() => menuOptions.pipelineId)

const emit = defineEmits(["selected"])

function menuFindSimilarWords(word) {
    const pipelineId = addPipeline()
    addStage('SimilarWords', pipelineId, { similarKey: word })
}


window.addEventListener("click", () => menuOptions.show = false)

</script>
