<template>
    <div class="absolute h-full w-full">
        <ScatterDiagram v-if="scatterPositions" ref="scatterRef" v-bind="scatterStageProps" />
    </div>
</template>

<script setup>
import * as d3 from 'd3'
import { computed, inject, onMounted, ref, useTemplateRef, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '@/components/composables/useDataStore';
import ScatterDiagram from '@/components/ScatterDiagram.vue';

const dataStore = useDataStore()
const { selectionGroups, stages } = storeToRefs(dataStore)
const { getPipelineExclude } = inject('injectPipelineState')

const { id, dependencyData } = defineProps(["id", "dependencyData"])

const scatterPositions = computed(() => dependencyData['tfidf'])

const scatterStageProps = computed(() => ({
    id,
    scatterPositions: scatterPositions.value,
    lassoOptions: {
        onLassoEnd
    }
}))

const selection = computed({
    get: () => selectionGroups.value.get(stages.value.get(id).selectionGroupId),
    set: (val) => selectionGroups.value.set(stages.value.get(id).selectionGroupId, val)
})

function onLassoEnd(selected) {
    const s = scatterPositions.value.filter((e, i) => selected[i]).map(e => e.word)
    selection.value = s
}

</script>
