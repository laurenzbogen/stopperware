import { v4 as uuidv4 } from "uuid";
import Lasso from "./icons/Lasso.vue";
import Move from "./icons/Move.vue";
import { MousePointer2 } from "@lucide/vue";
import Placeholder from "./icons/Placeholder.vue";


export function getInitializedPipeline(position) {
    return {
        id: uuidv4(),
        position: position,
        selectionGroupId: uuidv4(),
        exclude: new Set(),
        stages: [],
    }
}

export function getInitializedStage(type, pipelineId, position) {
    return {
        pipeline: pipelineId,
        id: uuidv4(),
        index: position,
        type: type,
        filter: [],
        resizeHeight: 400,
    }
}

export const EDITMODES = {
    Select: { name: 'Select', icon: MousePointer2, tooltip: 'V' },
    Move: { name: 'Move', icon: Move, tooltip: 'M' },
    LassoPlus: { name: 'LassoPlus', icon: Lasso, tooltip: 'L' },
    LassoMinus: { name: 'LassoMinus', icon: Lasso },
    Placeholder: { name: 'Placeholder', icon: Placeholder }

}


export async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
