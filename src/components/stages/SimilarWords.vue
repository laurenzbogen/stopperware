<template>
    <h2 class="text-xl">Similar to '{{ stage.selected }}'</h2>

    <ul>
        <li v-for="d in reqData">{{ d[1] }}</li>
    </ul>

</template>

<script setup>
import { useLocalData } from '@/components/composables/useData';
import { useRequest } from '../composables/useRequest';
import { onMounted, ref, computed } from 'vue';


const props = defineProps(['stage', 'selection'])
const emit = defineEmits(['selectionChange', 'findSimilarWords'])

const { data } = useLocalData()
const hash = computed(() => data.value.corpus.hash)
const endpoint = computed(() => `/similar/${hash.value}/${props.stage.selected}`)

const { data: reqData, error } = useRequest(endpoint)




</script>
