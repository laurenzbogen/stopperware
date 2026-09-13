<template v-if="detailStageId">
    <div class="h-full flex flex-col">
        <div class="mb-16">
            <p class="font-bold m-0">PIPELINE</p>

            <div class="mt-1 mb-8 text-xs">
                <p>{{ detailPipelineId }}</p>

                <SmallButton @click="detailPipeline.exclude = new Set()">
                    <FilterX />
                </SmallButton>
            </div>

            <div class="my-8">
                <p class="text-sm font-bold mb-2">Selection</p>
                <div
                    class="text-[10px] border border-1 rounded-sm p-4 flex flex-wrap items-start content-start gap-2 h-48 overflow-scroll">
                    <span class="bg-base-200 font-bold flex p-1 items-center gap-1 rounded-md" v-for="s in selection">
                        <span class="">{{ s }}</span>
                        <X :size=16 @click="selection = selection.filter(dS => dS !== s)" />
                    </span>
                </div>

                <SmallButton @click="setOperationStopwords(new Set(selection), 'union')">
                    <SquaresUnite />
                </SmallButton>
                <SmallButton @click="setOperationStopwords(new Set(selection), 'difference')">
                    <SquaresSubtract />
                </SmallButton>
                <SmallButton @click="setOperationStopwords(new Set(selection), 'intersection')">
                    <SquaresIntersect />
                </SmallButton>
                <SmallButton @click="setOperationPipelineExclude(new Set(selection), 'union', detailPipelineId)">
                    <Filter />
                </SmallButton>

            </div>
        </div>

        <div class="grow">
            <p class="font-bold m-0">STAGE</p>
            <div class="mt-1 mb-8 text-xs">
                <p>{{ detailStageId }}</p>
                <p>{{ detailStage?.type }}</p>
            </div>

            <component :id="detailStageId" :is="detailComponent"></component>

            <input type="text" v-model="fuzzySearchModel" placeholder="Fuzzy Search" class="input mt-8 rounded-sm" />
        </div>


        <div class="my-8">
            <button class="btn btn-accent btn-outline btn-wide my-2" @click="deleteStage(detailStageId)">Delete
                Stage</button>
            <button class="btn btn-accent btn-wide text-white my-2" @click="deletePipeline(detailPipelineId)">Delete
                Pipeline</button>
        </div>
    </div>
</template>

<script setup>
import { computed, inject, ref, watch } from 'vue';
import SmallButton from './design/SmallButton.vue';
import { Filter, FilterX, SquaresUnite, X } from '@lucide/vue';
import { SquaresSubtract } from '@lucide/vue';
import { SquaresIntersect } from '@lucide/vue';
import Fuse from 'fuse.js';
import { detailComponents } from '@/stageTypeMap';
import { useDataStore } from '@/components/composables/useDataStore';
import { storeToRefs } from 'pinia';

const dataStore = useDataStore()
const { setOperationStopwords, setOperationPipelineExclude, deleteStage, deletePipeline } = dataStore
const { editorData, stages, stagePipelines, selectionGroups } = storeToRefs(dataStore)

const { requestDependencies } = inject('injectGlobalState')

const detailStageId = computed(() => editorData.value.detailStageId)
const detailStage = computed(() => stages.value.get(detailStageId.value))
const detailComponent = computed(() => detailStage.value ? detailComponents[detailStage.value.type] : null)

const detailPipelineId = computed(() => detailStage.value?.pipeline)
const detailPipeline = computed(() => detailPipelineId.value ? stagePipelines.value.get(detailPipelineId.value) : null)

const selection = computed({
    get: () => detailPipeline.value ? selectionGroups.value.get(detailPipeline.value.selectionGroupId)?.sort() : null,
    set: (val) => selectionGroups.value.set(detailPipeline.value.selectionGroupId, val)
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
