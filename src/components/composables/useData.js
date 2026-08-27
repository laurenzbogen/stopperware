import { computed, createSlots, ref, toValue, watch, watchEffect } from "vue"
import { EDITMODES, getInitializedPipeline, getInitializedStage } from "../../helpers";
import { useRefHistory } from '@vueuse/core'
import SuperJSON from "superjson";
import { v4 as uuidv4 } from "uuid";

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

export function useData() {
    const string = localStorage.getItem('stopwordsLocalData')
    const parsed = !string ? null : SuperJSON.parse(string)

    const corpus = !parsed ? ref(null) : ref(parsed.corpus)
    const stagePipelines = !parsed ? ref(null) : ref(parsed.stagePipelines)
    const stages = !parsed ? ref(null) : ref(parsed.stages)
    const stagesStateHistory = !parsed ? ref(null) : ref(parsed.stagesStateHistory)
    const stagesStateNoHistory = !parsed ? ref(null) : ref(parsed.stagesStateNoHistory)
    const stopwords = !parsed ? ref(null) : ref(parsed.stopwords)
    const editorData = !parsed ? ref(null) : ref(parsed.editorData)

    const data = computed({
        get: () => ({
            corpus: corpus.value,
            stagePipelines: stagePipelines.value,
            stages: stages.value,
            stagesStateHistory: stagesStateHistory.value,
            stagesStateNoHistory: stagesStateNoHistory.value,
            stopwords: stopwords.value,
            editorData: editorData.value,
        }),
        set: (val) => {
            corpus.value = val.corpus
            stagePipelines.value = val.stagePipelines
            stages.value = val.stages
            stagesStateHistory.value = val.stagesStateHistory
            stagesStateNoHistory.value = val.stagesStateNoHistory
            stopwords.value = val.stopwords
            editorData.value = val.editorData
        }
    })

    const wordcount = computed(() => data.value["corpus"]["word_count"])

    const historyData = computed({
        get: () => ({
            stagePipelines: stagePipelines.value,
            stages: stages.value,
            stagesStateHistory: stagesStateHistory.value,
            stopwords: stopwords.value
        }),
        set: (val) => {
            stagePipelines.value = val.stagePipelines
            stages.value = val.stages
            stagesStateHistory.value = val.stagesStateHistory
            stopwords.value = val.stopwords
        }
    })

    const refHistory = useRefHistory(historyData, { deep: true, dump: SuperJSON.stringify, parse: SuperJSON.parse })

    function addStage(type, pipelineId) {
        const stage = getInitializedStage(type, pipelineId)
        data.value.stagePipelines.get(pipelineId).stages.push(stage.id)
        stages.value.set(stage.id, stage)
    }


    function updateStageState(id, state, withHistory) {
        if (withHistory) {
            stagesStateHistory.value.set(id, SuperJSON.stringify(state))
        } else {
            stagesStateNoHistory.value.set(id, SuperJSON.stringify(state))
        }
    }

    function get_filtered_wc(filter) {
        return wordcount.value
            .slice(0, 200 + filter.length)
            .filter(e => !filter.includes(e.word))
            .slice(0, 200)
    }


    watch(data, () => {
        const dataObject = data.value
        localStorage.setItem('stopwordsLocalData', SuperJSON.stringify(dataObject))
    }, { deep: true })

    function initializePipelines() {
        const initData = getInitData()
        const oldValue = data.value
        data.value = {
            ...initData,
            corpus: oldValue.corpus
        }

    }


    return {
        data,
        addStage,
        updateStageState,
        initializePipelines,
        refHistory,
        getters: { get_filtered_wc }
    }
}

export function getInitData() {
    let initData = {
        corpus: null,
        stages: new Map(),
        stagesStateHistory: new Map(),
        stagesStateNoHistory: new Map(),
        stopwords: new Set(),
        stagePipelines: new Map(),
        editorData: {
            mainToolSelected: EDITMODES['Move'].name
        }
    }

    // include invisible pipelines
    for (let i = 0; i < 3; i++) {
        const pipeline = getInitializedPipeline(i)
        initData.stagePipelines.set(pipeline.id, pipeline)
    }

    return initData
}


