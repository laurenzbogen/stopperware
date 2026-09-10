<template>
    <p class="font-bold m-0">DETAILS</p>
    <template v-if="detailStageId">

        <div class="mt-1 mb-8 text-xs">
            <p>{{ detailStageId }}</p>
        </div>
        <component :id="detailStageId" :is="detailComponent"></component>

        <div class="my-8">
            <p class="text-sm font-bold mb-2">Selection</p>
            <p class="text-[10px] font-bold flex" v-for="s in selection">
                <span class="">{{ s }}</span>
                <span class="m-auto"></span>
                <span class="size-4">
                    <SmallButton>
                        <Minus @click="selection = selection.filter(dS => dS !== s)" />
                    </SmallButton>
                </span>
            </p>

            <!-- <div class="inline-flex items-center gap-1 rounded-sm bg-neutral-300 p-1"> -->
            <!--     <button v-for="option in options" :key="option.value" type="button" @click="toggle(option.value)" :class="[ -->
            <!--         'flex h-9 w-9 items-center justify-center rounded-sm transition-colors', -->
            <!--         selected.includes(option.value) -->
            <!--             ? 'bg-neutral-400 text-neutral' -->
            <!--             : 'text-neutral-700 hover:text-neutral hover:bg-neutral-400' -->
            <!--     ]"> -->
            <!--         <component :is="option.icon" class="h-4 w-4" /> -->
            <!--     </button> -->
            <!-- </div> -->
            <!-- <p>t: {{ selected }} </p> -->

            <SmallButton @click="setOperationStopwords(new Set(selection), 'union')">
                <SquaresUnite />
            </SmallButton>
            <SmallButton @click="setOperationStopwords(new Set(selection), 'difference')">
                <SquaresSubtract />
            </SmallButton>
            <SmallButton @click="setOperationStopwords(new Set(selection), 'intersection')">
                <SquaresIntersect />
            </SmallButton>

            <input type="text" v-model="fuzzySearchModel" placeholder="Fuzzy Search" class="input mt-8 rounded-sm" />

            <!-- <div class="flex p-1 justify-start"> -->
            <!--     <ArrowDownToLine class="m-1 size-6 text-neutral/70" /> -->
            <!--     <ArrowDownFromLine class="m-1 size-6 text-neutral/70" /> -->
            <!-- </div> -->
        </div>

        <button class="btn btn-accent btn-outline btn-wide" @click="deleteStage(detailStageId)">Delete
            Stage</button>
        <p class="mt-[100vh]"> {{ detailStage }}</p>


    </template>
</template>

<script setup>
import Minus from '@/icons/Minus.vue';

import { computed, inject, markRaw, ref, watch } from 'vue';
import SmallButton from './design/SmallButton.vue';
import { SquaresUnite } from '@lucide/vue';
import { SquaresSubtract } from '@lucide/vue';
import { SquaresIntersect } from '@lucide/vue';
import Fuse from 'fuse.js';
import { detailComponents } from '@/stageTypeMap';

const { data, deleteStage, setOperationStopwords, requestDependencies } = inject('injectGlobalState')
const detailStageId = computed(() => data.value.editorData.detailStageId)
const detailStage = computed(() => data.value.stages.get(detailStageId.value))
const detailComponent = computed(() => detailComponents[detailStage.value.type])

const selection = computed({
    get: () => data.value.selectionGroups.get(data.value.stages.get(detailStageId.value).selectionGroupId),
    set: (val) => data.value.selectionGroups.set(data.value.stages.get(detailStageId.value).selectionGroupId, val)
})

const fuse = computed(() => new Fuse(requestDependencies.value['embeddingScatter'].data.positions?.map(w => w.word), { useExtendedSearch: true }))
const fuzzySearchModel = ref('')
watch(fuzzySearchModel, (newVal) => {
    if (!detailStage.value) return
    if (!fuse.value) return

    if (newVal === '') {
        detailStage.value.searchSelection = []
        return
    }
    if (!detailStage.value) return
    detailStage.value.searchSelection = fuse.value.search(newVal)
})


</script>
