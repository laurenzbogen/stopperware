<template>
    <div v-for="d of display">
        <p class="flex justify-between">
            <span>{{ d.name }}</span>
            <span>
                <X v-show="d.requestStatus === REQUEST_STATUS['UNAVAILABLE']" />
                <span v-show="d.requestStatus === REQUEST_STATUS['INPROGRESS']"
                    class="loading loading-spinner loading-sm"></span>
                <Check v-show="d.requestStatus === REQUEST_STATUS['AVAILABLE']" />
                <X class="stroke-red-500" v-show="d.requestStatus === REQUEST_STATUS['ERRORED']" />
            </span>
        </p>
        <progress v-show="d.requestStatus === REQUEST_STATUS['INPROGRESS']" class="progress progress-accent"
            :value="d.progress" max="1"></progress>
        <p class="text-sm" v-show="d.requestStatus === REQUEST_STATUS['INPROGRESS']">{{ d.progressMessage }}</p>
        <p class="text-sm" v-show="d.requestStatus === REQUEST_STATUS['ERRORED']">{{ d.errorMessage }}</p>

    </div>

</template>

<script setup>
import { Check, LoaderCircle, X } from '@lucide/vue';
import { inject } from 'vue';

import { useDependencyStore } from './composables/useDependencyStore';
import { storeToRefs } from 'pinia';
import { REQUEST_STATUS } from './composables/Dependency';

const { getMainDependencies } = useDependencyStore()

const display = getMainDependencies()

</script>
