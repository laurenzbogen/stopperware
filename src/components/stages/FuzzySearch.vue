<template>
    <div class="py-8">
        <input v-model="searchVal" class="input block mx-auto" type="text">
    </div>
    <div v-show="searchVal.length !== 0">
        <p class="text-[12px] font-bold">{{ searchResults.length }} Ergebnis{{ searchResults.length !== 1 ? 'se' : '' }}</p>
        <div :class="`flex flex-wrap justify-center items-start gap-2 p-1 text-sm h-[3ch] overflow-hidden w-32 `">
            <p v-for="r in searchResults.slice(0, 30)" :key="r.item" class="m-0 p-0">
                {{ r.item }}
            </p>
        </div>
    </div>
</template>

<script setup>
import Fuse from 'fuse.js';
import { computed, inject, ref, watch } from 'vue';
import { useDependencyStore } from '../composables/useDependencyStore';

const { id } = defineProps(['id', 'stage'])
const dependencyStore = useDependencyStore()
const { requestDependencies } = storeToRefs(dependencyStore)
const searchVal = ref('')
const words = computed(() => requestDependencies.value['wordcount'].data.map(w => w.word))
const fuse = computed(() => new Fuse(Array.from(words.value), { useExtendedSearch: true }))
const searchResults = ref([])

watch(searchVal, (val) => {
    searchResults.value = fuse.value.search(searchVal.value)
})
//const searchResults = computed(() => )

</script>
