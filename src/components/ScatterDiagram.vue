<template>
    <svg :id="id" ref="container" width="100%" height="100%" @contextmenu.prevent="handleContextMenu($event, null)">
        <g :transform="transformString">
            <g class="relative transition-opacity"
                v-for="(d, i) in [...scatterPositions].sort((a, b) => (occlusionRatios.get(a.word) ?? 1) - (occlusionRatios.get(b.word) ?? 1))"
                :key="d.word" :style="{ opacity: getOpacityValue(d.word) }" :id="`scatter_point_${d.word}`"
                :class="['scatter_point', getWordStyle(d.word)]" :ref="el => setGroupRef(el, d)">>
                <circle fill="gray" :cx="pointX(d)" :cy="pointY(d)" :r="1 / renderedTransform.k" />
                <text :x="pointX(d)" :y="pointY(d)" text-anchor="middle" dominant-baseline="middle"
                    :font-size="14 / renderedTransform.k" fill="currentColor"
                    @contextmenu.prevent.stop="handleContextMenu($event, d.word)">{{ d.word }}</text>
            </g>
        </g>

        <Lasso v-if="lassoOptions" v-bind="{ container, targets: zoomedPositions, lassoOptions }" />
    </svg>
</template>

<script setup>
import { computed, inject, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';
import * as d3 from 'd3'
import Lasso from "./Lasso.vue";
import useZoom from './composables/useZoom';
import Quadtree from '@timohausmann/quadtree-js';
import { useDataStore } from './composables/useDataStore';
import { storeToRefs } from 'pinia';


const dataStore = useDataStore()
const { stopwords } = storeToRefs(dataStore)

const MARGIN_X = 100
const MARGIN_Y = 100

const { id, scatterPositions, lassoOptions } = defineProps(['id', 'scatterPositions', 'lassoOptions'])
const { handleContextMenu, getWordStyle, selection, getPipelineExclude } = inject('injectPipelineState')

const container = useTemplateRef("container")
defineExpose({ container, zoomIntoView })

const scales = computed(() => {
    if (container.value === null) return null
    const width = container.value.clientWidth
    const height = container.value.clientHeight

    const maxX = Math.max(...scatterPositions.map(d => d.x))
    const minX = Math.min(...scatterPositions.map(d => d.x))
    const maxY = Math.max(...scatterPositions.map(d => d.y))
    const minY = Math.min(...scatterPositions.map(d => d.y))
    const xScale = d3.scaleLinear()
        .domain([minX, maxX])
        .range([0, width - MARGIN_X])

    const yScale = d3.scaleLinear()
        .domain([minX, maxY])
        .range([height - MARGIN_Y, 0])

    return [xScale, yScale]
})

function pointX(d) {
    if (!scales.value) return 0
    const [xScale] = scales.value
    return xScale(d.x) + MARGIN_X / 2
}
function pointY(d) {
    if (!scales.value) return 0
    const [, yScale] = scales.value
    return yScale(d.y) + MARGIN_Y / 2
}

const scaledPositions = computed(() => scatterPositions.map(d => {
    if (scales.value === null) return null
    return [pointX(d), pointY(d)]
}))

function getOpacityValue(w) {
    if (selection.value.length > 0 && !selection.value.includes(w)) {
        return 0.1
    }
    return occlusionRatios.value.get(w) ?? 1
}


const { zoomedPositions, zoomTransform, targetZoom, resetZoom } = useZoom(id, container, scaledPositions)
const renderedTransform = ref({ k: 1, x: 0, y: 0 })
const transformString = computed(() =>
    `translate(${renderedTransform.value.x},${renderedTransform.value.y}) scale(${renderedTransform.value.k})`
)

let scheduledZoom = false
let scheduledOcclusion = false
watch(zoomTransform, (zoomVal, oldZoomVal) => {
    const { k, x, y } = zoomVal.transform
    const oldK = oldZoomVal?.transform.k


    if (!scheduledZoom) {
        scheduledZoom = true
        renderedTransform.value = { k, x, y }
        scheduledZoom = false
    }

    if (!scheduledOcclusion && k !== oldK) {
        scheduledOcclusion = true
        requestIdleCallback(() => {
            computeOcclusion()
            scheduledOcclusion = false
        })
    }
}, { deep: true })

function zoomIntoView(words) {
    const positions = scatterPositions.map((s, i) => {
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
}

// --- Occlusion ---
const groupRefs = ref(new Map())
function setGroupRef(el, d) {
    if (el) {
        groupRefs.value.set(d.word, { el, x: pointX(d), y: pointY(d) })
    } else {
        groupRefs.value.delete(d.word) // cleanup when unmounted
    }
}

let initialBounds = []
let initDimensions = {}
onMounted(() => {
    nextTick(() => {
        initDimensions = container.value.getBoundingClientRect()
        initialBounds = Array.from(groupRefs.value.entries()).map(([word, o]) => {
            const box = o.el.getBoundingClientRect()
            return {
                x: o.x,
                y: o.y,
                width: box.width,
                height: box.height,
                element: o.el,
                word: word,
            }
        })

    })
})

const OCCLUSION_FACTOR = 1.1
const occlusionRatios = ref(new Map())
let lastOccZoom = 0;

function computeOcclusion() {
    const { k, x, y } = renderedTransform.value
    if (k === lastOccZoom) {
        return
    }
    const containerRect = {
        x: initDimensions.x,
        y: initDimensions.y,
        width: initDimensions.width * k,
        height: initDimensions.height * k,
    }
    const quad = new Quadtree(containerRect);

    const exclude = getPipelineExclude()

    const nodes = [...initialBounds]
        .sort((a, b) => {
            const sa = stopwords.value.has(a.word) ? 1 : 0
            const sb = stopwords.value.has(b.word) ? 1 : 0
            if (sa !== sb) return sb - sa
            return 0
        })
        .map(b => ({
            x: b.x * k,
            y: b.y * k,
            width: b.width,
            height: b.height,
            element: b.element,
            word: b.word,
        }))

    for (const i in nodes) {
        const n = nodes[i]
        if (exclude.has(n.word)) continue
        const elements = quad.retrieve(n)

        const ratios = elements.map(v => overlapRatio(n, v))
        const cumRatio = ratios.reduce((acc, x) => acc + x * OCCLUSION_FACTOR, 0)

        if (cumRatio < 1) {
            const { x, y, width, height } = n
            quad.insert({
                x, y, width, height
            })
        }

        occlusionRatios.value.set(n.word, Math.max(0, 1 - cumRatio))
    }

}

function overlapRatio(a, b) {
    const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
    const overlapArea = overlapX * overlapY
    const aArea = a.width * a.height
    return aArea > 0 ? overlapArea / aArea : 0
}

function intersectRect(a, b, tolerance = 0) {
    return !(
        a.x + a.width - tolerance < b.x ||
        b.x + b.width - tolerance < a.x ||
        a.y + a.height - tolerance < b.y ||
        b.y + b.height - tolerance < a.y
    );
}

// Recompute occlusion whenever the underlying data changes (positions are
// bound reactively via v-for/computeds already, this just re-measures layout)
watch(() => scatterPositions, () => {
    if (!container.value) return
    if (!scheduledOcclusion) {
        scheduledOcclusion = true
        requestIdleCallback(() => {
            computeOcclusion()
            scheduledOcclusion = false
        })
    }
}, { immediate: true, flush: 'post' })

watch(stopwords, computeOcclusion)

</script>

<style></style>
