<template>
    <div class="h-80">
        <ScatterDiagram v-bind="scatterStageProps" />
    </div>
</template>

<script setup>
import { computed, inject, provide, ref, watch } from 'vue'
import { onMounted, useTemplateRef } from 'vue';
import { useData } from '@/components/composables/useData'
import SuperJSON from 'superjson';
import ScatterDiagram from '../ScatterDiagram.vue';

const { id } = defineProps(["id"])
const { pipeline, changeStageFilter, getCumulativeFilter } = inject('injectPipeline')
const { data, onWordContextMenu, updateStageState } = inject('injectGlobalState')

const stageSelection = ref([])
const currentFilter = computed(() => getCumulativeFilter(id))

const scatterStageProps = computed(() => ({
    id: id,
    scatterData: data.value.corpus.embedding,
    lassoOptions: {
        onLassoEnd
    },
    onWordContextMenu
}))


function onLassoEnd(selected) {
    const s = data.value.corpus.embedding.embedding.filter((e, i) => selected[i]).map(e => e.word)
    data.value.stages.get(id).selection = s

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
