import { ref, computed, watch } from 'vue'
import { useFetch } from '@vueuse/core'

export default function useDynamicDependency(endpoint) {
    const url = computed(() => `${import.meta.env.VITE_API_BASE_URL}/dynamic/${endpoint.value}`)
    const { execute, isFetching, error, data } = useFetch(
        url,
        { credentials: 'include' },
        { immediate: false },
    ).json()

    watch(endpoint, (endpointVal) => {
        if (endpointVal.length > 0) execute()
    }, { immediate: true })

    return { data, isFetching }
}
