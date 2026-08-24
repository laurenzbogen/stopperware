<template>
    <div class="h-80">
        <svg :id="id" ref="container" width="100%" height="100%" @contextmenu="handleContextMenu"></svg>
    </div>
</template>

<script setup>
import { computed, inject, provide, ref, watch } from 'vue'
import { onMounted, useTemplateRef } from 'vue';
import ContextMenu from '../ContextMenu.vue';
import useScatter from '../composables/useScatter';
import { useLocalData } from '@/components/composables/useData'
import SuperJSON from 'superjson';

const props = defineProps(["id", "stage"])
const { id, stage } = props
const { pipeline, changeStageFilter, getCumulativeFilter } = inject('injectPipeline')
const { onWordContextMenu, updateStageState } = inject('injectGlobalState')

const stageSelection = ref([])

const currentFilter = computed(() => getCumulativeFilter(id))

const container = useTemplateRef("container")
const normalizedData = computed(() => {
    const { minX, maxX, minY, maxY, embedding: data } = useLocalData().getters.get_embedding()
    return { minX, maxX, minY, maxY, data }
})
// 
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



const stageData = {
    container,
    reactiveData: normalizedData,
    currentFilter,
    stageSelection,
    onWordContextMenu
}

const stageState = ref(null)
watch(
    () => stage,
    (newState) => {
        if (newState === undefined) return //todo placeholder

        stageState.value = newState
    }, { immediate: true })

const { currentTransform } = useScatter(stageData, stage)
watch(currentTransform, () => {
    const state = SuperJSON.serialize({ transform: currentTransform })
    updateStageState(id, state, false)
}, { deep: true })





</script>
