<template>
    <div @click="editorData.detailStageId = stage.id" class="contents">
        <div :style="{ opacity: editorData.detailStageId === stage.id ? 1 : 0.5 }" class="flex gap-2 items-center py-2">
            <!-- <span class="font-bold text-primary-content/60 text-xs">{{ i + 1 }}</span> -->
            <span class="font-bold text-primary-content/60 text-xs"> — </span>
            <span class="font-bold text-primary-content/60 text-xs">{{ stage.type }}</span>
            <span class="font-bold text-primary-content/60 text-xs">{{ stage.id }}</span>
            <span class="m-auto"></span>
        </div>

        <div id="stageComponent" class="bg-base-100 rounded-sm grow relative font-['Open_Sans']" ref="stageComponents">
            <component v-if="dependentOn.every(d => requestDependencies[d].status === REQUEST_STATUS['AVAILABLE'])"
                :is="stageTypeMap[stage.type]" :id="stage.id" :key="stage.id" :stage="stage" />
            <div v-else class="w-full h-full grid place-items-center">
                <span class="loading loading-spinner loading-sm"></span>
            </div>
        </div>

    </div>

</template>

<script setup>
import { stageTypeMap, stageTypeDependencies } from '@/stageTypeMap';
import { inject, onMounted } from 'vue';


import { useDataStore } from '@/components/composables/useDataStore';
import { storeToRefs } from 'pinia';

import { REQUEST_DEPENDENCIES, REQUEST_STATUS } from './composables/useDependencyStore.js';
import { useDependencyStore } from './composables/useDependencyStore';

const dataStore = useDataStore()
const { editorData } = storeToRefs(dataStore)

const { stage } = defineProps(['stage'])

const dependencyStore = useDependencyStore()
const { requestDependencies } = storeToRefs(dependencyStore)

const dependentOn = stageTypeDependencies[stage.type]

</script>
