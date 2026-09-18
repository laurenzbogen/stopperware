<template>
    <div v-for="d of display">
        <p class="flex justify-between items-center">
            <span>{{ d.name }}</span>
            <span>
                <span v-show="d.requestStatus === REQUEST_STATUS['UNAVAILABLE']" class="status status-neutral"></span>

                <span v-show="d.requestStatus === REQUEST_STATUS['INPROGRESS']" class="inline-grid *:[grid-area:1/1]">
                    <span class="status status-info animate-ping"></span>
                    <span class="status status-info"></span>
                </span>

                <span v-show="d.requestStatus === REQUEST_STATUS['AVAILABLE']" class="status status-success"></span>
                <span v-show="d.requestStatus === REQUEST_STATUS['ERRORED']" class="status status-error"></span>
            </span>
        </p>
        <progress v-show="d.requestStatus === REQUEST_STATUS['INPROGRESS']" class="progress progress-accent"
            :value="d.progress" max="1"></progress>
        <p class="text-[10px]" v-show="d.requestStatus === REQUEST_STATUS['INPROGRESS']">{{ d.progressMessage }}</p>
        <p class="text-[10px] text-error" v-show="d.requestStatus === REQUEST_STATUS['ERRORED']">{{ d.errorMessage }}</p>
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
