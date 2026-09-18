<template>
    <div
        :class="`fixed pointer-events-none left-0 top-0 w-screen h-screen ${isOverDropZone && enabled ? 'bg-info/30' : ''}`">
    </div>
</template>

<script setup>
import { useDropZone } from '@vueuse/core'
import SuperJSON from 'superjson';
import { inject, ref } from 'vue';
import { useDataStore } from './composables/useDataStore';
import { useDependencyStore } from './composables/useDependencyStore';
import { useStatus } from './composables/useStatus';
import { useConfirm } from './composables/useConfirm';


const { initializeDataStore } = useDataStore()
const { uploadCorpus, getIsActiveSession } = useDependencyStore()
const { setStatus } = useStatus()


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

    if (!response.ok) {
        const body = await response.json().catch(() => null)
        const detail = body?.detail ?? `Upload failed with status ${response.status}`
        return
    }

    const newData = await response.text()
    initializeDataStore(SuperJSON.parse(newData))

    await calculateDependencies()
}

async function handleTxtUpload(files) {
    if (! await getIsActiveSession())
        return await uploadCorpus(files)

    const { confirm } = useConfirm()
    const ok = await confirm('This will replace the currently loaded session are you sure?')
    if (ok) {
        await uploadCorpus(files)
    }
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
