<template>
    <div
        :class="`fixed pointer-events-none left-0 top-0 w-screen h-screen ${isOverDropZone && enabled ? 'bg-info/30' : ''}`">
        <!--     <div v-show="!data.corpus" role="alert" -->
        <!--         class="absolute left-1/2 top-12 -translate-1/2 z-100 alert alert-warning alert-soft"> -->
        <!--         <span>No Corpus Selected, Drag and drop a Corpus Folder</span> -->
        <!--         <span v-show="loading" class="loading loading-spinner loading-sm"></span> -->
        <!--     </div> -->
    </div>
</template>

<script setup>
import { useDropZone } from '@vueuse/core'
import SuperJSON from 'superjson';
import { inject, ref } from 'vue';
import { useDataStore } from './composables/useDataStore';
import { useDependencyStore } from './composables/useDependencyStore';


const { initializeDataStore  } = useDataStore()
const { uploadCorpus } = useDependencyStore()


const loading = ref(false)
const { enabled } = defineProps(['enabled'])



async function onDrop(files) {
    if (!enabled) return
    if (files.length == 0) {
        return
    }

    if (isCsvFile(files[0])) {
        if (files.length !== 1) return
        handleCsvUpload(files[0])
        return
    }

    handleTxtUpload(files)
}

async function handleCsvUpload(file) {
    const formData = new FormData()
    formData.append("file", file)
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/uploadSavefile`, {
        method: "POST",
        body: formData,
        credentials: 'include'
    });
    const newData = await response.text()
    initializeDataStore(SuperJSON.parse(newData))

    await calculateDependencies()
}

async function handleTxtUpload(files) {
    loading.value = true
    await uploadCorpus(files)
    loading.value = false
}

const { isOverDropZone } = useDropZone(window.document, {
    onDrop,
    dataTypes: ['text/plain', 'text/csv', 'application/vnd.ms-excel', 'application/zip'],
    multiple: true,
    preventDefaultForUnhandled: false,
})

function isCsvFile(file) {
    return (
        file.type === 'text/csv' ||
        file.type === 'application/zip' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name?.toLowerCase().endsWith('.csv')
    )
}
</script>
