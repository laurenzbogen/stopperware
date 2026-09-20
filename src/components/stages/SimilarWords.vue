<template>
    <div class="size-full flex flex-col p-8 gap-6 overflow-hidden">
        <template v-if="active">
            <h2 @contextmenu="(e) => handleContextMenu(e, similarKey)"
                :class="`text-5xl text-center font-bold tracking-tight ${getWordStyle(similarKey)}`">
                {{ similarKey }}
            </h2>

            <div class="flex-1 min-h-0 overflow-y-auto">
                <div class="grid grid-cols-2 gap-x-8 gap-y-1 max-w-4xl mx-auto">
                    <div v-for="[ratio, word] in similarValue" :key="word"
                        class="group flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-black/5 transition-colors">
                        <p @contextmenu="(e) => { handleContextMenu(e, word) }"
                            :class="`text-2xl truncate flex-1 ${getWordStyle(word)}`"
                            :title="word">
                            {{ word }}
                        </p>

                        <div class="flex items-center gap-2 shrink-0">
                            <div class="w-16 h-1.5 rounded-full bg-black/10 overflow-hidden">
                                <div class="h-full rounded-full bg-current opacity-60"
                                    :style="{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }" />
                            </div>
                            <span class="text-sm tabular-nums text-black/50 w-10 text-right">
                                {{ ratio.toFixed(2) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <div v-else class="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <p class="text-2xl text-black/40 font-medium">No word selected yet</p>
            <form @submit.prevent="submitKey" class="flex items-center gap-2">
                <input v-model="draftKey" type="text" placeholder="Type a word…"
                    class="text-lg px-4 py-2 rounded-lg border border-black/15 focus:outline-none focus:ring-2 focus:ring-black/20 w-64" />
                <button type="submit"
                    class="text-lg px-4 py-2 rounded-lg bg-black text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    :disabled="!draftKey.trim()">
                    Set
                </button>
            </form>
        </div>
    </div>
</template>

<script setup>
import { computed, inject, ref, watch } from 'vue';
import { useState } from '../composables/useState';


import useDynamicDependency from '../composables/useDynamicDependency.js'
import { useDataStore } from '../composables/useDataStore';
import { storeToRefs } from 'pinia';

const { stages } = storeToRefs(useDataStore())

const { getWordStyle, handleContextMenu } = inject('injectPipelineState')
const { id } = defineProps(['id', 'dependencyData'])

const { similarKey, similarValue } = useState(id, {
    similarKey: { default: stages.value?.get(id)?.init?.similarKey ?? '', history: false, live: true },
    similarValue: { default: [], history: false, live: true },
})
const active = computed(() => similarKey.value !== '')
const endpoint = computed(() => active.value ? `similar/${similarKey.value}` : '')

const { data, isFetching } = useDynamicDependency(endpoint)

watch(data, (val) => {
    if (val.length > 0) {
        similarValue.value = val
    }
})

const draftKey = ref('')
const submitKey = () => {
    const trimmed = draftKey.value.trim()
    if (!trimmed) return
    similarKey.value = trimmed
    draftKey.value = ''
}

</script>
