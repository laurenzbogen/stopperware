<template>
    <CorpusPicker :enabled="globalDropzoneEnabled" />
    <Confirm v-if="confirmIsOpen" />
    <Status />

    <div id="app" class="w-screen h-screen ">
        <zoompinch ref="zoompinchRef" v-model:transform="zoompinchTransform" :min-scale="0.1" :max-scale="4"
            :clamp-bounds="false" :rotation="false" :zoom-speed="1" :translate-speed="1" :zoom-speed-apple-trackpad="1"
            :translate-speed-apple-trackpad="1" :mouse="editorData?.mainToolSelected === EDITMODES['Move'].name"
            :wheel="true" :touch="true" :gesture="true">

            <div class="" ref="main-wrapper" id="main">
                <div id="content_wrapper" ref="content-wrapper" class="relative flex gap-32 w-fit">
                    <template :key="pipeline.id" v-for="(pipeline, i) in orderedPipelines">
                        <div :style="{ minWidth: `${pipeline.resizeWidth}px` }" ref="pipelineWrappers"
                            :class="`flex-none ${pipeline.stages.includes(editorData.detailStageId) ? 'bg-neutral-100/70' : ''}`"
                            :id="pipeline.id">
                            <StagePipeline :id="pipeline.id" ref="pipelineComponents" :key="pipeline.id" />
                        </div>


                    </template>

                    <div class="absolute h-full right-[700px] w-28  bg-base-200/30 hover:bg-base-200 rounded-lg">
                        <button class="w-full h-full" @click="addPipeline()">
                            <Plus class="m-auto" />
                        </button>
                    </div>

                </div>
            </div>

        </zoompinch>

        <div id="overlay" class="pointer-events-none fixed top-0 w-screen flex justify-between">
            <div
                class="w-60 h-screen bg-neutral-content border-r-3 border-base-200/30 pointer-events-auto text-sm font-bold p-4 text-neutral z-50 overflow-y-scroll">
                <OverlayOverviewStage />
            </div>
            <div
                class="w-60 h-screen bg-neutral-content border-l-3 border-base-200/30 pointer-events-auto p-4 z-50 overflow-y-scroll">
                <OverlayDetailStage v-if="editorData.detailStageId" />
            </div>

            <div class="pointer-events-auto fixed left-1/2 bottom-20 -translate-x-1/2 z-100">
                <OverlayToolbelt />
            </div>
        </div>

        <ContextMenu :menuOptions="contextMenuOptions" />
    </div>

    <StagePicker @selected="onPickerSelect" ref="pickerModalComponent" />

</template>

<script setup>

import { Zoompinch } from "@zoompinch/vue";
import { ref, provide, computed, useTemplateRef, onMounted, watch } from "vue";
import CorpusPicker from "@/components/CorpusPicker.vue";
import StagePipeline from "./components/StagePipeline.vue";
import StagePicker from "./components/StagePicker.vue";
import ContextMenu from './components/ContextMenu.vue';
import { Plus } from "@lucide/vue";
import { EDITMODES, getInitializedPipeline } from "./helpers";
import OverlayToolbelt from "./components/OverlayToolbelt.vue";
import OverlayDetailStage from "./components/OverlayDetailStage.vue";
import OverlayOverviewStage from "./components/OverlayOverviewStage.vue";
import { useKeyStore } from "@/components/composables/useKeyStore";



import { useDataStore } from '@/components/composables/useDataStore';
import { storeToRefs } from 'pinia';
import Confirm from "./components/Confirm.vue";
import Status from "./components/Status.vue";
const dataStore = useDataStore()
const { addPipeline, addStage, moveStage } = dataStore
const { stagePipelines, stages, editorData } = storeToRefs(dataStore)

const contextMenuOptions = ref({
    menuWords: [], x: 0, y: 0, show: false, pipelineId: null,
})

const mainWrapper = useTemplateRef('main-wrapper')
const pipelineWrappers = useTemplateRef('pipelineWrappers')
const pipelineComponents = useTemplateRef('pipelineComponents')

const { keybinds } = storeToRefs(useKeyStore())
onMounted(() => {
    keybinds.value.push(['<C-a>', () => stages.value.get(editorData.value.detailStageId).pipeline])
})


const orderedPipelines = computed(() => Array.from(stagePipelines.value.values()).sort((a, b) => a.position - b.position))
const picker = useTemplateRef("pickerModalComponent")

function onPickerSelect(stageType, pipelineId) {
    addStage(stageType, pipelineId)
}


const globalDropzoneEnabled = ref(true)

const zoompinchRef = useTemplateRef('zoompinchRef')



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

    const activePipeline = [...stagePipelines.value.values()].find(e => e.stages.some(s => s === stageId))
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
        const stageId = dragAction.value.dragStage.id
        const toPipelineId = dragAction.value.toPipelineId
        const toPosition = dragAction.value.toStageIndex
        moveStage(stageId, toPipelineId, toPosition)
    }

    dragAction.value = getInitDragOptions()
}

const COOLDOWN_MS = 300
let cooldownTimer = null
const zoomIsGesturing = ref(false)
const zoompinchTransform = computed({
    get: () => editorData.value.zoompinchTransform ?? {
        translateX: -500,
        translateY: 100,
        scale: 1,
        rotate: 0
    },
    set: (val) => editorData.value.zoompinchTransform = val,
})

watch(zoompinchTransform, () => {
    zoomIsGesturing.value = true
    clearTimeout(cooldownTimer)
    cooldownTimer = setTimeout(() => {
        zoomIsGesturing.value = false
    }, COOLDOWN_MS)
}, { deep: true })


const globalState = {
    chooseStage: (pipelineInfo) => picker.value?.open(pipelineInfo),

    contextMenuOptions,

    zoompinchRef,
    zoompinchTransform,
    zoomIsGesturing,
    stageDrag: {
        dragAction,
        handleStageDragStart,
        handleStageDrag,
        handleStageDragEnd,
    },

    globalDropzoneEnabled,
}
provide('injectGlobalState', globalState)

import { useConfirm } from "./components/composables/useConfirm";
const { isOpen: confirmIsOpen } = useConfirm()


</script>
