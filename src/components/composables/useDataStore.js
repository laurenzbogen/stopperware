import { defineStore } from 'pinia'
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import { useRefHistory } from '@vueuse/core'
import SuperJSON from 'superjson'
import { EDITMODES, getInitializedPipeline, getInitializedStage, getInitData } from '@/helpers'

export const useDataStore = defineStore('stopperwareLocalData', () => {
    const init = getInitData()

    // --- state (always starts from init; persist plugin rehydrates over this) ---
    const stagePipelines = ref(init.stagePipelines)
    const stages = ref(init.stages)
    const stagesStateHistory = ref(init.stagesStateHistory)
    const stagesStateNoHistory = ref(init.stagesStateNoHistory)
    const stopwords = ref(init.stopwords)
    const editorData = ref(init.editorData)
    const selectionGroups = ref(init.selectionGroups)


    // --- undo/redo history (subset of state, same as before) ---
    const trackable = computed({
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
        },
    })

    const refHistory = useRefHistory(trackable, {
        deep: true,
        flush: 'sync',
        dump: SuperJSON.stringify,
        parse: SuperJSON.parse,
    })
    const refHistoryFuncs = { undo: refHistory.undo, redo: refHistory.redo, batch: refHistory.batch }
    const refHistoryState = computed(() => ({ canUndo: refHistory.canUndo.value, canRedo: refHistory.canRedo.value }))

    onMounted(() => {
        refHistory.clear()
    })



    // --- actions ---
    function addStage(type, pipelineId, initState) {
        refHistoryFuncs.batch(() => {
            const stage = getInitializedStage(type, pipelineId)
            const pipeline = stagePipelines.value.get(pipelineId)

            if (initState) {
                stagesStateNoHistory.value.set(stage.id, initState)
            }

            stage.selectionGroupId = pipeline.selectionGroupId
            pipeline.stages.push(stage.id)
            stages.value.set(stage.id, stage)

            editorData.value.detailStageId = stage.id

        })
    }

    function deleteStage(stageId) {
        refHistoryFuncs.batch(() => {
            const stage = stages.value.get(stageId)
            editorData.value.detailStageId = ''
            stages.value.delete(stageId)
            stagePipelines.value.get(stage.pipeline).stages =
                stagePipelines.value.get(stage.pipeline).stages.filter(s => s !== stageId)

        })
    }

    function moveStage(stageId, toPipelineId, toPosition) {
        refHistoryFuncs.batch(() => {
            const stage = stages.value.get(stageId)
            const fromPipelineId = stage.pipeline
            const fromPipeline = stagePipelines.value.get(fromPipelineId)
            const toPipeline = stagePipelines.value.get(toPipelineId)

            const fromPosition = fromPipeline.stages.findIndex(p => p === stageId)
            fromPipeline.stages.splice(fromPosition, 1)[0]

            stage.selectionGroupId = toPipeline.selectionGroupId
            stage.pipeline = toPipelineId

            toPipeline.stages.splice(toPosition, 0, stageId)

            checkEmptyPipelines()
        })
    }

    function checkEmptyPipelines() {
        refHistoryFuncs.batch(() => {
            let orderedPipelines = Array.from(stagePipelines.value.values()).sort((a, b) => a.position - b.position)
            if (orderedPipelines[0].stages.length !== 0) {
                addPipeline(0)
            }
            if (orderedPipelines[orderedPipelines.length - 1].stages.length !== 0) {
                addPipeline(orderedPipelines.length)
            }

            orderedPipelines = Array.from(stagePipelines.value.values()).sort((a, b) => a.position - b.position)
            for (let i = 1; i < orderedPipelines.length - 1; i++) {
                if (orderedPipelines[i].stages.length === 0) {
                    const id = orderedPipelines[i].id
                    deletePipeline(id)
                }
            }

        })
    }

    function addPipeline(posOrNull) {
        refHistoryFuncs.batch(() => {
            const ordered = Array.from(stagePipelines.value.values()).sort((a, b) => a.position - b.position)
            const position = posOrNull ?? ordered.length - 1
            for (let i = position; i < ordered.length; i++) {
                const id = ordered[i].id
                stagePipelines.value.get(id).position++
            }
            const newPipeline = getInitializedPipeline(position)
            selectionGroups.value.set(newPipeline.selectionGroupId, [])
            stagePipelines.value.set(newPipeline.id, newPipeline)

            return newPipeline.id
        })
    }

    function deletePipeline(id) {
        refHistoryFuncs.batch(() => {
            const pipeline = stagePipelines.value.get(id)
            stagePipelines.value.delete(id)
            for (let stageId of pipeline.stages) {
                if (stageId === editorData.value.detailStageId) {
                    editorData.value.detailStageId = null
                }
                stages.value.delete(stageId)
            }
            selectionGroups.value.delete(pipeline.selectionGroupId)

            const ordered = Array.from(stagePipelines.value.values()).sort((a, b) => a.position - b.position)
            for (let i = pipeline.position; i < ordered.length; i++) {
                const id = ordered[i].id
                stagePipelines.value.get(id).position--
            }

            if (stagePipelines.value.size < 3) {
                addPipeline()
            }
        })
    }

    function updateStageState(id, state, withHistory) {
        if (withHistory) {
            stagesStateHistory.value.set(id, state)
        } else {
            stagesStateNoHistory.value.set(id, state)
        }
    }

    function getStageState(id) {
        // TODO
    }

    function setOperationStopwords(wordSet, operation) {
        if (!stopwords.value[operation]) throw new Error('invalid set operation on stopwords set')
        const set = toRaw(stopwords.value)
        stopwords.value = set[operation](wordSet)
    }


    function setOperationPipelineExclude(wordSet, operation, pipelineId) {
        const pipeline = stagePipelines.value.get(pipelineId)
        if (!pipeline.exclude[operation]) throw new Error('invalid set operation on pipeline exclude set')
        const set = toRaw(pipeline.exclude)
        pipeline.exclude = set[operation](wordSet)
        selectionGroups.value.set(pipeline.selectionGroupId, [])
    }

    function initializePipelines() {
        const initData = getInitData()
        stagePipelines.value = initData.stagePipelines
        stages.value = initData.stages
        stagesStateHistory.value = initData.stagesStateHistory
        stagesStateNoHistory.value = initData.stagesStateNoHistory
        stopwords.value = initData.stopwords
        editorData.value = initData.editorData
        selectionGroups.value = initData.selectionGroups
    }

    return {
        stagePipelines,
        stages,
        stagesStateHistory,
        stagesStateNoHistory,
        stopwords,
        editorData,
        selectionGroups,

        addStage,
        deleteStage,
        moveStage,
        addPipeline,
        deletePipeline,
        updateStageState,
        getStageState,
        setOperationStopwords,
        setOperationPipelineExclude,
        initializePipelines,
        refHistoryFuncs,
        refHistoryState,
    }
}, {
    persist: {
        storage: localStorage,
        serializer: {
            serialize: SuperJSON.stringify,
            deserialize: SuperJSON.parse,
        },
        pick: ['stages', 'editorData', 'selectionGroups', 'stagePipelines', 'stagesStateHistory', 'stagesStateNoHistory', 'stopwords'],
    }
})
