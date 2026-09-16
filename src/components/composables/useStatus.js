import { ref } from 'vue'

const STATUS_DURATION_MS = 5000

export const STATUS_TYPES = {
    info: 'info',
    success: 'success',
    warning: 'warning',
    error: 'error',
}

const message = ref('')
const type = ref(STATUS_TYPES.info)
const visible = ref(false)
let hideTimer = null

export function useStatus() {
    function setStatus(msg, statusType = STATUS_TYPES.info, duration = STATUS_DURATION_MS) {
        clearTimeout(hideTimer)

        message.value = msg
        type.value = STATUS_TYPES[statusType] ?? STATUS_TYPES.info
        visible.value = true

        hideTimer = setTimeout(() => {
            visible.value = false
        }, duration)
    }

    function clearStatus() {
        clearTimeout(hideTimer)
        visible.value = false
    }

    return { message, type, visible, setStatus, clearStatus }
}
