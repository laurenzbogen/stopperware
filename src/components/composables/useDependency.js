import { fetchApiJson } from "@/helpers"

export const REQUEST_STATUS = {
    UNAVAILABLE: 'UNAVAILABLE',
    INPROGRESS: 'INPROGRESS',
    AVAILABLE: 'AVAILABLE',
    ERRORED: 'ERRORED',
}

export default function useDependency(name, essential) {
    const status = ref(REQUEST_STATUS[UNAVAILABLE])
    const progress = ref(0)
    const progressMessage = ref('')
    const errorMessage = ref('')
    const data = ref('')

    function fetchSelf() {
        fetchApiJson(name)
    }

}
