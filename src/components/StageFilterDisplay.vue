<template>
    <div class="relative">
        <div class="absolute p-4 right-0 top-0 cursor-pointer" @click="toggled = !toggled">
            <svg v-if="!toggled" class="fill-current" xmlns="http://www.w3.org/2000/svg" width="32" height="32"
                viewBox="0 0 512 512">
                <path d="M64,384H448V341.33H64Zm0-106.67H448V234.67H64ZM64,128v42.67H448V128Z" />
            </svg>
            <svg v-else class="fill-current" xmlns="http://www.w3.org/2000/svg" width="32" height="32"
                viewBox="0 0 512 512">
                <polygon
                    points="400 145.49 366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256 400 145.49" />
            </svg>
        </div>

        <div v-if="toggled" class="w-40 p-6">
            <h2 class="font-bold">Filters</h2>
            <ul>
                <li class="hover:line-through cursor-pointer" v-for="fWord in filter"
                    @click="changeStageFilter(id, [{ word: fWord, action: 'REMOVE' }])">{{ fWord
                    }}</li>
            </ul>
            <!-- Filter Display {{id}} -->

            <!-- {{filter}} -->
        </div>

    </div>

</template>

<script setup>
import { ref, watchEffect, inject } from 'vue';

const { id } = defineProps(["id"])
const { pipeline, changeStageFilter, getCumulativeFilter } = inject('injectPipeline')
const filter = ref([])
const toggled = ref(false)

watchEffect(() => filter.value = getCumulativeFilter(id))

</script>
