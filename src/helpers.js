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
    Select: { name: 'Select', icon: MousePointer2 },
    Move: { name: 'Move', icon: Move },
    LassoPlus: { name: 'LassoPlus', icon: Lasso },
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
