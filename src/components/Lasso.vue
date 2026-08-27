<template>
    <path :d="generatedPath" class="lasso-path" fill="none" stroke="#667" stroke-width="2" stroke-dasharray="4" />
</template>

<script setup>
import { EDITMODES } from '@/helpers';
import * as d3 from 'd3';
import { computed, inject, onMounted, ref, watch } from 'vue';

// targets takes reactive array of [x, y]; gives back selected indeces
const { container, targets, lassoOptions } = defineProps(['container', 'targets', 'lassoOptions'])
const { onLassoStart, onLassoDrag, onLassoEnd } = lassoOptions

const { data } = inject('injectGlobalState')
const enabled = computed(() => data.value.editorData.mainToolSelected === EDITMODES['Lasso'].name)


const lassoEvents = ref([])
const generatedPath = computed(() => {
    return lassoEvents.value.reduce((acc, e, index) => {
        const svgSelect = d3.select(container)
        const [mx, my] = d3.pointer(e, svgSelect.node());
        return `${acc} ${index === 0 ? 'M' : 'L'} ${mx} ${my}`;
    }, '');
});


watch(() => container, () => {
    if (container === null) return
    const svgSelect = d3.select(container)

    svgSelect.call(d3.drag()
        .filter((e) => {
            return enabled.value === true
        })
        .on('start', (e) => {
            lassoEvents.value = [e];
            onLassoStart?.();
        })
        .on('drag', (e) => {
            lassoEvents.value.push(e);
            onLassoDrag?.();
        })
        .on('end', () => {
            const path = lassoEvents.value.map(e => d3.pointer(e, svgSelect.node()))
            const res = targets.map(t => pointInPathPolygon(t, path))
            onLassoEnd?.(res)

            lassoEvents.value = []
        }));
})


function pointInPathPolygon([x, y], path) {
    let inside = false;
    for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
        const [xi, yi] = path[i];
        const [xj, yj] = path[j];
        if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

</script>
