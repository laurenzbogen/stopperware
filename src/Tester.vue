<template>
    {{ test }}
    <button @click="reroll()">aaa</button>
</template>
<script setup>
import { useDataStore } from './components/composables/useDataStore';

const { test, reroll } = useDataStore()
</script>
