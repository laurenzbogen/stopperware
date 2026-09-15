import DetailSimilarWords from "./components/stages/details/DetailSimilarWords.vue";

import EmbeddingScatter from "./components/stages/EmbeddingScatter.vue";
import ImportStopwords from "./components/stages/ImportStopwords.vue";
import SimilarWords from "./components/stages/SimilarWords.vue";
import WordCloud from './components/stages/WordCloud.vue';
import FuzzySearch from '@/components/stages/FuzzySearch.vue'
import TfidfScatter from "./components/stages/TfidfScatter.vue";

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


