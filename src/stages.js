// Registry of stage modules: their component, optional detail component,
// and the request dependencies they rely on. Add a new stage type here.

import DetailSimilarWords from "./components/stages/details/DetailSimilarWords.vue";

import EmbeddingScatter from "./components/stages/EmbeddingScatter.vue";
import ImportStopwords from "./components/stages/ImportStopwords.vue";
import SimilarWords from "./components/stages/SimilarWords.vue";
import WordCloud from './components/stages/WordCloud.vue';
import FuzzySearch from '@/components/stages/FuzzySearch.vue'
import TfidfScatter from "./components/stages/TfidfScatter.vue";

import { REQUEST_DEPENDENCIES as R_D } from './components/composables/requestDependencies';

export const stageTypeMap = {
    EmbeddingScatter,
    WordCloud,
    ImportStopwords,
    // FuzzySearch,
    SimilarWords,
    TfidfScatter,
}

export const detailComponents = {
    'EmbeddingScatter': null,
    'WordCloud': null,
    'FuzzySearch': null,
    'ImportStopwords': null,
    'TfidfScatter': null,
    'SimilarWords': DetailSimilarWords,
}

export const stageTypeDependencies = {
    'EmbeddingScatter': [R_D.embeddingScatter],
    'WordCloud': [R_D.wordcount],
    'FuzzySearch': [R_D.wordcount],
    'ImportStopwords': [R_D.wordcount],
    'SimilarWords': [R_D.embedding, R_D.embeddingScatter],
    'TfidfScatter': [R_D.wordcount, R_D.tfidfScatter],
}

export function dependenciesFor(type) {
    return stageTypeDependencies[type] ?? []
}
