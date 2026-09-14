<template>
    <div class="absolute h-full w-full">
        <ScatterDiagram v-if="scatterData" ref="scatterRef" v-bind="scatterStageProps" />
    </div>
</template>

<script setup>
import * as d3 from 'd3'
import { computed, inject, onMounted, ref, useTemplateRef, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '@/components/composables/useDataStore';
import ScatterDiagram from '@/components/ScatterDiagram.vue';

const dataStore = useDataStore()
const { selectionGroups, stages, stopwords } = storeToRefs(dataStore)
const { getPipelineExclude  } = inject('injectPipelineState')

const { id } = defineProps(["id"])
const scatterData = ref(null)

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
    scatterData: {
        ...scatterData.value,
        positions: scatterData.value.positions?.filter(w => !getPipelineExclude().has(w.word)).slice(0, 1000) ?? [],
    },
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

</script>
