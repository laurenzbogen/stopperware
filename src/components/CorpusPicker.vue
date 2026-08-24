<template>
    <div class="relative max-w-4xl grid place-items-center my-8 mx-auto">
        <div :style="`opacity: ${loading ? 0 : 1};`">
            <div v-bind="getRootProps()"
                class="min-h-48 w-full h-full grid place-items-center cursor-pointer striped-background"
                id="corpusUploadDropzone">
                <input v-bind="getInputProps()" />
                <p v-if="isDragActive">Drop the files here ...</p>
                <p v-else>Drag 'n' drop some files here, or click to select files</p>
            </div>

            <div class="w-full flex">
                <div class="flex-1">
                    <div class="flex justify-between" v-for="(f, i) in filesSelected">
                        <p>{{ f.name }}</p>
                        <button class="btn btn-outline btn-square btn-xs p-1" @click="() => removeFile(i)">
                            X
                        </button>
                    </div>

                </div>
                <button class="btn m-4 w-sm" @click="upload">Upload</button>
            </div>

        </div>
        <div v-if="loading" class="absolute left-1/2 top-1/2 -translate-1/2 loading loading-spinner">
            Done
        </div>
    </div>
</template>

<script setup>
import { useDropzone } from "vue3-dropzone";
import { onMounted, ref } from "vue";
import { getInitData } from "@/components/composables/useData";

const filesSelected = ref([])
const loading = ref(false)

const emit = defineEmits(["createdCorpus"])

function onDrop(acceptFiles, rejectReasons) {
    filesSelected.value = acceptFiles
}

function removeFile(index) {
    filesSelected.value.splice(index, 1)
}

async function upload() {
    const files = filesSelected.value
    if (files.length == 0) {
        return
    }

    const formData = new FormData();
    for (const file of files) {
        formData.append("files", file);
    }

    loading.value = true

    try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/uploadCorpus`, {
            method: "POST",
            body: formData,  // don't set Content-Type header — browser sets it automatically
        });
        const corpus = await response.json()
        let initData = getInitData();
        initData.corpus = corpus
        // setLocalData(initData)
        emit('createdCorpus', initData)
    } catch (e) {
        resetComponent()
        return
    }

}

function resetComponent() {
    loading.value = false

}

const { getRootProps, getInputProps, ...rest } = useDropzone({ onDrop });

</script>

<style>
.striped-background {
    background-image: repeating-linear-gradient(45deg,
            gray 0,
            gray 1px,
            transparent 0,
            transparent 50%);
    background-size: 20px 20px;
    background-attachment: fixed;
}
</style>
