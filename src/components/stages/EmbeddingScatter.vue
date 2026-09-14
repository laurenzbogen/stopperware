<template>
    <div class="absolute h-full w-full">
        <ScatterDiagram v-if="embeddingScatter" ref="scatterRef" v-bind="scatterStageProps" />
    </div>
</template>

<script setup>

import { useDataStore } from '../composables/useDataStore';
import { computed, inject, ref, watch } from 'vue'
import { useTemplateRef } from 'vue';

import ScatterDiagram from '@/components/ScatterDiagram.vue';
import { storeToRefs } from 'pinia';
import { REQUEST_DEPENDENCIES, useDependencyStore } from '../composables/useDependencyStore';

const { id } = defineProps(["id"])
const { getPipelineExclude,  } = inject('injectPipelineState')

const dataStore = useDataStore()
const { selectionGroups, stages, stopwords } = storeToRefs(dataStore)

const { getFilteredDependency } = useDependencyStore()

const selection = computed({
    get: () => selectionGroups.value.get(stages.value.get(id).selectionGroupId),
    set: (val) => selectionGroups.value.set(stages.value.get(id).selectionGroupId, val)
})

const embeddingScatter = computed(() => getFilteredDependency(REQUEST_DEPENDENCIES['embeddingScatter'], getPipelineExclude()))

const scatterStageProps = computed(() => ({
    id: id,
    scatterData: embeddingScatter.value,
    lassoOptions: {
        onLassoEnd
    },
}))


const scatterRef = useTemplateRef('scatterRef')
const stage = computed(() => stages.value.get(id))

watch(() => stage.value.searchSelection, (val) => {
    if (!val) return
    scatterRef.value.zoomIntoView(val.map(w => w.item))
})


function onLassoEnd(selected) {
    console.log(selected)
    const s = embeddingScatter.value.positions.filter((e, i) => selected[i]).map(e => e.word)
    selection.value = s
}

</script>
