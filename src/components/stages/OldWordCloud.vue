<template>
    <div ref="container" class="h-80">
        <svg width="100%" height="100%"></svg>
    </div>
    <!-- <svg ref="" width="100%" height="100%"></svg> -->


</template>
<script setup>
import { onMounted, computed, useTemplateRef, onUnmounted, inject, watch, ref } from 'vue';
import { useData } from '@/components/composables/useData';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import { useSelectionStyle } from '../util/util';

const { id } = defineProps(['id'])
const container = useTemplateRef("container")
const { pipeline, getCumulativeFilter } = inject("injectPipelineState")
const { onWordContextMenu } = inject('injectGlobalState')
const { getters: { get_filtered_wc } } = useData()

let resizeTimer = ref(null)
const { getSelectionStyle, triggers } = useSelectionStyle()
watch(triggers, () => colorStopwords(), { deep: true })


const currentFilter = computed(() => getCumulativeFilter(id))
watch(currentFilter, () => {
    calculate()
}, { deep: true }
)

onMounted(async () => {
    window.addEventListener("resize", handleResize)
    calculate()
})
onUnmounted(() => {
    window.removeEventListener("resize", handleResize)
    clearTimeout(resizeTimer)
})

function handleResize(e) {
    if (!container.value) {
        return
    }
    if (resizeTimer.value) clearTimeout(resizeTimer.value);
    resizeTimer.value = setTimeout(() => {
        calculate()
    }, 200)
}


function estimateMaxWords(dimensions, data, scale) {
    const containerArea = dimensions.width * dimensions.height;

    // Conservative packing efficiency — word clouds rarely exceed 30–40% fill
    const PACKING_EFFICIENCY = 0.8;
    const availableArea = containerArea * PACKING_EFFICIENCY;

    const CHAR_WIDTH_RATIO = 0.6; // avg char width as fraction of font size
    const PADDING = 4;

    let usedArea = 0;
    let count = 0;

    for (const d of data) {
        const fontSize = scale(d.count);
        const wordWidth = d.word.length * fontSize * CHAR_WIDTH_RATIO + PADDING * 2;
        const wordHeight = fontSize + PADDING * 2;
        const wordArea = wordWidth * wordHeight;

        usedArea += wordArea;
        if (usedArea > availableArea) break;
        count++;
    }

    return count;
}

async function calculate() {
    const data = get_filtered_wc(getCumulativeFilter(id))
    const containerEl = container.value
    d3.select(containerEl).selectAll('svg').remove()

    //const max = Math.max.apply(0, data.map(d => d.count))
    //const min = Math.min.apply(0, data.map(d => d.count))
    //let scale = d3.scalePow().domain([min, 500]).range([16, 72]).clamp(true)

    if (containerEl.clientWidth == 0 || containerEl.clientHeight == 0) {
        console.log("Cloud Container is Size 0, Skipping calculating Word Cloud")
    }

    const maxWords = estimateMaxWords(
        { width: containerEl.clientWidth, height: containerEl.clientHeight },
        data,
        scale
    );

    const sliced = data.slice(0, maxWords).map(d => ({ ...d }))

    const layout = cloud()
        .size([containerEl.clientWidth, containerEl.clientHeight])
        .words(sliced)
        .text(function (d) { return d.word })
        .rotate(0)
        .fontSize(d => scale(d.count))
        .padding(4)
        .random(() => 0.5)
        .on("end", (words) => {
            draw(words, layout)
        }); // When layout is calculated, call draw

    layout.start();
}

function draw(words, layout) {
    const containerEl = container.value
    d3.select(containerEl).selectAll('svg').remove()
    d3.select(containerEl)
        .append("svg")
        .attr("width", layout.size()[0])
        .attr("height", layout.size()[1])
        .append("g")
        .attr("transform", `translate(${layout.size()[0] / 2},${layout.size()[1] / 2})`)
        .selectAll("text")
        .data(words)
        .join("text")
        .on("contextmenu", handleContextMenu)
        .style("font-size", d => `${d.size}px`)
        .style("font-family", "Impact")
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${[d.x, d.y]})rotate(${d.rotate})`)
        .text(d => d.word)
        .attr('fill', 'currentColor');

    colorStopwords()
}

function handleContextMenu(e, d) {
    const newOptions = {
        selection: [d.word], x: e.clientX, y: e.clientY, show: true,
    }
    onWordContextMenu(e, newOptions)
}

function colorStopwords() {
    const containerEl = container.value
    d3.select(containerEl).select("svg").select('g').selectAll('text')
        .attr('class', (d) => {
            return getSelectionStyle(d.word)
        })
}




</script>
