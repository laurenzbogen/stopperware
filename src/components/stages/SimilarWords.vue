<template>
    <div class="size-full flex flex-col p-8">
        <h2 @contextmenu="(e) => handleContextMenu(e, similarKey)"
            :class="`text-7xl text-center font-bold ${getWordStyle(similarKey)}`">{{
                similarKey }}</h2>
        <div class="w-[500px]">
            <div class="flex flex-row my-4 justify-between items-center" v-for="[ratio, word] in results">
                <p @contextmenu="(e) => { handleContextMenu(e, word) }" :class="`text-6xl ${getWordStyle(word)}`">
                    {{
                        word }}</p>
                <p class="text-4xl">{{ ratio.toFixed(2)  }}
                </p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref, computed, watch, useTemplateRef, inject } from 'vue';
import { useState } from '../composables/useState';


const { getWordStyle, handleContextMenu } = inject('injectPipelineState')
const { id } = defineProps(['id', 'stage'])

const { similarKey } = useState(id, {
    similarKey: { default: '', history: false }
})

const results = ref([])

watch(similarKey, async (val) => {
    const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/embeddingSimilar/${val}`, {
        credentials: 'include',
    })

    const res = await r.json()
    results.value = res
})

</script>
