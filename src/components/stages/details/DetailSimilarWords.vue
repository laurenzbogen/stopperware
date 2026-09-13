<template>
    <p class="text-[12px] font-bold text-neutral/60"> {{ similarKey }} </p>
    <form @submit.prevent="stagesStateNoHistory.get(id).similarKey = inputVal">
        <input class="input rounded-sm" v-model="inputVal" type="text">
    </form>
</template>
<script setup>
import { detailComponents } from '@/stageTypeMap';
import { computed, inject, ref, watch } from 'vue';

import { useDataStore } from '@/components/composables/useDataStore';
import { storeToRefs } from 'pinia';

const dataStore = useDataStore()
const { } = dataStore
const { stages, stagesStateNoHistory, stagesStateHistory } = storeToRefs(dataStore)

const { id } = defineProps(['id'])
const detailStage = computed(() => stages.get(id))
const detailComponent = computed(() => detailComponents[detailStage.value.type])

const inputVal = ref('')


const state = computed(() => {
    const noHistory = stagesStateNoHistory.value.get(id)
    const history = stagesStateHistory.value.get(id)
    return {
        ...noHistory,
        ...history,
    }
})

const similarKey = computed(() => stagesStateNoHistory.value.get(id).similarKey)


</script>
