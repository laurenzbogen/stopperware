<template>
    <svg :id="id" ref="container" width="100%" height="100%" @contextmenu="handleContextMenu">
        <Lasso v-if="lassoOptions" v-bind="{ container, targets: zoomedPositions, lassoOptions }" />
    </svg>
</template>

<script setup>
import { computed, inject, onMounted, ref, useTemplateRef, watch } from 'vue';
import * as d3 from 'd3'
import Lasso from "./Lasso.vue";
import useZoom from './composables/useZoom';

const MARGIN_X = 100
const MARGIN_Y = 100

const { id, scatterData, lassoOptions } = defineProps(['id', 'scatterData', 'lassoOptions'])
const { handleWordContextMenu } = inject('injectGlobalState')

const container = useTemplateRef("container")
defineExpose({ container, zoomIntoView })


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


const scaledPositions = computed(() => scatterData.positions.map(d => {
    if (scales.value === null) return null
    const [xScale, yScale] = scales.value

    return [xScale(d.x) + MARGIN_X / 2, yScale(d.y) + MARGIN_Y / 2]
}))

const { zoomedPositions, zoomTransform, targetZoom, resetZoom } = useZoom(id, container, scaledPositions)

let scheduledZoom = false
let scheduledOcclusion = false
watch(zoomTransform, (zoomVal) => {
    const { k, x, y } = zoomVal.transform
    const newTransform = new d3.ZoomTransform(k, x, y)

    if (!scheduledZoom) {
        scheduledZoom = true
        requestAnimationFrame(() => {
            d3.select(container.value)
                .selectAll('g')
                .attr('transform', newTransform)
                .attr('font-size', 14 / k)
                .select('circle')
                .attr('r', 1/k)
            scheduledZoom = false
        })
    }


    if (!scheduledOcclusion) {
        scheduledOcclusion = true
        requestIdleCallback(() => {
            d3.select(container.value).call(occlusion)
            scheduledOcclusion = false
        })
    }
})

function zoomIntoView(words) {
    const positions = scatterData.positions.map((s, i) => {
        if (words.includes(s.word)) {
            return scaledPositions.value[i]
        }
        return null
    }).filter(w => w)


    if (positions.length === 0) {
        resetZoom()
        return
    }

    const minX = positions.reduce((acc, p) => Math.min(acc, p[0]), Infinity)
    const minY = positions.reduce((acc, p) => Math.min(acc, p[1]), Infinity)
    const maxX = positions.reduce((acc, p) => Math.max(acc, p[0]), -Infinity)
    const maxY = positions.reduce((acc, p) => Math.max(acc, p[1]), -Infinity)

    const center = [minX + (maxX - minX) / 2, minY + (maxY - minY) / 2]
    const bounds = [maxX - minX, maxY - minY]


    targetZoom(center, bounds)

    return
}




onMounted(() => {
    if (!container.value) return

    const [xScale, yScale] = scales.value

    // Filter without mutating the source
    //const filtered = data.data.filter(d => !currentFilter.value.includes(d.word))
    // TODO hack
    const filtered = scatterData.positions

    const groups = d3.select(container.value)
        .selectAll('g')
        .data(filtered, d => d.word)
        .join(
            enter => {
                const g = enter.append('g')

                g.attr('id', d => `scatter_point_${d.word}`)
                g.classed('scatter_point', true)

                g.append('circle')
                    .attr('fill', 'gray')
                    .attr('cx', d => xScale(d.x) + MARGIN_X / 2)
                    .attr('cy', d => yScale(d.y) + MARGIN_Y / 2)

                g.append('text')
                    .text(d => d.word)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('x', d => xScale(d.x) + MARGIN_X / 2)
                    .attr('y', d => yScale(d.y) + MARGIN_Y / 2)
                    //Dont set font-size here
                    //.attr('font-size', 12)
                    .attr('fill', 'currentColor')
                    .on('contextmenu', (e, d) => { handleWordContextMenu(e, [d.word]) })

                return g
            },
            update => update,
            exit => exit.remove()
        )

    d3.select(container.value).call(occlusion)


})


function occlusion(svg, against = "g") {
    //d3
    //.sort(svg.selectAll(against), (node) => +node.getAttribute("data-priority"))
    //.reverse()
    const nodes = svg.selectAll(against)
        .nodes()
        .map((node) => {
            const { x, y, width, height } = node.getBoundingClientRect();
            return { node, x, y, width, height };
        });

    const visible = [];
    for (const d of nodes) {
        const occluded = visible.some((e) => intersectRect(d, e));
        d3.select(d.node).classed("occluded", occluded);
        if (!occluded) visible.push(d);
    }
    return visible;
}

function intersectRect(a, b) {
    return !(
        a.x + a.width < b.x ||
        b.x + b.width < a.x ||
        a.y + a.height < b.y ||
        b.y + b.height < a.y
    );
}

</script>

<style>
.occluded text {
    opacity: 0.05;
}
circle {
    opacity: 0
}
.occluded circle {
    opacity: 0
}
</style>
