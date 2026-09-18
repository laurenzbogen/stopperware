<template>
    <Transition name="status-fade">
        <div v-if="visible" class="fixed top-4 left-1/2 -translate-x-1/2 z-200 pointer-events-none">
            <div :class="['badge badge-soft gap-2 py-3 shadow-md', badgeClass]">
                <span :class="['status', statusClass]"></span>
                {{ message }}
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useStatus } from './composables/useStatus'

const { message, type, visible } = useStatus()

const BADGE_CLASSES = {
    info: 'badge-info',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
}

const STATUS_CLASSES = {
    info: 'status-info',
    success: 'status-success',
    warning: 'status-warning',
    error: 'status-error',
}

const badgeClass = computed(() => BADGE_CLASSES[type.value] ?? BADGE_CLASSES.info)
const statusClass = computed(() => STATUS_CLASSES[type.value] ?? STATUS_CLASSES.info)
</script>

<style scoped>
.status-fade-enter-active,
.status-fade-leave-active {
    transition: opacity 0.2s ease;
}

.status-fade-enter-from,
.status-fade-leave-to {
    opacity: 0;
}
</style>
