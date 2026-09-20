import { reactive, toRefs, watch, onMounted, nextTick } from 'vue'
import { useDataStore } from '@/components/composables/useDataStore'

// called once per component
// config - { fieldName: { default: any, history: boolean, live: boolean } }
export function useState(id, config) {
    const dataStore = useDataStore()
    const { updateStageState, getStageState } = dataStore

    const keys = Object.keys(config)
    const trackedKeys = keys.filter(k => config[k].history)
    const untrackedKeys = keys.filter(k => !config[k].history)
    const liveKeys = keys.filter(k => config[k].live)

    const state = reactive(
        Object.fromEntries(keys.map(k => [k, config[k].default ?? null]))
    )

    const pick = (ks, src = state) =>
        ks.reduce((acc, k) => ((acc[k] = src[k]), acc), {})


    const writeBack = (history) => (val) => {
        updateStageState(id, val, history)
    }

    if (trackedKeys.length) {
        watch(() => pick(trackedKeys), writeBack(true), { deep: true })
    }
    if (untrackedKeys.length) {
        watch(() => pick(untrackedKeys), writeBack(false), { deep: true })
    }

    function applyFromStore(ks = keys) {
        const saved = getStageState(id) ?? {}
        ks.forEach(k => { if (k in saved) state[k] = saved[k] })
    }

    if (liveKeys.length) {
        watch(
            () => pick(liveKeys, getStageState(id) ?? {}),
            () => applyFromStore(liveKeys),
            { deep: true }
        )
    }

    function hydrateStateFromDataStore() {
        return applyFromStore()
    }

    onMounted(hydrateStateFromDataStore)

    return { ...toRefs(state), hydrateStateFromDataStore }
}
