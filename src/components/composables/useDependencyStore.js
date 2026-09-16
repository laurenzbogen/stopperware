import { defineStore } from "pinia"
import SuperJSON from 'superjson'
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import { fetchApiJson } from "@/helpers"
import Dependency from "./Dependency"

const filterScatter = (data, filterWordSet) => {
    return {
        ...data,
        positions: data.positions.filter(w => !filterWordSet.has(w.word)).slice(0, 500)
    }
}

const defaultFilterFunction = (data, filterWordSet) => {
    return data.filter(w => !filterWordSet.has(w.word))
}

export const REQUEST_DEPENDENCIES = {
    session: { name: 'session', sync: true, hasData: false },
    wordcount: { name: 'wordcount', sync: true, hasData: true, filterData: defaultFilterFunction },
    embedding: { name: 'embedding', sync: true },
    embeddingScatter: { name: 'embeddingScatter', sync: true, hasData: true, filterData: defaultFilterFunction },
    tfidf: { name: 'tfidf', sync: false, hasData: true, filterData: defaultFilterFunction },
}

const R_D = REQUEST_DEPENDENCIES
export const stageTypeDependencies = {
    'EmbeddingScatter': [R_D.embeddingScatter],
    'WordCloud': [R_D.session, R_D.wordcount],
    'FuzzySearch': [R_D.session, R_D.wordcount],
    'ImportStopwords': [R_D.session, R_D.wordcount],
    'SimilarWords': [R_D.embedding],
    'TfidfScatter': [R_D.wordcount, R_D.tfidf],
}

export const REQUEST_STATUS = {
    UNAVAILABLE: 'UNAVAILABLE',
    INPROGRESS: 'INPROGRESS',
    AVAILABLE: 'AVAILABLE',
    ERRORED: 'ERRORED',
}

function dependenciesFor(type) {
    return stageTypeDependencies[type] ?? []
}



export const useDependencyStore = defineStore('stopperwareDependencyData', () => {
    const requestDependencies = ref(Object.fromEntries(
        Object.keys(REQUEST_DEPENDENCIES).map(key => [key, new Dependency(key)])
    ))
    onMounted(async () => {
        if (Object.values(requestDependencies.value).every(v => v.requestStatus === REQUEST_STATUS['AVAILABLE'])) {
            return
        }
        const { sessionId, jobStatus } = await fetchApiJson('status')
        if (!sessionId) {
            console.log('no session attached')
            //TODO
            return
        }

        if (jobStatus === 'blocked') {
            console.log('different session is blocking the server. try again later')
            return
        }

        requestDependencies.value['session'].requestStatus = REQUEST_STATUS['AVAILABLE']

        if (jobStatus === 'idle' || jobStatus === 'running') {
            await calculateDependencies()
        }
    })

    async function calculateDependencies() {
        await requestDependencies.value['wordcount'].fetch()
        await requestDependencies.value['embedding'].fetch()
        await requestDependencies.value['embeddingScatter'].fetch()
    }

    function allDependenciesReady(type) {
        return dependenciesFor(type).every(
            d => requestDependencies.value[d.name]?.requestStatus === REQUEST_STATUS.AVAILABLE
        )
    }

    function getFilteredDependencyData(type, filterWordSet) {
        return dependenciesFor(type).filter(d => d.hasData).reduce((acc, d) => {
            const dep = requestDependencies.value[d.name]
            const data = dep.getData()
            acc[d.name] = d.filterData(data, filterWordSet)
            return acc
        }, {})
    }

    function ensureDependencies(type) {
        const deps = dependenciesFor(type)

        const syncReady = deps
            .filter(d => d.sync)
            .every(d => requestDependencies.value[d.name].requestStatus === REQUEST_STATUS.AVAILABLE)

        if (!syncReady) return

        for (const d of deps) {
            if (d.sync) continue
            const dep = requestDependencies.value[d.name]
            if (dep.requestStatus === REQUEST_STATUS.UNAVAILABLE) {
                dep.fetch() // fire and forget; flips to INPROGRESS synchronously
            }
        }
    }

    async function cancelCalculation() {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/cancelCalculation`, {
            method: "POST",
            credentials: 'include'
        });
        const p = await res.json()
    }

    async function uploadCorpus(files) {
        await cancelCalculation()

        const formData = new FormData()
        for (const file of files) {
            formData.append("files", file)
        }

        Array.from(Object.values(requestDependencies.value)).forEach(d => d.reset())

        requestDependencies.value['session'].requestStatus = REQUEST_STATUS['INPROGRESS']
        requestDependencies.value['session'].progress = 0.3
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/uploadCorpus`, {
            method: "POST",
            body: formData,
            credentials: 'include'
        });

        const p = await res.json()
        if (p.status === "AVAILABLE") {
            requestDependencies.value['session'].requestStatus = REQUEST_STATUS['AVAILABLE']
        }

        await calculateDependencies()
    }

    function getDynamicDependency(endpoint) {
        return requestDependencies.value[endpoint]

    }

    function setDynamicDependency(endpoint, value) {
        requestDependencies.value[endpoint] = value
    }

    function getMainDependencies() {
        return Object.values(REQUEST_DEPENDENCIES).filter(d => d.sync).map(d => requestDependencies.value[d.name])
    }

    return {
        requestDependencies,
        getMainDependencies,
        uploadCorpus,
        calculateDependencies,
        getFilteredDependencyData,
        allDependenciesReady,
        ensureDependencies,
        getDynamicDependency,
        setDynamicDependency,
    }

})

