<template>
    <svg :id="id" class="absolute" ref="container" width="100%" height="100%">
        <Lasso v-bind="{ container, targets: zoomedPositions, lassoOptions }" />
    </svg>
</template>

<script setup>
import * as d3 from 'd3';
import Lasso from '../Lasso.vue';
import cloud from 'd3-cloud';
import { computed, inject, markRaw, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch, watchEffect } from 'vue';
import useZoom from '../composables/useZoom';
import { EDITMODES } from '@/helpers';

import { useDataStore } from '@/components/composables/useDataStore';
import { storeToRefs } from 'pinia';
const dataStore = useDataStore()
const { } = dataStore
const { stages, selectionGroups, stopwords, editorData } = storeToRefs(dataStore)

const { handleWordContextMenu, requestDependencies } = inject('injectGlobalState')
const { getPipelineExclude } = inject('injectPipelineState')

const { id } = defineProps(['id'])
const container = useTemplateRef('container')

const layout = ref(null)
const layoutedWordcloud = ref(null)
const filteredWordcount = computed(() => {
    const wordcount = requestDependencies.value['wordcount'].data
    const exclude = getPipelineExclude(wordcount.map(w => w.word))
    return wordcount.filter((w, i) => exclude[i])
})

const max = computed(() => filteredWordcount.value.reduce((acc, w) => Math.max(acc, w.count), 0))
const min = computed(() => filteredWordcount.value.reduce((acc, w) => Math.min(acc, w.count), Infinity))

const scale = computed(() => d3.scalePow().domain([min.value, max.value]).range([16, 72]).clamp(true))

const stage = computed(() => stages.value.get(id))
const selection = computed({
    get: () => testGet(),
    set: (val) => selectionGroups.value.set(stages.value.get(id).selectionGroupId, val)
})

function testGet() {
    return selectionGroups.value.get(stage.value.selectionGroupId)
}

watch([stage, stopwords, selection], () => {
    applyColors()
}, { deep: true })

const scaledPositions = computed(() => layoutedWordcloud.value?.map(d => [d.x + layout.value.size()[0] / 2, d.y + layout.value.size()[1] / 2]))
const { zoomedPositions, zoomTransform } = useZoom(id, container, scaledPositions)
watch(zoomTransform, (zoomVal) => {
    applyZoom(zoomVal)
})

const lassoOptions = { onLassoEnd }
function onLassoEnd(selected) {
    const s = layoutedWordcloud.value.filter((e, i) => selected[i]).map(e => e.word)
    if (editorData.value.mainToolSelected === EDITMODES['LassoPlus'].name) {
        selection.value = s
    }
    if (editorData.value.mainToolSelected === EDITMODES['LassoMinus'].name) {
        selection.value = Array.from(new Set(selection.value).difference(new Set(s)))
    }
}

function applyColors() {
    d3.select(container.value)
        .selectAll('text')
        .classed('text-info', d => selection.value.includes(d.word))
        .classed('text-accent', d => stopwords.value.has(d.word))
        .classed('text-primary', d => selection.value.includes(d.word) && stopwords.value.has(d.word))
}

function applyZoom(zoomVal) {
    if (zoomVal === null) return
    const { k, x, y } = zoomVal.transform
    const newTransform = new d3.ZoomTransform(k, x, y)

    d3.select(container.value)
        .selectAll('text')
        .attr('transform', newTransform)
}

watch([filteredWordcount], () => {
    if (!filteredWordcount.value) return
    const newDimensions = [500, 500]
    if (!newDimensions || newDimensions.some(v => v === 0)) {
        console.log("Cloud dimensions are null or 0, skipping..")
        return
    }
    //if (oldDimensions && newDimensions.every((d, i) => d === oldDimensions[i])) return

    //const maxWords = estimateMaxWords()
    const maxWords = 100
    //TODO workaround for shared state, still draws every wordcloud new when changing state...
    const wordsToDraw = filteredWordcount.value.slice(0, maxWords).map(w => markRaw({ ...w }))

    const thisLayout = cloud()
        .size(newDimensions)
        .words(wordsToDraw)
        .text((d) => d.word)
        .rotate(0)
        .fontSize(d => scale.value(d.count))
        .padding(4)
        .random(() => 0.5)
        .on("end", (val) => {
            layoutedWordcloud.value = val
            nextTick(() => {
                drawSvg(val)
            })
        })

    layout.value = thisLayout
    layout.value.start()
}, { immediate: true })

function drawSvg() {
    d3.select(container.value)
        .select("g").remove()
    d3.select(container.value)
        .append("g")
        //should be same as dimensions.value
        //.attr("transform", `translate(${layout.value.size()[0] / 2},${layout.value.size()[1] / 2})`)
        .selectAll("text")
        .data(layoutedWordcloud.value)
        .join("text")
        .style("font-size", d => `${d.size}px`)
        .style("font-family", "Impact")
        .attr("text-anchor", "middle")
        //.attr("transform", d => `translate(${[d.x, d.y]})rotate(${d.rotate})`)

        .attr('x', d => d.x + layout.value.size()[0] / 2)
        .attr('y', d => d.y + layout.value.size()[1] / 2)
        .text(d => d.word)
        .on('contextmenu', (e, d) => { handleWordContextMenu(e, [d.word]) })
        .attr('fill', 'currentColor');

    applyZoom(zoomTransform.value)
    applyColors(stage.value)
}


</script>
