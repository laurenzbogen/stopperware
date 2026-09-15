<template>
    <dialog id="confirm_modal" class="modal modal-open">
        <div class="modal-box">
            <h3 class="text-lg font-bold">Confirm Action</h3>
            <p class="py-4 text-base-content/70">
                {{ message }}
            </p>
            <div class="modal-action">
                <button @click.stop="_cancel" class="btn btn-ghost">Cancel</button>
                <button @click.stop="_accept" class="btn btn-warning">Confirm</button>
            </div>
        </div>
        <div class="modal-backdrop bg-black/40"></div>
    </dialog>
</template>

<script setup>

import { useConfirm } from '@/components/composables/useConfirm'
import { onMounted } from 'vue';

const { isOpen, message, _accept, _cancel } = useConfirm()

onMounted(() => {
    document.addEventListener('click', () => { console.log('unmount') })
})

</script>
