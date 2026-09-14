import { reactive, toRefs, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDataStore } from '@/components/composables/useDataStore';

// called once per component
// config - { fieldName: { default: any, history: boolean } }
export function useState(id, config) {
    const dataStore = useDataStore()
    const { updateStageState, getStageState } = dataStore
    const { stagesStateHistory } = storeToRefs(dataStore)

    const trackedKeys = Object.keys(config).filter(k => config[k].history)
    const untrackedKeys = Object.keys(config).filter(k => !config[k].history)

    const state = reactive(
        Object.fromEntries(Object.entries(config).map(([k, c]) => [k, c.default ?? null]))
    )

    const pick = (keys) => keys.reduce((acc, k) => ((acc[k] = state[k]), acc), {})

    if (trackedKeys.length) {
        watch(() => pick(trackedKeys), (val) => updateStageState(id, val, true), { deep: true })
    }
    if (untrackedKeys.length) {
        watch(() => pick(untrackedKeys), (val) => updateStageState(id, val, false), { deep: true })
    }

    function hydrateStateFromDataStore() {
        const saved = getStageState(id)
        Object.keys(config).forEach((key) => {
            if (key in saved) state[key] = saved[key]
        })
    }

    onMounted(hydrateStateFromDataStore)

    return { ...toRefs(state), hydrateStateFromDataStore }
}
