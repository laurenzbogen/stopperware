<template>
    <svg :id="id" ref="container" width="100%" height="100%" @contextmenu="handleContextMenu">
        <Lasso v-if="lassoOptions" v-bind="{ container, zoomTransform, targets: positions, lassoOptions }" />
    </svg>
</template>

<script setup>
import { computed, inject, onMounted, ref, useTemplateRef, watch } from 'vue';
import * as d3 from 'd3'
import { EDITMODES } from "@/helpers";
import SuperJSON from "superjson";
import Lasso from "./Lasso.vue";


const MARGIN_X = 100
const MARGIN_Y = 100

const { id, scatterData, lassoOptions } = defineProps(['id', 'scatterData', 'lassoOptions'])
const { data, updateStageState } = inject('injectGlobalState')

const container = useTemplateRef("container")
const zoomTransform = ref(null);


const rawStageStateNoHistory = data.value.stagesStateNoHistory.get(id)
const stageStateNoHistory = rawStageStateNoHistory ? SuperJSON.parse(rawStageStateNoHistory) : null

const stage = computed(() => data.value.stages.get(id))

watch(stage, () => {
    const selection = stage.value.selection
    const groups = d3.select(container.value)
        .selectAll('g.scatter_point')
        .classed('text-info', d => selection?.includes(d.word))

}, { deep: true })

const scales = computed(() => {
    if (container.value === null) return null
    const width = container.value.clientWidth
    const height = container.value.clientHeight

    const xScale = d3.scaleLinear()
        .domain([scatterData.minX, scatterData.maxX])
        .range([0, width - MARGIN_X])

    const yScale = d3.scaleLinear()
        .domain([scatterData.minX, scatterData.maxY])
        .range([height - MARGIN_Y, 0])

    return [xScale, yScale]
})

const positions = computed(() => scatterData.embedding.map(d => {
    if (scales.value === null || zoomTransform.value == null) return null
    const [xScale, yScale] = scales.value

    const { k, x, y } = zoomTransform.value.transform
    const transform = new d3.ZoomTransform(k, x, y)
    return transform.apply([xScale(d.x) + MARGIN_X / 2, yScale(d.y) + MARGIN_Y / 2])

}))

watch(zoomTransform, (zoomVal) => {
    const { k, x, y } = zoomVal.transform
    const newTransform = new d3.ZoomTransform(k, x, y)
    const state = { transform: zoomVal }
    updateStageState(id, state, false)

    d3.select(container.value)
        .selectAll('text')
        .attr('transform', newTransform)
        .attr('font-size', 14 / k)
})



onMounted(() => {
    if (!container.value) return

    const [xScale, yScale] = scales.value

    // Filter without mutating the source
    //const filtered = data.data.filter(d => !currentFilter.value.includes(d.word))
    // TODO hack
    const filtered = scatterData.embedding

    const groups = d3.select(container.value)
        .selectAll('g')
        .data(filtered, d => d.word)
        .join(
            enter => {
                const g = enter.append('g')

                g.attr('id', d => `scatter_point_${d.word}`)
                g.classed('scatter_point', true)

                g.append('circle')
                    .attr('r', 1)
                    .attr('fill', 'none')
                    .attr('cx', d => xScale(d.x) + MARGIN_X / 2)
                    .attr('cy', d => yScale(d.y) + MARGIN_Y / 2)

                g.append('text')
                    .text(d => d.word)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('x', d => xScale(d.x) + MARGIN_X / 2)
                    .attr('y', d => yScale(d.y) + MARGIN_Y / 2)
                    .attr('font-size', 12)
                    .attr('fill', 'currentColor')

                return g
            },
            update => update,
            exit => exit.remove()
        )

    const prevTransform = stageStateNoHistory?.transform?.transform
    const { k, x, y } = prevTransform ? prevTransform : d3.zoomIdentity
    const initTransform = new d3.ZoomTransform(k, x, y)
    const z = d3.zoom()
        .filter(event => filterZoomEvents(event, z))
        // Zooming is setting the zoomTransform.value which gets watched
        .on('zoom', (e) => { zoomTransform.value = e })

    const selection = d3.select(container.value)
    selection
        .call(z)
        .call(z.transform, initTransform)

})

function filterZoomEvents(event, z) {
    //todo touchscreen
    if (event.type === 'mousedown') {
        return data.value.editorData.mainToolSelected === EDITMODES['Move'].name
    }
    const isPinch = event.ctrlKey
    if (isPinch) {
        // zoom
        return true
    }

    // pan
    event.preventDefault()
    event.stopPropagation()
    const t = d3.zoomTransform(container.value)
    z.translateBy(d3.select(container.value), -event.deltaX / t.k, -event.deltaY / t.k)
    return false
}

</script>

<style scoped>
.zoompinch {
    width: 100%;
    height: 100%;
}
</style>
