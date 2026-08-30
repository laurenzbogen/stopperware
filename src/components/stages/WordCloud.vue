<template>
    <svg ref="container" width="100%" height="100%">
        <Lasso v-bind="{ container, targets: zoomedPositions, lassoOptions }" />
    </svg>
</template>

<script setup>
import * as d3 from 'd3';
import Lasso from '../Lasso.vue';
import cloud from 'd3-cloud';
import { computed, inject, markRaw, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import useZoom from '../composables/useZoom';

const { data } = inject('injectGlobalState')

const { id } = defineProps(['id'])
const container = useTemplateRef('container')

const layout = ref(null)
const layoutedWordcloud = ref(null)

const filteredWordcount = computed(() => data.value.corpus.word_count.filter(w => true))
const max = computed(() => filteredWordcount.value.reduce((acc, w) => Math.max(acc, w.count), 0))
const min = computed(() => filteredWordcount.value.reduce((acc, w) => Math.min(acc, w.count), Infinity))

const scale = computed(() => d3.scalePow().domain([min.value, max.value < 500 ? max.value : 500]).range([16, 72]).clamp(true))

const resizeTimer = ref(null)
const lazyWindowDimensions = ref(null)

const stage = computed(() => data.value.stages.get(id))

watch([stage, () => data.value.stopwords], () => {
    applyColors()
}, { deep: true })

const scaledPositions = computed(() => layoutedWordcloud.value?.map(d => [d.x + layout.value.size()[0] / 2, d.y + layout.value.size()[1] / 2]))
const { zoomedPositions, zoomTransform } = useZoom(id, container, scaledPositions)
watch(zoomTransform, (zoomVal) => {
    applyZoom(zoomVal)
})

const lassoOptions = { onLassoEnd }
function onLassoEnd(selected) {
    console.log(selected.length, layoutedWordcloud.value.length)
    console.log(selected)
    const s = layoutedWordcloud.value.filter((e, i) => selected[i]).map(e => e.word)
    data.value.stages.get(id).selection = s
}

function applyColors() {
    const selection = stage.value.selection
    d3.select(container.value)
        .selectAll('text')
        .classed('text-info', d => selection?.includes(d.word))
        .classed('text-accent', d => data.value.stopwords.has(d.word))
        .classed('text-primary', d => selection?.includes(d.word) && data.value.stopwords.has(d.word))
}

function applyZoom(zoomVal) {
    if (zoomVal === null) return
    const { k, x, y } = zoomVal.transform
    const newTransform = new d3.ZoomTransform(k, x, y)

    d3.select(container.value)
        .selectAll('text')
        .attr('transform', newTransform)
}

watch(lazyWindowDimensions, (newDimensions, oldDimensions) => {
    if (!newDimensions || newDimensions.some(v => v === 0)) {
        console.log("Cloud dimensions are null or 0, skipping..")
        return
    }
    if (oldDimensions && newDimensions.every((d, i) => d === oldDimensions[i])) return

    const maxWords = estimateMaxWords()
    //TODO workaround for shared state, still draws every wordcloud new when changing state...
    const wordsToDraw = filteredWordcount.value.slice(0, maxWords).map(w => markRaw({ ...w }))

    const thisLayout = cloud()
        .size(lazyWindowDimensions.value)
        .words(wordsToDraw)
        .text((d) => d.word)
        .rotate(0)
        .fontSize(d => scale.value(d.count))
        .padding(4)
        .random(() => 0.5)
        .on("end", (val) => {
            layoutedWordcloud.value = val
        })

    layout.value = thisLayout
    layout.value.start()
})

watch(layoutedWordcloud, (val) => {
    d3.select(container.value)
        .select("g").remove()
    d3.select(container.value)
        .append("g")
        //should be same as dimensions.value
        //.attr("transform", `translate(${layout.value.size()[0] / 2},${layout.value.size()[1] / 2})`)
        .selectAll("text")
        .data(val)
        .join("text")
        .style("font-size", d => `${d.size}px`)
        .style("font-family", "Impact")
        .attr("text-anchor", "middle")
        //.attr("transform", d => `translate(${[d.x, d.y]})rotate(${d.rotate})`)

        .attr('x', d => d.x + layout.value.size()[0] / 2)
        .attr('y', d => d.y + layout.value.size()[1] / 2)
        .text(d => d.word)
        .attr('fill', 'currentColor');

    applyZoom(zoomTransform.value)
    applyColors(stage.value)
}, { deep: true })





function estimateMaxWords() {
    const containerArea = lazyWindowDimensions.value[0] * lazyWindowDimensions.value[1]

    // Conservative packing efficiency — word clouds rarely exceed 30–40% fill
    const PACKING_EFFICIENCY = 0.8;
    const availableArea = containerArea * PACKING_EFFICIENCY;

    const CHAR_WIDTH_RATIO = 0.6; // avg char width as fraction of font size
    const PADDING = 4;

    let usedArea = 0;
    let count = 0;

    for (const d of filteredWordcount.value) {
        const fontSize = scale.value(d.count);
        const wordWidth = d.word.length * fontSize * CHAR_WIDTH_RATIO + PADDING * 2;
        const wordHeight = fontSize + PADDING * 2;
        const wordArea = wordWidth * wordHeight;

        usedArea += wordArea;
        if (usedArea > availableArea) break;
        count++;
    }

    return count;
}














// Apply dimensions changes in a lazy way


function handleResize(e) {
    if (!container.value) {
        return
    }
    if (resizeTimer.value) clearTimeout(resizeTimer.value);
    resizeTimer.value = setTimeout(() => {
        lazyWindowDimensions.value = [
            container.value.clientWidth,
            container.value.clientHeight,
        ]
    }, 200)
}

onMounted(async () => {
    window.addEventListener("resize", handleResize)
    handleResize()
})
onUnmounted(() => {
    window.removeEventListener("resize", handleResize)
    clearTimeout(resizeTimer)
})




</script>
