<template>
    <div class="absolute h-full w-full">
        <ScatterDiagram v-if="embeddingScatter" ref="scatterRef" v-bind="scatterStageProps" />
    </div>
</template>

<script setup>
import { computed, inject, provide, ref, watch } from 'vue'
import { onMounted, useTemplateRef } from 'vue';
import * as d3 from 'd3'
import { useData } from '@/components/composables/useData'
import SuperJSON from 'superjson';
import ScatterDiagram from '../ScatterDiagram.vue';

const { id } = defineProps(["id"])
const { pipeline, changeStageFilter, getCumulativeFilter } = inject('injectPipelineState')
const { data, onWordContextMenu, requestDependencies } = inject('injectGlobalState')
const selection = computed({
    get: () => data.value.selectionGroups.get(data.value.stages.get(id).selectionGroupId),
    set: (val) => data.value.selectionGroups.set(data.value.stages.get(id).selectionGroupId, val)
})

const stageSelection = ref([])
const currentFilter = computed(() => getCumulativeFilter(id))
const embeddingScatter = computed(() => requestDependencies.value['embeddingScatter'].data)

const scatterStageProps = computed(() => ({
    id: id,
    scatterData: embeddingScatter.value,
    lassoOptions: {
        onLassoEnd
    },
    onWordContextMenu
}))

const scatterRef = useTemplateRef('scatterRef')
const stage = computed(() => data.value.stages.get(id))
watch([stage, () => data.value.stopwords, selection], () => {
    applyColors()
}, { deep: true })
function applyColors() {
    const container = scatterRef.value?.container
    d3.select(container)
        .selectAll('g.scatter_point')
        .classed('text-info', d => selection.value?.includes?.(d.word))
        .classed('text-accent', d => data.value.stopwords.has(d.word))
        .classed('text-primary', d => selection.value?.includes?.(d.word) && data.value.stopwords.has(d.word))
        .classed('opacity-20', d => {
            return stage.value?.searchSelection?.length > 0 && !stage.value?.searchSelection?.map(s => s.item).includes(d.word)
        })
}
onMounted(() => applyColors(stage.value))

watch(() => stage.value.searchSelection, (val) => {
    if (!val) return
    scatterRef.value.zoomIntoView(val.map(w => w.item))

})


function onLassoEnd(selected) {
    const s = embeddingScatter.value.positions.filter((e, i) => selected[i]).map(e => e.word)
    selection.value = s
}

function handleContextMenu(e) {
    e.preventDefault()
    let newOptions = {}
    if (stageSelection.value.length > 0) {
        newOptions = {
            id, selection: stageSelection.value, x: e.clientX, y: e.clientY, show: true,
        }

    } else if (e.target.nodeName == "text") {
        newOptions = {
            id, selection: [e.target.innerHTML], x: e.clientX, y: e.clientY, show: true,
        }
    } else {
        //TODO
    }
    onWordContextMenu(e, newOptions)
}



</script>
