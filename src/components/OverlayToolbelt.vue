<template>
    <div class="w-40 bg-base-100/80 p-2 rounded-sm border-1 border-neutral flex flex-row justify-around">
        <button class="tooltip" :data-tip="b.tooltip" v-for="b in buttons"
            :class="`${toolbeltButtonIsActive(b.name) ? 'bg-base-300' : 'hover:bg-base-200'} rounded-sm p-1`">
            <component :is="b.icon" @click="editorData.mainToolSelected = b.name"
                class="w-6 h-6 relative z-50 cursor-pointer tooltip" />
        </button>

    </div>

</template>

<script setup>
import { EDITMODES } from '@/helpers';
import { inject, onMounted } from 'vue';
import { useDataStore } from '@/components/composables/useDataStore';
import { useKeyStore } from '@/components/composables/useKeyStore';
import { storeToRefs } from 'pinia';

const { keybinds } = storeToRefs(useKeyStore())

onMounted(() => {
    keybinds.value.push(['V', () => editorData.value.mainToolSelected = EDITMODES['Select'].name])
    keybinds.value.push(['M', () => editorData.value.mainToolSelected = EDITMODES['Move'].name])
    keybinds.value.push(['L', () => editorData.value.mainToolSelected = EDITMODES['LassoPlus'].name])
})

const dataStore = useDataStore()
const { } = dataStore
const { editorData } = storeToRefs(dataStore)

const buttons = [
    EDITMODES['Select'], EDITMODES['Move'], EDITMODES['LassoPlus'], 
    //EDITMODES['LassoMinus'], EDITMODES['Placeholder'], EDITMODES['Placeholder']
]

function toolbeltButtonIsActive(name) {
    return name === editorData.value.mainToolSelected
}

</script>
