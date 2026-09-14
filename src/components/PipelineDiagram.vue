<template>
    <svg style="width: 100%; height: 200px;" width="300" height="200" :viewBox="`0 0 ${dimensions[0]} ${dimensions[1]}`"
        xmlns="http://www.w3.org/2000/svg">
        <!-- Trunk line down from top -->
        <line :x1="dimensions[0] / 2" :y1="trunkTop" :x2="dimensions[0] / 2" :y2="branchY" :class="strokeClass"
            stroke-width="1" />
        <!-- Horizontal branch line -->
        <line :x1="colCenter(0)" :y1="branchY" :x2="colCenter(pipelines.length - 1)" :y2="branchY" :class="strokeClass"
            stroke-width="1" />
        <!-- Vertical drops to each box -->
        <template v-for="(p, i_p) in pipelines" :key="i_p">
            <template v-for="(s, i_s) in p.stages" :key="i_s">
                <line :x1="colCenter(i_p)" :y1="i_s === 0 ? branchY : firstBoxY + (i_s - 1) * rowSpacing + boxH"
                    :x2="colCenter(i_p)" :y2="firstBoxY + i_s * rowSpacing" :class="strokeClass" stroke-width="1" />
                <rect :x="colCenter(i_p) - boxW / 2" :y="firstBoxY + i_s * rowSpacing" :width="boxW" :height="boxH"
                    :rx="boxR" :fill="detailStageId === s ? 'bg-neutral' : 'white'" :class="strokeClass"
                    stroke-width="1">

                </rect>

            </template>
        </template>
    </svg>
</template>

<script setup>
import { computed, inject, watch } from 'vue'
import { useDataStore } from './composables/useDataStore';
import { storeToRefs } from 'pinia';

const dataStore = useDataStore()
const { } = dataStore
const { editorData, stagePipelines, stopwords } = storeToRefs(dataStore)

const props = defineProps(['pipelines'])
const detailStageId = computed(() => editorData.value.detailStageId)

// Layout constants — everything below is derived from these,
// so changing one value keeps the whole diagram consistent.
const strokeClass = "stroke-primary-content"
const boxW = 10
const boxH = 10
const boxR = 2
const colSpacing = 40    // horizontal distance between pipeline centers
const rowSpacing = 20    // vertical distance between stacked box tops
const edgeMargin = 10    // outer padding
const trunkTop = 5
const branchY = 20
const firstBoxY = 25

const colCenter = (i_p) => edgeMargin + boxW / 2 + i_p * colSpacing

const getMaxStagesLength = (pipelines) =>
    Math.max(1, ...pipelines.map((p) => p.stages.length))

const dimensions = computed(() => {
    const numPipelines = Math.max(1, props.pipelines.length)
    const maxStages = getMaxStagesLength(props.pipelines)
    const width = 2 * edgeMargin + boxW + (numPipelines - 1) * colSpacing
    const height = firstBoxY + boxH + (maxStages - 1) * rowSpacing + edgeMargin
    return [width, height]
})
</script>
