import { v4 as uuidv4 } from "uuid";
import Lasso from "./icons/Lasso.vue";
import Move from "./icons/Move.vue";
import Placeholder from "./icons/Placeholder.vue";


export function getInitializedPipeline(position) {
    return {
        id: uuidv4(),
        position: position,
        selection: new Set([]),
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
    }
}

export const EDITMODES = {
    Move: {name: 'Move', icon: Move},
    Lasso: {name: 'Lasso', icon: Lasso},
    Placeholder: {name: 'Placeholder', icon: Placeholder}

}
