<template>
    <div v-show="menuOptions.show" ref="container" class="z-200 fixed left-0 top-0" :style="{
        translate: `${menuOptions.x}px ${menuOptions.y}px`
    }">
        <ul class="menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
            <li>{{ menuOptions.selection.length == 1 ? menuOptions.selection[0] : `${menuOptions.selection.length} items
                selected` }}</li>
            <!-- <li @click="optionClicked('similar')"><a>show similar</a></li> -->
            <!-- <li @click="optionClicked('exclude')"><a>exclude</a></li> -->
            <li><a @click="optionClicked('addStop')">Stopwords Add</a></li>
            <li><a @click="optionClicked('removeStop')">Stopwords Remove</a></li>

            <li>
                <span @click="() => menuFindSimilarWords(menuOptions.selection[0][0])">Find Similar Words</span>
            </li>

            <!-- <li><a @click="optionClicked('addSelection')">Selection Add</a></li> -->
            <!-- <li><a @click="optionClicked('removeSelection')">Selection Remove</a></li> -->
            <!-- <li><a @click="optionClicked('replaceSelection')">Selection Replace</a></li> -->


            <!-- <li> -->
            <!--     <div class="card card-compact p-2 w-full gap-2 block"> -->
            <!--         <span class="text-xs font-bold opacity-70">Selection</span> -->
            <!--         <span class="flex flex-row gap-1 w-full"> -->
            <!--             <button class="btn btn-xs flex-1" @click="handleAction('add')"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy-plus-icon lucide-copy-plus"><line x1="15" x2="15" y1="12" y2="18"/><line x1="12" x2="18" y1="15" y2="15"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button> -->
            <!--             <button class="btn btn-xs flex-1" @click="handleAction('subtract')"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy-minus-icon lucide-copy-minus"><line x1="12" x2="18" y1="15" y2="15"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button> -->
            <!--             <button class="btn btn-xs flex-1" @click="handleAction('replace')"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy-slash-icon lucide-copy-slash"><line x1="12" x2="18" y1="18" y2="12"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button> -->
            <!--         </span> -->
            <!--     </div> -->
            <!-- </li> -->
        </ul>

    </div>

</template>
<script setup>
import { computed, inject, onMounted, useTemplateRef, watchEffect } from 'vue';
import { useDataStore } from './composables/useDataStore';


const { menuOptions } = defineProps(["menuOptions"])
//const { data, setOperationStopwords, addStage } = inject('injectGlobalState')

const dataStore = useDataStore()
const { addPipeline, addStage, setOperationStopwords } = dataStore

const emit = defineEmits(["selected"])

function menuFindSimilarWords(word) {
    const pipelineId = addPipeline()
    addStage('SimilarWords', pipelineId, { similarKey: word })
}


const menuSelection = computed(() => menuOptions.selection)

function optionClicked(option) {
    switch (option) {
        case "addStop":
            setOperationStopwords(new Set(...menuSelection.value), 'union')
            break;

        case "removeStop":
            // code block
            setOperationStopwords(new Set(...menuSelection.value), 'difference')
            break;
        case "addSelection":
            //changeSelection(menuOptions.selection, option)
            break;
        case "removeSelection":
            //changeSelection(menuOptions.selection, option)
            break;
        case "replaceSelection":
            //changeSelection(menuOptions.selection, option)
            break;
        case "exclude":
            //changeStageFilter(0, [{ word: menuOptions?.word, action: "ADD" }])
            break;
        default:
        // code block
    }
}

//function setStyle(options) {
//    const { x, y, word } = options
//    if (zoompinchRef.value === null) return
//    const [normX, normY] = zoompinchRef.value.normalizeClientCoords(x, y)
//
//
//    if (container.value) {
//        container.value.style.transform = `translate(${normX}px, ${normY}px)`
//    }
//}
//
//watchEffect(() => setStyle(menuOptions))

window.addEventListener("click", () => menuOptions.show = false)

</script>
