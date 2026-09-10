<template>
    {{ dragAction.toStageIndex }}
    <div :class="`w-[700px] flex items-center m-2  shadow-sm gap-12 ${hidden ? 'opacity-0' : null}`">
        <h1 class="font-bold">Pipeline</h1>
        <!-- <p>{{ selection.size }} selected</p> -->
        <button @click="data.selectionGroups.set(pipeline.selectionGroupId, [])" class="btn">Clear Selection</button>
        <!-- <button @click="data.stagePipelines.delete(pipeline.id)" class="btn">Delete Pipeline</button> -->

    </div>

    <!-- dragAction.dragging && dragAction.toPipelineId === id && (dragAction.dragStage.fromPipelineId !== id || dragAction.dragStage.fromIndex !== 0) -->
    <div 
        :style="{ opacity: dragAction.dragging && dragAction.toPipelineId === id && dragAction.toStageIndex === 0 ? 1 : 0 }"
        class="border-t border-2 w-full h-1" :ref="el => setDivider(el, 0)"></div>

    <template v-for="stage, i in stageIds.map(s => data.stages.get(s))">
        <div :id="`wrapper_${stage.id}`" class="grid grid-rows-[1fr_8px]" @pointerdown="(e) => handleDragDown(e, i)"
            ref="stageWrappers" :style="dragAction.dragStage.id === stage.id && dragAction.dragging ? {
                minHeight: `${stage.resizeHeight}px`,
                minWidth: `${pipeline.resizeWidth}px`,
                position: 'absolute',
                left: `${dragAction.position.origin[0]}px`,
                top: `${dragAction.position.origin[1]}px`,
                transform: `translate3d(${dragAction.position.offset[0]}px, ${dragAction.position.offset[1]}px, 0px)`,
                zIndex: 5,
            } : { minHeight: `${stage.resizeHeight}px` }">

            <div class="bg-base-200/70 relative my-8 flex flex-col pb-4">
                <Stage :stage="stage" />

                <div id="resizeFrame" @pointerdown="(e) => handleResizeDown(e, stage.id)"
                    class="bottom-0 right-0 absolute size-4 cursor-nwse-resize opacity-40 hover:opacity-70 transition-opacity"
                    style="background: linear-gradient(135deg, transparent 0%, transparent 50%, currentColor 50%, currentColor 60%, transparent 60%, transparent 70%, currentColor 70%, currentColor 80%, transparent 80%); color: rgb(107 114 128);">
                </div>
            </div>

            <div :style="{ opacity: dragAction.dragging && dragAction.toPipelineId === id && dragAction.toStageIndex === i + 1 ? 1 : 0 }"
                class="border-t border-2 my-8 w-full h-1" :ref="el => setDivider(el, i + 1)"></div>

        </div>



    </template>

    <div :class="`${hidden ? 'opacity-0' : null}`">
        <button class="btn" @click="chooseStage({ pipelineID: id, index: stageIds.length })">Add</button>
        <button class="btn" @click="chooseStage({ pipelineID: id, index: stageIds.length })">Add from Selected</button>
    </div>
</template>

<script setup>
import { ref, computed, provide, inject, useTemplateRef, toValue, onBeforeUpdate, toRaw } from 'vue';
import { v4 as uuidv4 } from "uuid";
import Stage from './Stage.vue';

const { data, chooseStage, stageDrag, zoompinchRef, zoompinchTransform } = inject("injectGlobalState")
const { id } = defineProps(['id'])

const pipeline = computed({
    get: () => data.value.stagePipelines.get(id),
    set: (val) => data.value.stagePipelines.set(id, val)
})
const hidden = computed(() => {
    return pipeline.value.position === 0 || pipeline.value.position === data.value.stagePipelines.size - 1
})

const stageIds = computed({
    get: () => pipeline.value.stages,
    set: (val) => { pipeline.value.stages = val }
})


const stageComponents = useTemplateRef("stageComponents")
const stageDividers = ref([])

onBeforeUpdate(() => {
    stageDividers.value = []
})

function setDivider(el, index) {
    if (el) stageDividers.value[index] = el
}

const { dragAction, handleStageDragStart, handleStageDrag, handleStageDragEnd, } = stageDrag



function handleDragDown(e, i) {
    if (e.target.closest('#stageComponent') !== null) return
    handleStageDragStart(stageIds.value[i], e)
    e.preventDefault()
    document.addEventListener("pointermove", handleDrag)
    document.addEventListener("pointerup", handleDragUp)
}

function determineActiveDivider(e) {
    if (!dragAction.value.dragging || dragAction.value.toPipelineId !== id) return

    const filteredDividers = stageDividers.value.filter(e => e !== undefined)
    const distances = filteredDividers.map(d => Math.abs(d.getBoundingClientRect().top - e.clientY))
    const min_index = distances.indexOf(Math.min(...distances));

    if (min_index !== -1) {
        dragAction.value.toStageIndex = min_index
        //filteredDividers.forEach((e, i) => e.style.opacity = i === min_index ? 1 : 0.1)
    }

}

defineExpose({
    id,
    determineActiveDivider
})


function handleDrag(e, i) {
    e.preventDefault()
    handleStageDrag(e)

}

function handleDragUp(e) {
    document.removeEventListener("pointermove", handleDrag)
    document.removeEventListener("pointerup", handleDragUp)
    handleStageDragEnd()
}


const getInitResizeOption = () => ({
    resizing: false,
    resizeId: null,
    startPosition: null,
    offsetPosition: null,
    bounds: null
})

const resizeAction = ref(getInitResizeOption())

function handleResizeDown(e, id) {
    e.preventDefault()
    e.stopPropagation()

    resizeAction.value.resizeId = id
    resizeAction.value.resizing = true
    resizeAction.value.startPosition = zoompinchRef.value.normalizeClientCoords(e.clientX, e.clientY)

    const p = e.target.parentElement
    resizeAction.value.bounds = [p.offsetWidth, p.offsetHeight]


    document.addEventListener("pointermove", handleResize)
    document.addEventListener("pointerup", handleResizeUp)
}

function handleResize(e) {
    if (!resizeAction.value.resizing) return

    const startPosition = resizeAction.value.startPosition
    const currentPosition = zoompinchRef.value.normalizeClientCoords(e.clientX, e.clientY)
    resizeAction.value.offsetPosition = [
        currentPosition[0] - startPosition[0],
        currentPosition[1] - startPosition[1]
    ]

    const stage = data.value.stages.get(resizeAction.value.resizeId)
    stage.resizeHeight = resizeAction.value.offsetPosition[1] + resizeAction.value.bounds[1]
    pipeline.value.resizeWidth = resizeAction.value.offsetPosition[0] + resizeAction.value.bounds[0]
}

function handleResizeUp(e) {
    resizeAction.value = getInitResizeOption()

    document.removeEventListener("pointermove", handleResize)
    document.removeEventListener("pointerup", handleResizeUp)
}




function changeStageFilter(id, filter) {
    const index = stageIds.value.findIndex(e => e == id)
    for (let e of filter) {
        stageIds.value[index].filter.push(e)
    }
}


const cumulativeFilter = computed(() => {
    //TODO
    return []
})

function getCumulativeFilter(id) {
    const index = stageIds.value.findIndex(e => e == id)
    return cumulativeFilter.value[index] ?? []
}

function getWordStyle(word) {
    const selection = data.value.selectionGroups.get(pipeline.value.selectionGroupId)
    const stopwords = data.value.stopwords
    if (selection.includes(word) && stopwords.has(word)) return 'text-primary'
    if (selection.includes(word)) return 'text-info'
    if (stopwords.has(word)) return 'text-accent'
    return ''
}


provide('injectPipelineState', {
    pipeline: stageIds,
    changeStageFilter,
    getCumulativeFilter,

    getWordStyle
})


</script>
