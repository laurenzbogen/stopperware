<template>
    <CorpusPicker @createdCorpus="onCreatedCorpus" v-if="data.stagePipelines == null" />
    <template v-else>
        <div id="app" class="w-screen h-screen">
            <zoompinch ref="zoompinchRef" v-model:transform="transform"
                :offset="{ top: 300, right: 0, bottom: 0, left: 0 }" :min-scale="0.1" :max-scale="4" :clamp-bounds="false"
                :rotation="false" :zoom-speed="1" :translate-speed="1" :zoom-speed-apple-trackpad="1"
                :translate-speed-apple-trackpad="1" :mouse="data.editorData.mainToolSelected === EDITMODES['Move'].name" :wheel="true" :touch="true" :gesture="true">
                <div class="min-w-screen h-screen relative" ref="main-wrapper" id="main">
                    <div id="content_wrapper" ref="content-wrapper" class="flex gap-32">
                        <template :key="pipeline.id" v-for="(pipeline, i) in orderedPipelines">
                            <div ref="pipelineWrappers" class="flex-none" :id="pipeline.id">
                                <StagePipeline :id="pipeline.id" ref="pipelineComponents" :key="pipeline.id" />
                            </div>

                            <div v-if="i == data.stagePipelines.size - 2" class="-mr-44">
                                <button @click="addNewPipeline"
                                    class="text-neutral/50 hover:text-neutral/80 hover:bg-base-200 rounded-sm p-1">
                                    <Plus class="w-6 h-6 relative z-50" />
                                </button>
                            </div>

                        </template>

                    </div>
                </div>

                <ContextMenu v-show="contextMenuOptions.show" :menuOptions="contextMenuOptions" />
            </zoompinch>

            <div id="overlay" class="pointer-events-none fixed top-0 w-screen flex justify-between">
                <div
                    class="w-60 h-screen bg-neutral-content border-r-3 border-base-200/30 pointer-events-auto text-sm font-bold p-4 text-neutral z-50 overflow-y-scroll">
                    <button class="btn" @click="undo()">UNDO</button>
                    <button class="btn" @click="redo()">REDO</button>
                    <p>OVERVIEW</p>
                    <p>{{ data.stagePipelines.size }}</p>
                    <button class="btn" @click="initializePipelines">init</button>
                    <PipelineDiagram :pipelines="orderedPipelines.slice(1, -1)" :detailStage="detailStage" />

                    <!-- <p>{{orderedPipelines.map(p => p.position)}}</p> -->
                    <p v-for="p in orderedPipelines">{{ p.stages }}</p> -->
                </div>
                <div
                    class="w-60 h-screen bg-neutral-content border-l-3 border-base-200/30 pointer-events-auto text-sm font-bold p-4 z-50">
                    <p>DETAILS</p>

                    <p>{{ detailStage }}</p>
                    <p> {{ data.stages.get(detailStage) }}</p>
                    <button class="btn btn-accent btn-outline btn-wide" @click="deleteStage(detailStage)">Delete
                        Stage</button>
                </div>

                <div
                    class="pointer-events-auto fixed left-1/2 bottom-20 -translate-x-1/2 z-100">
                    <OverlayToolbelt />
                </div>
            </div>
        </div>
    </template>

    <StagePicker @selected="onPickerSelect" :stageTypes="Object.keys(stageTypeMap)" ref="pickerModalComponent" />

</template>

<script setup>
import { Zoompinch } from "@zoompinch/vue";
import { ref, provide, computed, useTemplateRef, onMounted } from "vue";
import CorpusPicker from "@/components/CorpusPicker.vue";
import { useData } from "./components/composables/useData";
import StagePipeline from "./components/StagePipeline.vue";
import StagePicker from "./components/StagePicker.vue";
import { stageTypeMap } from "./stageTypeMap";
import ContextMenu from './components/ContextMenu.vue';
import Plus from "./icons/Plus.vue";
import { EDITMODES, getInitializedPipeline } from "./helpers"; import PipelineDiagram from "./components/PipelineDiagram.vue";
import OverlayToolbelt from "./components/OverlayToolbelt.vue";


const contextMenuOptions = ref({
    selection: [], x: 0, y: 0, show: false,
})

// const newOptions = {
//     selection: [d.word], x: e.clientX, y: e.clientY, show: true,
// }
function onWordContextMenu(e, options) {
    e.preventDefault()

    contextMenuOptions.value = options
}

const contentWrapper = useTemplateRef('content-wrapper')
const mainWrapper = useTemplateRef('main-wrapper')
const pipelineWrappers = useTemplateRef('pipelineWrappers')
const pipelineComponents = useTemplateRef('pipelineComponents')

const detailStage = ref(null)

const left = ref(0)
const t = ref(0)

const handleScroll = (e) => {
    e.preventDefault()

    left.value -= e.deltaX * 1.5
    t.value -= e.deltaY / 1.5
}

onMounted(() => {
    mainWrapper.value.addEventListener("wheel", handleScroll, { passive: false })
})

const { data, addStage, updateStageState, initializePipelines, refHistory } = useData()
const orderedPipelines = computed(() => [...data.value.stagePipelines.values()].sort((a, b) => a.position - b.position))


const { history, undo, redo } = refHistory

const stopwords = computed(() => data.value?.stopwords)
const percentage = computed(() => stopwords.value.size / data.value?.corpus.word_count.length * 100)
const editMode = ref('MOVE')

const picker = useTemplateRef("pickerModalComponent")

function bulkChangeIsStopword(words, addIfTrue) {
    for (let w of words) {
        if (addIfTrue) {
            stopwords.value.add(w)
        } else {
            stopwords.value.delete(w)
        }

    }
}

function onPickerSelect(stageType, pipelineId) {
    console.log(pipelineId)
    addStage(stageType, pipelineId)
    //data.value.stagePipelines.get(stage.pipeline).stages.splice(stage.index, 0, stage)
}

function isStopword(stopword) {
    return stopwords.value.has(stopword)
}

const zoompinchRef = useTemplateRef('zoompinchRef')


const setDetailStage = (val) => {
    detailStage.value = val
}


const getInitDragOptions = () => ({
    dragging: false,
    position: {
        start: null,
        offset: null,
        origin: null,
    },
    dragStage: {
        element: null,
        id: null,
        fromPipelineId: null,
        fromIndex: 0,
    },
    toStageIndex: null,
    toPipelineId: null,
})

const dragAction = ref(getInitDragOptions())

function handleStageDragStart(stageId, e) {
    const startPosition = zoompinchRef.value.normalizeClientCoords(e.clientX, e.clientY)

    dragAction.value.position.start = startPosition
    const element = e.target
    dragAction.value.dragStage.element = element

    const bbox = element.getBoundingClientRect()
    dragAction.value.position.origin = zoompinchRef.value.normalizeClientCoords(bbox.x, bbox.y)

    dragAction.value.dragStage.id = stageId
    const pipelines = data.value.stagePipelines

    const activePipeline = [...pipelines.values()].find(e => e.stages.some(s => s === stageId))
    const fromIndex = activePipeline.stages.findIndex(e => e === stageId)

    dragAction.value.dragStage.fromIndex = fromIndex
    dragAction.value.dragStage.toStageIndex = fromIndex
    dragAction.value.dragStage.fromPipelineId = activePipeline.id
}

function dragCalcTargetPipeline(clientX) {
    const orderedWrappers = orderedPipelines.value.map(p => pipelineWrappers.value.find(pW => pW.id === p.id))
    if (orderedWrappers.some(w => w === undefined)) throw new Error('Couldnt find some pipline Wrappers when calculating target pipeline')
    const pipelineCenters = orderedWrappers.map(p => p.getBoundingClientRect().x + p.getBoundingClientRect().width / 2)
    const distances = pipelineCenters.map(d => Math.abs(d - clientX))
    const min_index = distances.indexOf(Math.min(...distances));

    if (min_index !== -1) {
        dragAction.value.toPipelineId = orderedPipelines.value[min_index].id
    }
}


function handleStageDrag(e) {
    const MIN_DISTANCE = 500
    if (dragAction.value.position.start === null) return

    const [startX, startY] = dragAction.value.position.start
    const [currentX, currentY] = zoompinchRef.value.normalizeClientCoords(e.clientX, e.clientY)

    const dragOffset = [currentX - startX, currentY - startY]
    const distance = Math.pow(dragOffset[0], 2) + Math.pow(dragOffset[1], 2)
    if (!dragAction.value.dragging && distance < MIN_DISTANCE) return

    dragAction.value.dragging = true
    dragAction.value.position.offset = dragOffset

    dragCalcTargetPipeline(e.clientX)

    const component = pipelineComponents.value.find(c => c.id === dragAction.value.toPipelineId)
    if (component === undefined) throw new Error('Coulnt find Pipeline Component of active Drag ID')
    component.determineActiveDivider(e)
}

function handleStageDragEnd() {
    if (dragAction.value.dragging) {
        const fromPipelineId = dragAction.value.dragStage.fromPipelineId
        const toPipelineId = dragAction.value.toPipelineId
        const stage = data.value.stagePipelines.get(fromPipelineId)
            .stages.splice(dragAction.value.dragStage.fromIndex, 1)[0]


        data.value.stagePipelines.get(toPipelineId)
            .stages.splice(dragAction.value.toStageIndex, 0, stage)

        // do in this order to preserve indeces
        // add hidden last pipeline
        if (data.value.stagePipelines.get(toPipelineId).position === data.value.stagePipelines.size - 1) {
            //data.value.stagePipelines.push(getInitializedPipeline())
            const newPipeline = getInitializedPipeline(data.value.stagePipelines.size)
            data.value.stagePipelines.set(newPipeline.id, newPipeline)
        }

        // remove pipeline if empty
        if (data.value.stagePipelines.get(fromPipelineId).stages.length === 0) {
            const position = data.value.stagePipelines.get(fromPipelineId).position
            for (let pipeline of data.value.stagePipelines.values()) {
                if (pipeline.position > position) {
                    pipeline.position -= 1
                }
            }
            data.value.stagePipelines.delete(fromPipelineId)
        }

        // add hidden first pipeline
        if (data.value.stagePipelines.get(toPipelineId).position === 0) {
            const newPipeline = getInitializedPipeline(0)
            for (const pipeline of data.value.stagePipelines.values()) {
                pipeline.position += 1
            }
            data.value.stagePipelines.set(newPipeline.id, newPipeline)
        }


    }

    dragAction.value = getInitDragOptions()
}

provide('injectGlobalState', {
    data,
    stopwords,
    bulkChangeIsStopword,
    isStopword,
    chooseStage: (pipelineInfo) => picker.value?.open(pipelineInfo),
    editMode,
    zoompinchRef,
    setDetailStage,
    onWordContextMenu,
    updateStageState,
    stageDrag: {
        dragAction,
        handleStageDragStart,
        handleStageDrag,
        handleStageDragEnd,
    }
})


function onCreatedCorpus(initData) {
    data.value = initData
}

function deleteStage(stageId) {
    const pipelineId = data.value.stages.get(stageId).pipeline
    const stageIndex = data.value.stagePipelines.get(pipelineId).stages.findIndex(s => s.id === stageId)
    data.value.stagePipelines.get(pipelineId).stages.splice(stageIndex, 1)
    //if (data.value.stagePipelines[pipelineIndex].stages.length === 0) {
    //    data.value.stagePipelines.splice(pipelineIndex, 1)
    //}

}

function addNewPipeline() {
    const size = data.value.stagePipelines.size
    const pipeline = getInitializedPipeline(size)
    data.value.stagePipelines.set(pipeline.id, pipeline)
}
</script>
