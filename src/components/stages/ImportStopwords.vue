<template>
    <div class="relative h-[230px]">
        <div v-bind="getRootProps()"
            :class="`absolute top-0 left-0 bottom-0 right-0 ${isDragActive ? 'bg-secondary/20' : 'bg-none'} flex flex-col justify-between`">

            <div class="w-full flex flex-row justify-between">
                <div class="flex-1">
                    <div v-for="f in files">
                        <div>
                            <span :class="`mr-2 ${f[1].active ? null : 'opacity-50 line-through'}`"> {{ f[1].name }}
                            </span>
                            <!-- <span class="mr-2"> {{ f[1].active }} </span> -->
                            <button class="btn" @click="deleteFile(f[0])">-</button>
                            <button class="btn" @click="deleteFileWithWords(f[0])">tr</button>
                            <button class="btn" v-if="!f[1].active" @click="restoreFile(f[0])">r</button>
                        </div>
                    </div>


                </div>
                <textarea v-model="textareaValue" name="" id=""></textarea>

            </div>

            <div>
                <button class="btn">Select</button>
                <button class="btn">Stop</button>

            </div>


        </div>
    </div>
</template>

<script setup>
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useDropzone } from "vue3-dropzone";
import { v4 as uuidv4 } from "uuid";
import superjson from 'superjson';

const { updateStageState } = inject('injectGlobalState')
const props = defineProps(["id", "stage"])
const { id, stage } = props

// const stage = computed({
//     get: () => props.stage,
//     set: (val) => {props.stage = val}
// })

const files = ref(new Map())
const textareaValue = ref('')
const areaStopwords = computed(() => textareaValue.value.split('\n').filter(w => w !== ""))

const state = computed(() => ({
    files: files.value,
    areaStopwords: areaStopwords.value
}))
let lastPushedState = null

watch(
    () => props.stage.state,
    (newState) => {
        if (newState === undefined) return //todo placeholder
        //if (newState === lastPushedState) return

        const s = superjson.parse(newState)
        files.value = s.files
        areaStopwords.value = s.areaStopwords
        textareaValue.value = s.areaStopwords.join('\n')
    }, { immediate: true })


watch(
    () => [state.value.areaStopwords.length, state.value.files.size],
    ([newStopLen, newFilesSize], [oldStopLen, oldFilesSize]) => {
        if (newStopLen !== oldStopLen || newFilesSize !== oldFilesSize) {
            const serialized = superjson.stringify(state.value)
            lastPushedState = serialized
            updateStageState(id, serialized, true)
        }
    }
)

//watch(state, (val, oldVal) => {
//    console.log(val.files, oldVal.files)
//    if (
//        val.areaStopwords.length !== oldVal.areaStopwords.length
//        || val.files.size !== oldVal.files.size
//    ) {
//        console.log('persist')
//    }
//}, { deep: true })


watch(areaStopwords, (val) => {
    outer: for (let f of files.value) {
        const [key, value] = f
        for (const word of value.content) {
            if (!val.includes(word)) {
                value.active = false
                continue outer
            }
        }
        value.active = true
    }
}, { immediate: true })

function addNewContent(content) {
    let areaSet = new Set(textareaValue.value.split('\n').filter(w => w !== ""))
    for (const w of content.content) {
        if (w === "") continue
        areaSet.add(w)
    }

    textareaValue.value = [...areaSet.values()].join('\n')
}

function deleteFileWithWords(id) {
    const words = files.value.get(id).content
    let areaArray = textareaValue.value.split('\n')
    for (let w of words) {
        const index = areaArray.findIndex(aW => aW === w)
        if (index === -1) continue
        areaArray.splice(index, 1)
    }
    textareaValue.value = areaArray.join('\n')
    files.value.delete(id)
}

function deleteFile(id) {
    console.log(files.value.size)
    files.value.delete(id)
    console.log(files.value.size)
}

function restoreFile(id) {
    let areaSet = new Set(areaStopwords.value)
    const content = files.value.get(id)
    if (content === undefined) throw new Error('Couldnt find File to be restored')
    for (const w of content.content) {
        if (w === "") continue
        areaSet.add(w)
    }

    textareaValue.value = [...areaSet.values()].join('\n')
}

async function onDrop(acceptFiles, rejectReasons) {
    for (let f of acceptFiles) {
        const t = await f.text()
        const id = await hashString(t)
        const newContent = { content: t.trim().split('\n'), name: f.name, active: true }
        addNewContent(newContent)
        files.value.set(id, newContent)
    }
}
const { getRootProps, getInputProps, isDragAccept, isDragActive, ...rest } = useDropzone({ onDrop });


async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

</script>
