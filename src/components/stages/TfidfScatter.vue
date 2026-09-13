<template>
    <div class="absolute h-full w-full">
        <ScatterDiagram v-if="scatterData" ref="scatterRef" v-bind="scatterStageProps" />
    </div>
</template>

<script setup>
import * as d3 from 'd3'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import ScatterDiagram from '../ScatterDiagram.vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '@/components/composables/useDataStore';

const dataStore = useDataStore()
const { selectionGroups, stages, stopwords } = storeToRefs(dataStore)

const { id } = defineProps(["id"])
const scatterData = ref(null)
//scatterData: {maxX, minX, maxY, minY, positions}

onMounted(async () => {
    const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tfidf`, {
        credentials: 'include',
    })
    const data = await r.json()
    const maxX = Math.max(...data.map(d => d.x))
    const minX = Math.min(...data.map(d => d.x))
    const maxY = Math.max(...data.map(d => d.y))
    const minY = Math.min(...data.map(d => d.y))

    scatterData.value = {
        positions: data,
        maxX, minX, maxY, minY
    }

})

const scatterStageProps = computed(() => ({
    id: id,
    scatterData: scatterData.value,
    lassoOptions: {
        onLassoEnd
    }
}))

const selection = computed({
    get: () => selectionGroups.value.get(stages.value.get(id).selectionGroupId),
    set: (val) => selectionGroups.value.set(stages.value.get(id).selectionGroupId, val)
})

function onLassoEnd(selected) {
    const s = scatterData.value.positions.filter((e, i) => selected[i]).map(e => e.word)
    selection.value = s
}

const scatterRef = useTemplateRef('scatterRef')
watch([stopwords, selection], () => {
    applyColors()
}, { deep: true })
function applyColors() {
    const container = scatterRef.value?.container
    d3.select(container)
        .selectAll('g.scatter_point')
        .classed('text-info', d => selection.value?.includes?.(d.word))
        .classed('text-accent', d => stopwords.value.has(d.word))
        .classed('text-primary', d => selection.value?.includes?.(d.word) && stopwords.value.has(d.word))
        //.classed('opacity-20', d => {
        //    return stage.value?.searchSelection?.length > 0 && !stage.value?.searchSelection?.map(s => s.item).includes(d.word)
        //})
}
onMounted(() => applyColors())


</script>
