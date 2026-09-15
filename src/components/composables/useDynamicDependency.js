import { ref, computed, watch } from 'vue'
import Dependency, { REQUEST_STATUS } from './Dependency'
import { useDependencyStore } from './useDependencyStore'

export default function useDynamicDependency(endpoint) {
    const { getDynamicDependency, setDynamicDependency } = useDependencyStore()

    const dependency = ref(new Dependency(endpoint.value))

    const data = computed(() =>
        dependency.value.requestStatus === REQUEST_STATUS.AVAILABLE
            ? dependency.value.data
            : null
    )

    async function hydrate(name) {
        if (name === '') return
        let dep = getDynamicDependency(name)
        if (!dep) {
            dep = new Dependency(name)
            setDynamicDependency(name, dep)   // name, not the ref
        }

        dependency.value = dep                // ref() proxies it -> mutations tracked
        await dependency.value.fetch()        // call through the proxy, so `this` is reactive
    }

    watch(endpoint, hydrate, { immediate: true })

    return {
        data,
        status: computed(() => dependency.value.requestStatus),
        progress: computed(() => dependency.value.progress),
        progressMessage: computed(() => dependency.value.progressMessage),
        errorMessage: computed(() => dependency.value.errorMessage),
    }
}
