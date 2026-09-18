import { defineStore } from "pinia"
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import { fetchApiJson, apiStatusBadgeType, ApiError, delay } from "@/helpers"
import Dependency from "./Dependency"
import { useStatus } from "./useStatus"

const defaultFilterFunction = (data, filterWordSet) => {
    return data.filter(w => !filterWordSet.has(w.word))
}

export const REQUEST_DEPENDENCIES = {
    session: { name: 'session', sync: true, hasData: false },
    wordcount: { name: 'wordcount', sync: true, hasData: true, filterData: defaultFilterFunction },
    embedding: { name: 'embedding', sync: true, hasData: false },
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

function dependenciesFor(type) {
    return stageTypeDependencies[type] ?? []
}

export const useDependencyStore = defineStore('stopperwareDependencyData', () => {
    const requestDependencies = ref(Object.fromEntries(
        Object.keys(REQUEST_DEPENDENCIES).map(key => [key, new Dependency(key)])
    ))

    async function uploadCorpus(files) {
        const formData = new FormData()
        for (const file of files) {
            formData.append("files", file)
        }
        Array.from(Object.values(requestDependencies.value)).forEach(d => d.reset())

        requestDependencies.value['session'].requestStatus = REQUEST_STATUS['INPROGRESS']
        requestDependencies.value['session'].progress = 0.3

        let p
        try {
            p = await fetchApiJson('uploadCorpus', { method: 'POST', body: formData })
        } catch (err) {
            requestDependencies.value['session'].requestStatus = REQUEST_STATUS['ERRORED']
            requestDependencies.value['session'].errorMessage = err.detail ?? err.message ?? String(err)
            const badgeType = err instanceof ApiError ? apiStatusBadgeType(err.status) : 'error'
            useStatus().setStatus(requestDependencies.value['session'].errorMessage, badgeType)
            return
        }

        if (p.status === "AVAILABLE") {
            requestDependencies.value['session'].requestStatus = REQUEST_STATUS['AVAILABLE']
        }

        await getDependencies()
    }

    function isActiveSession() {
        return requestDependencies.value['session'].requestStatus === 'AVAILABLE'
    }


    async function getDependencies() {
        await requestDependencies.value['wordcount'].tryFetch()
        await requestDependencies.value['embedding'].tryFetch()
        await requestDependencies.value['embeddingScatter'].tryFetch()
    }

    onMounted(async () => {
        if (Object.values(requestDependencies.value).every(v => v.requestStatus === REQUEST_STATUS['AVAILABLE'])) {
            return
        }


        let statusResult
        try {
            statusResult = await fetchApiJson('status')
        } catch (err) {
            const badgeType = err instanceof ApiError ? apiStatusBadgeType(err.status) : 'error'
            useStatus().setStatus(err.detail ?? err.message ?? String(err), badgeType)
            return
        }



        const { sessionId, jobStatus } = statusResult ?? {}
        if (!sessionId) {
            console.log('no session attached')
            //TODO
            return
        }

        if (jobStatus === 'blocked') {
            useStatus().setStatus('Another session is currently using the server. Try again later.', 'warning')
            return
        }

        requestDependencies.value['session'].requestStatus = REQUEST_STATUS['AVAILABLE']

        if (jobStatus === 'idle' || jobStatus === 'running') {
            await getDependencies()
        }
    })







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
                dep.tryFetch()
            }
        }
    }

    async function cancelCalculation() {
        try {
            await fetchApiJson('cancelCalculation', { method: 'POST' })
        } catch (err) {
            // No session yet (fresh browser, nothing to cancel) - not an error worth surfacing.
            if (err instanceof ApiError && err.status === 400) {
                return
            }
            const badgeType = err instanceof ApiError ? apiStatusBadgeType(err.status) : 'error'
            useStatus().setStatus(err.detail ?? err.message ?? String(err), badgeType)
        }
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
        isActiveSession,


        requestDependencies,
        getMainDependencies,
        uploadCorpus,
        calculateDependencies: getDependencies,
        getFilteredDependencyData,
        allDependenciesReady,
        ensureDependencies,
        getDynamicDependency,
        setDynamicDependency,
    }

})



export const REQUEST_STATUS = {
    UNAVAILABLE: 'UNAVAILABLE',
    INPROGRESS: 'INPROGRESS',
    AVAILABLE: 'AVAILABLE',
    ERRORED: 'ERRORED',
}
