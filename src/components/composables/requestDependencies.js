// Declarations of the request-backed dependencies stages can rely on.
// See `stages.js` for which stage type needs which of these.

export const filterFunctions = {
    excludeFilteredWords: (data, filterWordSet) => data.filter(w => !filterWordSet.has(w.word)),
}

export const REQUEST_DEPENDENCIES = {
    wordcount: { name: 'wordcount', sync: true, hasData: true, filterData: filterFunctions.excludeFilteredWords },
    embedding: { name: 'embedding', sync: true, hasData: false },
    embeddingScatter: { name: 'embeddingScatter', sync: true, hasData: true, filterData: filterFunctions.excludeFilteredWords },
    tfidfScatter: { name: 'tfidfScatter', sync: false, hasData: true, filterData: filterFunctions.excludeFilteredWords },
}
