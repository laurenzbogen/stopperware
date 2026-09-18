import { defineStore } from "pinia"
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import { fetchApiJson, apiStatusBadgeType, delay } from "@/helpers"
import Dependency from "./Dependency"
import { useStatus } from "./useStatus"
import { REQUEST_DEPENDENCIES } from "./requestDependencies"
import { dependenciesFor } from "@/stages"


export const useDependencyStore = defineStore('stopperwareDependencyData', () => {
    const requestDependencies = ref(Object.fromEntries(
        Object.keys(REQUEST_DEPENDENCIES).map(key => [key, new Dependency(key)])
    ))

    onMounted(async () => {
        try {
            const {session} = await fetchApiJson('session')
            if (session === "STALE_SESSION") {
                useStatus().setStatus('Session Files not available on server anymore, please reupload Corpus', 'warning')
            }
        } catch (err) {
            //TODO
            return
        }
        
        getStatus()
    })


    async function getStatus() {
        let statusResult
        try {
            statusResult = await fetchApiJson('status')
        } catch (err) {
            //TODO
            return
        }

        switch (statusResult.status) {
            case 'NO_SESSION_ID':
                setTimeout(() => {
                    useStatus().setStatus('Drop Corpus File on the Canvas to get started', 'success')
                }, 3500)
                break
            case 'SERVER_IDLE':
                ensureMainDependencies()
                break
            case 'JOB_ATTACHABLE':
                break
            case 'JOB_BLOCKING':
                useStatus().setStatus('Another session blocking the server, please try again later', 'error')
                break
        }
    }

    function ensureMainDependencies() {
        console.log('maindeps')
        const mainDeps = ['wordcount', 'embedding', 'embeddingScatter']
        fetchDependencies(mainDeps)
    }

    function ensureDependencies(type) {
        const deps = dependenciesFor(type)

        const syncReady = deps
            .filter(d => d.sync)
            .every(d => requestDependencies.value[d.name].requestStatus === 'AVAILABLE')

        if (!syncReady) return

        let fetchDeps =  deps.filter(d => !d.sync && requestDependencies.value[d.name].requestStatus === 'UNAVAILABLE').map(d => d.name)
        fetchDependencies(fetchDeps)
    }

    function allDependenciesReady(type) {
        return dependenciesFor(type).every(
            d => requestDependencies.value[d.name]?.requestStatus === 'AVAILABLE'
        )
    }

    function resetDeps() {
        Object.values(requestDependencies.value).forEach(d => d.reset())

    } 

    async function fetchDependencies(dep_names) {
        for (let d of dep_names) {
            try {
                await requestDependencies.value[d].tryFetch()
            } catch (e) {
                requestDependencies.value[d.name].requestStatus = 'ERRORED'
                useStatus().setStatus(e, 'error')
                break
            }
        }
    }


    function getMainDependencies() {
        return Object.values(REQUEST_DEPENDENCIES).filter(d => d.sync).map(d => requestDependencies.value[d.name])
    }

    async function getIsActiveSession() {
        let statusResult
        try {
            statusResult = await fetchApiJson('session')
        } catch (err) {
            useStatus().setStatus('Error Fetching Session status', 'error')
            return
        }
        return statusResult.session === "ACTIVE_SESSION"
    }


    async function uploadCorpus(files) {
        let statusResult
        try {
            statusResult = await fetchApiJson('status')
        } catch (err) {
            useStatus().setStatus('Error when fetching Server status before Corpus upload', 'error')
            return
        }

        switch (statusResult.status) {
            case 'SERVER_IDLE':
                break
            case 'NO_SESSION_ID':
                break
            case 'JOB_ATTACHABLE':
                useStatus().setStatus('Aborting running calculation of this session', 'warning')
                try {
                    await fetchApiJson('cancelCalculation')
                } catch (err) {
                    useStatus().setStatus('Error trying to cancel calculation', 'error')
                    return
                }
                break
            case 'JOB_BLOCKING':
                useStatus().setStatus('Another session blocking the server, please try again later', 'error')
                return
            default:
                throw new Error('Unexpected Status answer, while trying to acces server status for uploading new Corpus')
        }

        const formData = new FormData()
        for (const file of files) {
            formData.append("files", file)
        }

        let p
        try {
            p = await fetchApiJson('uploadCorpus', { method: 'POST', body: formData })
        } catch (err) {
            useStatus().setStatus('Unexpected Error when uploading Corpus: ' + err, 'error')
            return
        }

        resetDeps()
        ensureMainDependencies()
    }


    function getFilteredDependencyData(type, filterWordSet) {
        return dependenciesFor(type).filter(d => d.hasData).reduce((acc, d) => {
            const dep = requestDependencies.value[d.name]
            const data = dep.getData()
            acc[d.name] = d.filterData(data, filterWordSet)
            return acc
        }, {})

    }


    return { getMainDependencies, ensureDependencies, allDependenciesReady, getIsActiveSession, uploadCorpus, getFilteredDependencyData }
})

