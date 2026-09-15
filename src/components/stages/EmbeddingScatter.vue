<template>
    <div class="absolute h-full w-full">
        <ScatterDiagram v-if="scatterPositions" ref="scatterRef" v-bind="scatterStageProps" />
    </div>
</template>

<script setup>


import { useDataStore } from '../composables/useDataStore';
import { computed, inject, ref, watch } from 'vue'
import { useTemplateRef } from 'vue';

import ScatterDiagram from '@/components/ScatterDiagram.vue';
import { storeToRefs } from 'pinia';
const { id, dependencyData } = defineProps(["id", "dependencyData"])

const dataStore = useDataStore()
const { selectionGroups, stages, stopwords } = storeToRefs(dataStore)

// === DEPENDENCIES ===
const scatterPositions = computed(() => dependencyData['embeddingScatter'])


// ===
const scatterStageProps = computed(() =>({
    id: id,
    scatterPositions: scatterPositions.value,
    lassoOptions: {
        onLassoEnd
    },
}))


const scatterRef = useTemplateRef('scatterRef')
//TODO searchSelection teil von state? 
const stage = computed(() => stages.value.get(id))
watch(() => stage.value.searchSelection, (val) => {
    if (!val) return
    scatterRef.value.zoomIntoView(val.map(w => w.item))
})


function onLassoEnd(selected) {
    //Selected is boolean array der form scatterData.positions
    const s = scatterPositions.value.filter((e, i) => selected[i]).map(e => e.word)
    selectionGroups.value.set(stage.value.selectionGroupId, s)
}

</script>
