<template>
    <div class="w-72 bg-base-100/80 p-2 rounded-sm border-1 border-neutral flex flex-row justify-around">
        <button v-for="b in buttons"
            :class="`${toolbeltButtonIsActive(b.name) ? 'bg-base-300' : 'hover:bg-base-200'} rounded-sm p-1`">
            <component :is="b.icon" @click="data.editorData.mainToolSelected = b.name"
                class="w-6 h-6 relative z-50 cursor-pointer" />
        </button>

    </div>

</template>

<script setup>
import Placeholder from '@/icons/Placeholder.vue';
import { EDITMODES } from '@/helpers';
import { inject } from 'vue';
const { data } = inject('injectGlobalState')
const { editorData: { mainToolSelected } } = data.value

const buttons = [
    EDITMODES['Move'], EDITMODES['Lasso'], EDITMODES['Placeholder'], EDITMODES['Placeholder'], EDITMODES['Placeholder'], EDITMODES['Placeholder']
]

function toolbeltButtonIsActive(name) {
    return name === data.value.editorData.mainToolSelected
}

</script>
