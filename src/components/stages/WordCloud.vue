<template>
    <svg :id="id" class="absolute" ref="container" width="100%" height="100%">
        <g :transform="transformString">
            <text v-for="w in layoutedWordcloud" :key="w.word" :x="w.x + dimensions[0] / 2" :y="w.y + dimensions[1] / 2"
                :style="{ fontSize: `${w.size}px`, fontFamily: 'Impact' }" text-anchor="middle" fill="currentColor"
                :class="getWordStyle(w.word)" @contextmenu="handleContextMenu($event, w.word)">{{ w.word }}</text>
        </g>
        <Lasso v-bind="{ container, targets: zoomedPositions, lassoOptions }" />
    </svg>
</template>

<script setup>
import * as d3 from 'd3';
import Lasso from '../Lasso.vue';
import cloud from 'd3-cloud';
import { computed, inject, markRaw, useTemplateRef, watch, ref } from 'vue';
import useZoom from '../composables/useZoom';
import { EDITMODES } from '@/helpers';

import { useDataStore } from '@/components/composables/useDataStore';
import { storeToRefs } from 'pinia';
import { REQUEST_DEPENDENCIES, useDependencyStore } from '../composables/useDependencyStore';

const dataStore = useDataStore()
const { stages, selectionGroups } = storeToRefs(dataStore)

const { handleContextMenu, getPipelineExclude, getWordStyle } = inject('injectPipelineState')

// === DEPENDENCIES ===
const { id, dependencyData } = defineProps(["id", "dependencyData"])
const filteredWordcount = computed(() => dependencyData["wordcount"])

// ====

const container = useTemplateRef('container')

const dimensions = computed(() => {
    const box = container.value?.getBoundingClientRect?.()
    return [600, 250]
    return [box?.width ?? 0, box?.height ?? 0]
})

const layoutedWordcloud = ref(null)

const max = computed(() => filteredWordcount.value.reduce((acc, w) => Math.max(acc, w.count), 0))
const min = computed(() => filteredWordcount.value.reduce((acc, w) => Math.min(acc, w.count), Infinity))

const scale = computed(() => d3.scalePow().domain([min.value, max.value]).range([16, 72]).clamp(true))
const stage = computed(() => stages.value.get(id))

watch([filteredWordcount, dimensions], () => {
    if (!filteredWordcount.value) return
    if (dimensions.value.some(v => v === 0)) {
        console.log("Cloud dimensions are null or 0, skipping..")
        return
    }

    const maxWords = 100
    const wordsToDraw = filteredWordcount.value.slice(0, maxWords).map(w => markRaw({ ...w }))

    cloud()
        .size(dimensions.value)
        .words(wordsToDraw)
        .text((d) => d.word)
        .rotate(0)
        .fontSize(d => scale.value(d.count))
        .padding(4)
        .random(() => 0.5)
        .on("end", (val) => {
            // Just update state — the template re-renders the <text> nodes itself.
            layoutedWordcloud.value = val
        })
        .start()
}, { immediate: true })


const scaledPositions = computed(() => layoutedWordcloud.value?.map(d => [d.x + dimensions.value[0] / 2, d.y + dimensions.value[1] / 2]))
const { zoomedPositions, zoomTransform } = useZoom(id, container, scaledPositions)
const transformString = computed(() => {
    if (!zoomTransform.value) return ''
    const { k, x, y } = zoomTransform.value.transform
    return `translate(${x}, ${y}) scale(${k})`
})

const lassoOptions = { onLassoEnd }
function onLassoEnd(selected) {
    const s = filteredWordcount.value.filter((e, i) => selected[i]).map(e => e.word)
    selectionGroups.value.set(stage.value.selectionGroupId, s)
}

</script>
