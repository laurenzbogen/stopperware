<template>
    <div @click="editorData.detailStageId = stage.id" class="contents">
        <div :style="{ opacity: editorData.detailStageId === stage.id ? 1 : 0.5 }" class="flex gap-2 items-center py-2">
            <span class="font-bold text-primary-content/60 text-xs"> — </span>
            <span class="font-bold text-primary-content/60 text-xs">{{ stage.type }}</span>
            <span class="font-bold text-primary-content/60 text-xs">{{ stage.id }}</span>
            <span class="m-auto"></span>
        </div>

        <div id="stageComponent" class="bg-base-100 rounded-sm grow relative font-['Open_Sans']" ref="stageComponents">
            <component v-if="dependenciesReady" :is="stageTypeMap[stage.type]" :id="stage.id" :key="stage.id"
                :dependencyData="dependencyData" />

            <div v-else class="w-full h-full grid place-items-center">
                <span class="loading loading-spinner loading-sm"></span>
            </div>
        </div>

    </div>

</template>

<script setup>
import { stageTypeMap } from '@/stages.js';
import { computed, inject, onMounted, watchEffect } from 'vue';


import { useDataStore } from '@/components/composables/useDataStore';
import { storeToRefs } from 'pinia';

import { useDependencyStore } from './composables/useDependencyStore';

const dataStore = useDataStore()
const { editorData } = storeToRefs(dataStore)

const { stage } = defineProps(['stage'])

const dependencyStore = useDependencyStore()
const { allDependenciesReady, ensureDependencies, getFilteredDependencyData } = dependencyStore

const { getPipelineExclude } = inject('injectPipelineState')

const dependenciesReady = computed(() => allDependenciesReady(stage.type))
const dependencyData = computed(() => {
    if (!dependenciesReady.value) return {}
    const filterWordSet = getPipelineExclude()
    return getFilteredDependencyData(stage.type, filterWordSet)
})
watchEffect(() => ensureDependencies(stage.type))


</script>
