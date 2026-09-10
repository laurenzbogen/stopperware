import { computed, createSlots, onMounted, ref, toRaw, watch, watchEffect } from "vue"
import { EDITMODES, getInitializedPipeline, getInitializedStage } from "../../helpers";
import { useRefHistory } from '@vueuse/core'
import SuperJSON from "superjson";
import { v4 as uuidv4 } from "uuid";
import { useCookies } from '@vueuse/integrations/useCookies'

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
    const init = getInitData()

    const stagePipelines = !parsed ? ref(init.stagePipelines) : ref(parsed.stagePipelines)
    const stages = !parsed ? ref(init.stages) : ref(parsed.stages)
    const stagesStateHistory = !parsed ? ref(init.stagesStateHistory) : ref(parsed.stagesStateHistory)
    const stagesStateNoHistory = !parsed ? ref(init.stagesStateNoHistory) : ref(parsed.stagesStateNoHistory)
    const stopwords = !parsed ? ref(init.stopwords) : ref(parsed.stopwords)
    const editorData = !parsed ? ref(init.editorData) : ref(parsed.editorData)
    const selectionGroups = !parsed ? ref(init.selectionGroups) : ref(parsed.selectionGroups)

    const data = computed({
        get: () => ({
            stagePipelines: stagePipelines.value,
            stages: stages.value,
            stagesStateHistory: stagesStateHistory.value,
            stagesStateNoHistory: stagesStateNoHistory.value,
            stopwords: stopwords.value,
            editorData: editorData.value,
            selectionGroups: selectionGroups.value,
        }),
        set: (val) => {
            stagePipelines.value = val.stagePipelines
            stages.value = val.stages
            stagesStateHistory.value = val.stagesStateHistory
            stagesStateNoHistory.value = val.stagesStateNoHistory
            stopwords.value = val.stopwords
            editorData.value = val.editorData
            selectionGroups.value = val.selectionGroups
        }
    })

    watch(data, (val) => {
        localStorage.setItem('stopwordsLocalData', SuperJSON.stringify(val))
    }, { deep: true })

    const historyData = computed({
        get: () => ({
            stagePipelines: stagePipelines.value,
            stages: stages.value,
            stagesStateHistory: stagesStateHistory.value,
            stopwords: stopwords.value,
            selectionGroups: selectionGroups.value,
        }),
        set: (val) => {
            stagePipelines.value = val.stagePipelines
            stages.value = val.stages
            stagesStateHistory.value = val.stagesStateHistory
            stopwords.value = val.stopwords
            selectionGroups.value = val.selectionGroups
        }
    })
    const refHistory = useRefHistory(historyData, { deep: true, dump: SuperJSON.stringify, parse: SuperJSON.parse })

    function addStage(type, pipelineId, initState) {
        const stage = getInitializedStage(type, pipelineId)
        const pipeline = data.value.stagePipelines.get(pipelineId)

        if (initState) {
            stagesStateNoHistory.value.set(stage.id, initState)
        }

        // TODO selection Groups
        // let selectionGroupId
        // if (pipeline.stages.length === 0) selectionGroupId = uuidv4()
        // else {
        // const lastStage = stages.value.get(pipeline.stages[pipeline.stages.length - 1])
        // const selectionGroupId = lastStage.selectionGroupId
        // }

        stage.selectionGroupId = pipeline.selectionGroupId
        //selectionGroups.value.set(selectionGroupId, [])


        pipeline.stages.push(stage.id)
        stages.value.set(stage.id, stage)
    }

    function deleteStage(stageId) {
        const stage = data.value.stages.get(stageId)
        data.value.editorData.detailStageId = ''
        data.value.stages.delete(stageId)
        data.value.stagePipelines.get(stage.pipeline).stages = data.value.stagePipelines.get(stage.pipeline).stages.filter(s => s !== stageId)
    }

    function updateStageState(id, state, withHistory) {
        if (withHistory) {
            stagesStateHistory.value.set(id, state)
        } else {
            stagesStateNoHistory.value.set(id, state)
        }
    }

    function getStageState(id) {
    }

    function setOperationStopwords(wordSet, operation) {
        // 'union' / 'intersection' / 'difference'
        if (!stopwords.value[operation]) throw new Error('invalid set operation on stopwords set')
        const set = toRaw(stopwords.value)
        stopwords.value = set[operation](wordSet)

    }

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

        deleteStage,
        setOperationStopwords,

        addStage,
        updateStageState,
        getStageState,
        initializePipelines,
        refHistory,
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
        selectionGroups: new Map(),
        editorData: {
            mainToolSelected: EDITMODES['Move'].name,
            detailStageId: '',
        }
    }

    // include invisible pipelines
    for (let i = 0; i < 3; i++) {
        const pipeline = getInitializedPipeline(i)
        const selectionGroupId = uuidv4()
        pipeline.selectionGroupId = selectionGroupId

        initData.stagePipelines.set(pipeline.id, pipeline)
        initData.selectionGroups.set(selectionGroupId, [])

        initData.selection
    }

    return initData
}


