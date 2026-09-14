import { defineStore } from "pinia"
import SuperJSON from 'superjson'
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import { fetchApiJson } from "@/helpers"

export const REQUEST_DEPENDENCIES = {
    session: 'session',
    wordcount: 'wordcount',
    embedding: 'embedding',
    embeddingScatter: 'embeddingScatter',
}

export const REQUEST_STATUS = {
    UNAVAILABLE: 'UNAVAILABLE',
    INPROGRESS: 'INPROGRESS',
    AVAILABLE: 'AVAILABLE',
    ERRORED: 'ERRORED',
}


export const useDependencyStore = defineStore('stopperwareDependencyData', () => {
    const requestDependencies = ref(Object.fromEntries(
        Object.keys(REQUEST_DEPENDENCIES).map(key => [key, init()])
    ))

    onMounted(async () => {
        if (Object.values(requestDependencies.value).every(v => v.status === REQUEST_STATUS['AVAILABLE'])) {
            return
        }

        const { sessionId, jobStatus } = await fetchApiJson('status')
        if (!sessionId) {
            //TODO
            return
        }
        if (jobStatus !== 'idle') {
            //TODO
            return
        }

        requestDependencies.value[REQUEST_DEPENDENCIES['session']].status = REQUEST_STATUS['AVAILABLE']
        await calculateDependencies()
    })


    async function calculateDependencies() {
        await fetchData(REQUEST_DEPENDENCIES['wordcount'])
        await fetchData(REQUEST_DEPENDENCIES['embedding'])
        await fetchData(REQUEST_DEPENDENCIES['embeddingScatter'])
    }


    async function fetchData(dependency) {
        requestDependencies.value[dependency].ready = false
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/${dependency}`, { credentials: 'include' })
        if (!res.ok) {
            handleStreamError(res, dependency)
            return
        }
        await followToResolution(res, dependency)
    }

    async function followToResolution(res, dependency) {
        requestDependencies.value[REQUEST_DEPENDENCIES[dependency]].status = REQUEST_STATUS['INPROGRESS']
        let p = await res.json()
        if (p.status === "STARTING" || p.status === "INPROGRESS") {
            if (p.progress) {
                requestDependencies.value[REQUEST_DEPENDENCIES[dependency]].progress = p.progress
            }
            if (p.progressMessage) {
                requestDependencies.value[REQUEST_DEPENDENCIES[dependency]].progressMessage = p.progressMessage
            }
            await delay(500)
            const nextRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/${dependency}`, { credentials: 'include' })
            if (!nextRes.ok) {
                handleStreamError(res, dependency)
                return
            }
            return followToResolution(nextRes, dependency)
        }

        if (p.status === "AVAILABLE") {
            const c = localStorage.getItem('stopwordsRequestData') ?? {}
            requestDependencies.value[REQUEST_DEPENDENCIES[dependency]].data = p.payload
            requestDependencies.value[REQUEST_DEPENDENCIES[dependency]].status = REQUEST_STATUS['AVAILABLE']
            localStorage.setItem('stopwordsRequestData', SuperJSON.stringify(
                toRaw(requestDependencies.value)
            ))
        }
    }


    async function cancelCalculation() {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/cancelCalculation`, {
            method: "POST",
            credentials: 'include'
        });
        const p = await res.json()
        console.log(p)
    }

    async function uploadCorpus(files) {
        await cancelCalculation()

        const formData = new FormData()
        for (const file of files) {
            formData.append("files", file)
        }

        requestDependencies.value[REQUEST_DEPENDENCIES['session']].status = REQUEST_STATUS['INPROGRESS']
        requestDependencies.value[REQUEST_DEPENDENCIES['session']].progress = 0.3
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/uploadCorpus`, {
            method: "POST",
            body: formData,
            credentials: 'include'
        });

        const p = await res.json()
        if (p.status === "AVAILABLE") {
            requestDependencies.value[REQUEST_DEPENDENCIES['session']].status = REQUEST_STATUS['AVAILABLE']
        }

        await calculateDependencies()
    }

    function getFilteredDependency(dependency, filterWords) {
        if (dependency === REQUEST_DEPENDENCIES['wordcount']) {
            return filterWordcount(requestDependencies.value[REQUEST_DEPENDENCIES['wordcount']].data, filterWords)
        }
        if (dependency === REQUEST_DEPENDENCIES['embeddingScatter']) {
            return filterEmbeddingScatter(requestDependencies.value[REQUEST_DEPENDENCIES['embeddingScatter']].data, filterWords)
        }

        throw new Error('Tried to filter unfilterable dependency')
    }


    async function handleStreamError(res, dependency) {
        requestDependencies.value[REQUEST_DEPENDENCIES[dependency]].status = REQUEST_STATUS['ERRORED']
        const json = await res.json()
        requestDependencies.value[REQUEST_DEPENDENCIES[dependency]].errorMessage = json.payload ?? ''


        //console.error('Stream error:', e)
        // console.error('erasing SessionId')
        // removeCookies('session_id')
    }



    return { requestDependencies, uploadCorpus, calculateDependencies, getFilteredDependency }

}, {
    persist: {
        storage: localStorage,
        pick: ['requestDependencies']
    }
})

const init = () => ({ status: REQUEST_STATUS['UNAVAILABLE'], progress: 0, progressMessage: '', errorMessage: '', data: null })



function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function filterWordcount(data, filterWordSet) {
    return data.filter(w => !filterWordSet.has(w.word))
}

function filterEmbeddingScatter(data, filterWordSet) {
    return {
        ...data,
        positions: data.positions.filter(w => !filterWordSet.has(w.word)).slice(0, 500)
    }
}
