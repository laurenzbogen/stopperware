<template>
    <div :class="`w-[700px] flex items-center m-2  shadow-sm gap-12 ${seed.hidden ? 'opacity-0' : null}`">
        <h1 class="font-bold">Pipeline</h1>
        <p>{{ selection.size }} selected</p>
        <button @click="selection = new Set()" class="btn">Clear Selection</button>
    </div>

    <div v-if="dragAction.dragging && dragAction.toPipelineId === id && (dragAction.dragStage.fromPipelineId !== id || dragAction.dragStage.fromIndex !== 0)"
        class="border-t border-2 w-[700px]" :ref="el => setDivider(el, 0)"></div>

    <template v-for="stage, i in stages">
        <div @pointerdown="setDetailStage(stage.id)">
            <div class="bg-base-200/70 px-2 pb-2 rounded-lg my-4 drop-shadow relative w-[700px]"
                @pointerdown="(e) => handleDragDown(e, i)" ref="stageWrappers" :style="dragAction.dragStage.id === stage.id && dragAction.dragging ? {
                    position: 'absolute',
                    left: `${dragAction.position.origin[0]}px`,
                    top: `${dragAction.position.origin[1]}px`,
                    transform: `translate3d(${dragAction.position.offset[0]}px, ${dragAction.position.offset[1]}px, 0px)`,
                    zIndex: 5,
                } : {}">


                <div class="flex gap-2 items-center py-2">
                    <!-- <span class="text-primary-content/80 text-3xl pb-1">•</span> -->
                    {{ dragAction.dragging }}
                    <span class="font-bold text-primary-content/60 text-xs">{{ i + 1 }}</span>
                    <span class="font-bold text-primary-content/60 text-xs"> — </span>
                    <span class="font-bold text-primary-content/60 text-xs">{{ stage.type }}</span>
                    <span class="font-bold text-primary-content/60 text-xs">{{ stage.id }}</span>
                    <span class="m-auto"></span>
                </div>
                <div class="grow bg-base-100 rounded-sm " ref="stageComponents">
                    <component :is="stageTypeMap[stage.type]" :id="stage.id" :key="stage.id" :stage="stage" />
                </div>
                <!-- <StageFilterDisplay :id="stage.id"/> -->
            </div>
            <div v-if="dragAction.dragging && dragAction.toPipelineId === id && (dragAction.dragStage.fromPipelineId !== id || dragAction.dragStage.fromIndex !== i + 1)"
                class="border-t border-2 my-8 " :ref="el => setDivider(el, i + 1)"></div>
        </div>
    </template>

    <div :class="`${seed.hidden ? 'opacity-0' : null}`">
        <button class="btn" @click="chooseStage({ pipelineID: id, index: stages.length })">Add</button>
        <button class="btn" @click="chooseStage({ pipelineID: id, index: stages.length })">Add from Selected</button>
    </div>
</template>

<script setup>
import { useLocalData } from '@/components/composables/useData';
import { ref, watch, computed, provide, inject, useTemplateRef, toValue, onBeforeUpdate } from 'vue';


import { v4 as uuidv4 } from "uuid";
import { stageTypeMap } from '@/stageTypeMap';


const { chooseStage, setDetailStage, stageDrag } = inject("injectGlobalState")

const props = defineProps(["seed"])
const id = props.seed.pipeline.id

const stages = computed({
    get: () => props.seed.pipeline.stages,
    set: (val) => { props.seed.pipeline.stages = val }
})
const selection = computed({
    get: () => props.seed.pipeline.selection,
    set: (val) => { props.seed.pipeline.selection = val }
})


const stageComponents = useTemplateRef("stageComponents")
const stageWrappers = useTemplateRef("stageWrappers")
const stageDividers = ref([])

onBeforeUpdate(() => {
    stageDividers.value = []
})

function setDivider(el, index) {
    if (el) stageDividers.value[index] = el
}

const { dragAction, handleStageDragStart, handleStageDrag, handleStageDragEnd, } = stageDrag


function handleDragDown(e, i) {
    const isFrame = !stageComponents.value[i].contains(e.target)
    if (isFrame) {
        handleStageDragStart(stages.value[i].id, e)
        e.preventDefault()
        document.addEventListener("pointermove", handleDrag)
        document.addEventListener("pointerup", handleDragUp)
    }
}

function determineActiveDivider(e) {
    if (!dragAction.value.dragging || dragAction.value.toPipelineId !== id) return

    const filteredDividers = stageDividers.value.filter(e => e !== undefined)
    const distances = filteredDividers.map(d => Math.abs(d.getBoundingClientRect().top - e.clientY))
    const min_index = distances.indexOf(Math.min(...distances));

    if (min_index !== -1) {
        dragAction.value.toStageIndex = min_index
        filteredDividers.forEach((e, i) => e.style.opacity = i === min_index ? 1 : 0.1)
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


function changeStageFilter(id, filter) {
    const index = stages.value.findIndex(e => e.id == id)
    for (let e of filter) {
        stages.value[index].filter.push(e)
    }
}


const cumulativeFilter = computed(() => {
    let globalSet = new Set()
    return stages.value.map(p => {
        for (let { word, action } of p.filter) {
            if (action === "ADD") {
                globalSet.add(word)
            } else if (action === "REMOVE") {
                globalSet.delete(word)
            }
        }
        return Array.from(globalSet)
    })
})

function getCumulativeFilter(id) {
    const index = stages.value.findIndex(e => e.id == id)
    return cumulativeFilter.value[index] ?? []
}

provide('injectPipeline', {
    pipeline: stages,
    selection,
    changeStageFilter,
    getCumulativeFilter,
    changeSelection,
})


function changeSelection(words, mode) {
    switch (mode) {
        case "addSelection":
            for (let w of words) {
                selection.value.add(w)
            }
            break;
        case "removeSelection":
            for (let w of words) {
                selection.value.delete(w)
            }
            break;
        case "replaceSelection":
            selection.value = new Set(words)
            break;
        default:
            break;
    }
}


function findSimilarWords(word, stageIndex) {
    const stage = {
        id: uuidv4(),
        type: "SimilarWords",
        selected: word,
        filter: [],
    }
    stages.value.splice(stageIndex + 1, 0, stage)
}

</script>
