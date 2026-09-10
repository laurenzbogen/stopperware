<template>
    <div class="size-full flex flex-col p-8">
        <h2 @contextmenu="(e) => handleWordContextMenu(e, [similarKey])"
            :class="`text-7xl text-center font-bold ${getWordStyle(similarKey)}`">{{
                similarKey }}</h2>
        <div class="w-[500px]">
            <div class="flex flex-row my-4 justify-between items-center" v-for="[ratio, word] in results">
                <p @contextmenu="(e) => { handleWordContextMenu(e, [word]) }" :class="`text-6xl ${getWordStyle(word)}`">{{
                    word }}</p>
                <p class="text-4xl">{{ ratio.toFixed(2) }}
                </p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref, computed, watch, useTemplateRef, inject } from 'vue';
import Lasso from '../Lasso.vue';

const { data, updateStageState, handleWordContextMenu } = inject('injectGlobalState')
const { getWordStyle } = inject('injectPipelineState')
const lassoOptions = {
    onLassoEnd
}
const { id } = defineProps(['id', 'stage'])
const container = useTemplateRef('container')

const state = computed(() => {
    const noHistory = data.value.stagesStateNoHistory.get(id)
    const history = data.value.stagesStateHistory.get(id)
    return {
        ...noHistory,
        ...history,
    }
})
const similarKey = computed(() => state.value.similarKey ?? 'noKey')

const selection = computed({
    get: () => data.value.selectionGroups.get(data.value.stages.get(id).selectionGroupId),
    set: (val) => data.value.selectionGroups.set(data.value.stages.get(id).selectionGroupId, val)
})

function onLassoEnd() {

}



const emit = defineEmits(['selectionChange', 'findSimilarWords'])

const results = ref([])

watch(similarKey, async (val) => {
    const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/embeddingSimilar/${val}`, {
        credentials: 'include',
    })

    const res = await r.json()

    updateStageState(id, {
        similarKey: val,
        similarResult: res,
    }, false)
    results.value = res
}, { immediate: true })

//const endpoint = computed(() => `/similar/${hash.value}/${props.stage.selected}`)





</script>
