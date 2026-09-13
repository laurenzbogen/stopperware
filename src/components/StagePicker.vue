<template>
    <!-- Open the modal using ID.showModal() method -->
    <dialog ref="picker_modal" class="modal" @close="handleClose">
        <div class="modal-box">

            <div class="flex justify-between items-center w-full">
                <h3 class="text-lg font-bold">Add Pipeline Stage</h3>

                <form method="dialog">
                    <button class="btn btn-circle btn-sm">
                        <Cross />
                    </button>
                </form>
            </div>
            <input @input="inputChanged" ref="fuzzyInput" type="text" placeholder="Large"
                class="input input-lg my-8 w-full" />
            <ul class="">
                <div @click="() => emitSelectedStage(stage.item)" @pointerenter="() => handlePointerEnterStage(stage)"
                    v-for="(stage, i) in filteredStageTypes">
                    <li class="p-2 border border-base-300 flex justify-between items-center"
                        :class="stage === selected ? 'bg-base-200' : 'bg-none'">
                        <div>{{ stage.item }}</div>
                        <Enter v-if="stage === selected" />
                    </li>
                </div>
            </ul>

        </div>
    </dialog>

</template>

<script setup>
import { onMounted, ref, useTemplateRef } from 'vue';
import { stageTypeMap } from '@/stageTypeMap';
import Fuse from 'fuse.js'

const emit = defineEmits(['selected'])

const modal = useTemplateRef('picker_modal')
const fuzzyInput = useTemplateRef('fuzzyInput')

import Cross from '@/icons/Cross.vue';import Enter from '@/icons/Enter.vue';

const fuse = new Fuse(Object.keys(stageTypeMap))
const filteredStageTypes = ref(fuse.search(''))
const lastPipelineInfo = ref(null)
const selected = ref(filteredStageTypes.value[0].item)

defineExpose({
    open: (pipelineInfo) => handleOpen(pipelineInfo),
})


function inputChanged(e) {
    filteredStageTypes.value = fuse.search(e.target.value)
    selected.value = filteredStageTypes.value[0]
}

function handleOpen(pipelineInfo) {
    lastPipelineInfo.value = pipelineInfo
    fuzzyInput.value.value = ''
    filteredStageTypes.value = fuse.search('')
    selected.value = filteredStageTypes.value[0]
    modal.value.showModal()
    fuzzyInput.value.focus()
    document.addEventListener('keydown', handleKeyDown)
}

function handleClose() {
    document.removeEventListener('keydown', handleKeyDown)
}


function handleKeyDown(e) {
    switch (true) {
        case e.ctrlKey && e.key === 'n':
        case e.key === 'ArrowDown':
            {
                const currentlySelected = filteredStageTypes.value.findIndex(e => e.item == selected.value.item)
                if (currentlySelected == -1) {
                    selected.value = filteredStageTypes.value[0]
                    break
                }
                let nextSelected = (currentlySelected + 1) % filteredStageTypes.value.length
                selected.value = filteredStageTypes.value[nextSelected]
                e.preventDefault();
                break;
            }

        case e.ctrlKey && e.key === 'p':
        case e.key === 'ArrowUp':
            {
                const currentlySelected = filteredStageTypes.value.findIndex(e => e.item == selected.value.item)
                if (currentlySelected == -1) {
                    selected.value = filteredStageTypes.value[0]
                    break
                }
                const nextSelected = (currentlySelected + filteredStageTypes.value.length - 1) % filteredStageTypes.value.length
                selected.value = filteredStageTypes.value[nextSelected]
                e.preventDefault();
                break;
            }

        case e.key === 'Enter':
            modal.value.close()
            emitSelectedStage(selected.value.item)
            e.preventDefault();
            // Confirm selection
            break;
    }
}

function emitSelectedStage(type) {
    modal.value.close()

    emit('selected', type, lastPipelineInfo.value.pipelineID)
}


function handlePointerEnterStage(stage) {
    const currentlySelected = filteredStageTypes.value.findIndex(e => e.item == stage.item)
    if (currentlySelected == - 1) {
        return
    }
    selected.value = filteredStageTypes.value[currentlySelected]
}



</script>

<style scoped>
.modal,
.modal-box {
    transition: none !important;
    animation: none !important;
}
</style>
