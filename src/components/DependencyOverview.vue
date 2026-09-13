<template>
    <div v-for="[key, d] of Object.entries(requestDependencies)">
        <p class="flex justify-between">
            <span>{{ key }}</span>
            <span>
                <X v-show="d.status === REQUEST_STATUS['UNAVAILABLE']" />
                <span v-show="d.status === REQUEST_STATUS['INPROGRESS']" class="loading loading-spinner loading-sm"></span>
                <Check v-show="d.status === REQUEST_STATUS['AVAILABLE']" />
                <X class="stroke-red-500" v-show="d.status === REQUEST_STATUS['ERRORED']" />
            </span>
        </p>
        <progress v-show="d.status === REQUEST_STATUS['INPROGRESS']" class="progress progress-accent" :value="d.progress" max="1"></progress>
        <p class="text-sm" v-show="d.status === REQUEST_STATUS['INPROGRESS']" >{{d.progressMessage}}</p>
        <p class="text-sm" v-show="d.status === REQUEST_STATUS['ERRORED']" >{{d.errorMessage}}</p>

    </div>

</template>

<script setup>
import { Check, LoaderCircle, X } from '@lucide/vue';
import { inject } from 'vue';
import { REQUEST_STATUS } from './composables/useRequestData';

const { requestDependencies } = inject('injectGlobalState')
</script>
