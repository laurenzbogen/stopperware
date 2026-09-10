<template>
    <div class="absolute h-full w-full">
        <ScatterDiagram v-if="scatterData" ref="scatterRef" v-bind="scatterStageProps" />
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import ScatterDiagram from '../ScatterDiagram.vue';

const { id } = defineProps(["id"])
const scatterData = ref(null)
//scatterData: {maxX, minX, maxY, minY, positions}

onMounted(async () => {
    const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tfidf`, {
        credentials: 'include',
    })
    const data = await r.json()
    const maxX = Math.max(...data.map(d => d.x))
    const minX = Math.min(...data.map(d => d.x))
    const maxY = Math.max(...data.map(d => d.y))
    const minY = Math.min(...data.map(d => d.y))

    scatterData.value = {
        positions: data,
        maxX, minX, maxY, minY
    }

})

const scatterStageProps = computed(() => ({
    id: id,
    scatterData: scatterData.value,
    lassoOptions: {
        onLassoEnd
    }
}))

function onLassoEnd() { }

</script>
