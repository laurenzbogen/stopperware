<template>
    <p class="text-[12px] font-bold text-neutral/60"> {{ similarKey }} </p>
    <form @submit="data.stagesStateNoHistory.get(id).similarKey = inputVal" action="#">
        <input class="input rounded-sm" v-model="inputVal" type="text">
    </form>
</template>
<script setup>
import { detailComponents } from '@/stageTypeMap';
import { computed, inject, ref, watch } from 'vue';

const { data, deleteStage, setOperationStopwords, requestDependencies } = inject('injectGlobalState')
const { id } = defineProps(['id'])
const detailStage = computed(() => data.value.stages.get(id))
const detailComponent = computed(() => detailComponents[detailStage.value.type])

const inputVal = ref('')


const state = computed(() => {
    const noHistory = data.value.stagesStateNoHistory.get(id)
    const history = data.value.stagesStateHistory.get(id)
    return {
        ...noHistory,
        ...history,
    }
})

const similarKey = computed(() => data.value.stagesStateNoHistory.get(id).similarKey)


</script>
