import { computed, ref, toValue, watch, watchEffect } from "vue"
import { getInitializedPipeline } from "../../helpers";
import { useRefHistory } from '@vueuse/core'
import SuperJSON from "superjson";

// {
//     corpus?: {
//          hash: string,
//          embedding {minX, maxX, minY, maxY (depr?), 
//                  embedding: [{word, count, x, y}] }
//          word_count: [ {word, count }]
//     },
//     stopwords: new Set(),
//     stagePipelines: [ {
//          id, selection, stages
//     }],
// }

export function useLocalData() {
    const string = localStorage.getItem('stopwordsLocalData')
    const data = !string ? ref(null) : ref(SuperJSON.parse(string))
    const wordcount = computed(() => data.value["corpus"]["word_count"])

    const undoData = computed({
        get: () => ({
            stopwords: data.value.stopwords,
            // filter out no history updates
            stagePipelines: data.value.stagePipelines.map(({ stateNoUndo, ...rest }) => rest),
        }),
        set: (val) => {
            data.value.stopwords = val.stopwords
            //update everything with history
            data.value.stagePipelines = data.value.stagePipelines.map((existing, i) => {
                const { stateNoUndo, ...rest } = val.stagePipelines[i]
                return { ...existing, ...rest }
            })
        }
    })

    const refHistory = useRefHistory(undoData, { deep: true, dump: SuperJSON.stringify, parse: SuperJSON.parse })
    const { history, undo, redo } = refHistory

    function findStage(id) {
        const pipelineIndex = data.value.stagePipelines.findIndex(p => p.stages.some(s => s.id === id))
        const stageIndex = data.value.stagePipelines[pipelineIndex].stages.findIndex(s => s.id === id)

        return [pipelineIndex, stageIndex]
    }

    function updateStageState(id, state, withHistory) {
        const [pIndex, sIndex] = findStage(id)
        if (withHistory) {
            data.value.stagePipelines[pIndex].stages[sIndex].state = state
        } else {
            data.value.stagePipelines[pIndex].stages[sIndex].stateNoUndo = state
        }
    }

    function get_filtered_wc(filter) {
        return wordcount.value
            .slice(0, 200 + filter.length)
            .filter(e => !filter.includes(e.word))
            .slice(0, 200)
    }


    function get_embedding() {
        return data.value["corpus"]["embedding"]
    }

    watch(data, () => {
        const dataObject = data.value
        localStorage.setItem('stopwordsLocalData', SuperJSON.stringify(dataObject))
    }, { deep: true })


    function storePipeline(pipeline, index) {
        data.value.stagePipelines[index] = pipeline
    }

    return { data, updateStageState, refHistory, storePipeline, getters: { get_filtered_wc, get_embedding } }
}

export function getInitData() {
    return {
        corpus: null,
        stopwords: new Set(),
        // include invisible pipelines
        stagePipelines: [getInitializedPipeline(), getInitializedPipeline(), getInitializedPipeline()],
    }
}


