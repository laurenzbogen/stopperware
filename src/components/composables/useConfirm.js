import { ref } from 'vue'

const isOpen = ref(false)
const message = ref('')
let resolvePromise = null

export function useConfirm() {
    function confirm(msg = 'Are you sure?') {
        message.value = msg
        isOpen.value = true
        return new Promise((resolve) => {
            resolvePromise = resolve
        })
    }

    function _accept() {
        isOpen.value = false
        resolvePromise?.(true)
    }

    function _cancel() {
        isOpen.value = false
        resolvePromise?.(false)
    }

    return { isOpen, message, confirm, _accept, _cancel }
}
