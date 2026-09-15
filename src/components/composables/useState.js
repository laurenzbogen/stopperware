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

    // true while we copy store -> state, so the outgoing watchers
    // don't write the same value back (and push a bogus history entry)
   // let applying = false

    const writeBack = (history) => (val) => {
        //if (applying) return
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
        //applying = true
        ks.forEach(k => { if (k in saved) state[k] = saved[k] })
        // watchers flush on 'pre', so release the guard after they've run
        //return nextTick(() => { applying = false })
    }

    // keep live fields in sync with the store for the component's lifetime
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
