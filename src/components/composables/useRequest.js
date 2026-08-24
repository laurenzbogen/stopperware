export function useRequest(endpoint) {
    const data = ref(null)
    const error = ref(null)


    const fetchData = () => {
        // reset state before fetching..
        data.value = null
        error.value = null

        fetch(`${import.meta.env.VITE_API_BASE_URL}${toValue(endpoint)}`)
            .then((res) => res.json())
            .then((json) => (data.value = json))
            .catch((err) => (error.value = err))
    }

    onMounted(fetchData)
    watch(() => toValue(endpoint), fetchData)

    return { data, error }
}
