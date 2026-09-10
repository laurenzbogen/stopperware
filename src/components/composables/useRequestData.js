import { useCookies } from '@vueuse/integrations/useCookies'
import SuperJSON from 'superjson'
import { computed, createSlots, nextTick, ref, toRaw, watch } from 'vue'

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
}

export default function useRequestData() {
    const cached = localStorage.getItem('stopwordsRequestData') ? SuperJSON.parse(localStorage.getItem('stopwordsRequestData')) : {}
    const { get: getCookies, set: setCookies, remove: removeCookies } = useCookies(['session_id'])
    const session_id = computed(() => getCookies('session_id'))

    const requestDependencies = ref(Object.fromEntries(
        Object.keys(REQUEST_DEPENDENCIES).map(key => [key, cached[key] ?? {  status: REQUEST_STATUS['UNAVAILABLE'], progress: 0, progressMessage: '', data: null }])
    ))

    watch(() => requestDependencies.value['session']?.data, (newVal, oldVal) => {
        if (!newVal) return
        setCookies('session_id', newVal)
    }, { immediate: true })

    watch(session_id, async (id) => {
        if (id) requestDependencies.value[REQUEST_DEPENDENCIES['session']].status = REQUEST_STATUS['AVAILABLE']
        else requestDependencies.value[REQUEST_DEPENDENCIES['session']].status = REQUEST_STATUS['UNAVAILABLE']
    }, { immediate: true })

    async function calculateDependencies() {
        await fetchData(REQUEST_DEPENDENCIES['wordcount'])
        await fetchData(REQUEST_DEPENDENCIES['embedding'])
        await fetchData(REQUEST_DEPENDENCIES['embeddingScatter'])
    }

    async function fetchData(dependency) {
        requestDependencies.value[dependency].ready = false
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/${dependency}`, { credentials: 'include' })
        if (!res.ok) {
            handleStreamError(res)
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
        if (!res.ok) {
            handleStreamError(res)
            return
        }
        const p = await res.json()
        setCookies('session_id', p.payload)
        if (p.status === "AVAILABLE") {
            requestDependencies.value[REQUEST_DEPENDENCIES['session']].status = REQUEST_STATUS['AVAILABLE']
        }

        await calculateDependencies()
    }


    function handleStreamError(e) {
        //console.error('Stream error:', e)
        // console.error('erasing SessionId')
        // removeCookies('session_id')
    }

    return { requestDependencies, uploadCorpus, calculateDependencies }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
