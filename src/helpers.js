import { v4 as uuidv4 } from "uuid";
import { Lasso } from "@lucide/vue";
import { LucideMove } from "@lucide/vue";
import { MousePointer2 } from "@lucide/vue";
import { Dot } from "@lucide/vue";

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
    Move: { name: 'Move', icon: LucideMove, tooltip: 'H' },
    LassoPlus: { name: 'LassoPlus', icon: Lasso, tooltip: 'L' },
    LassoMinus: { name: 'LassoMinus', icon: Lasso },
    Placeholder: { name: 'Placeholder', icon: Dot }

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


// Custom (non-standard) HTTP status codes the backend uses for job-state
// signaling, see backend/main.py and backend/job_state.py.
export const API_STATUS_CODES = {
    STARTING: 201,
    INPROGRESS: 210,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    JOB_NOT_IDLE: 423,
    DIFFERENT_JOB_RUNNING: 465,
    SESSION_BLOCKED: 466,
    JOB_ERROR: 510,
    SESSION_NOT_FOUND: 567,
    CANCEL_NOT_OWNED: 572,
}

// Severity a badge should use for a given (non-2xx) API status code.
export function apiStatusBadgeType(status) {
    switch (status) {
        case API_STATUS_CODES.JOB_NOT_IDLE:
        case API_STATUS_CODES.DIFFERENT_JOB_RUNNING:
        case API_STATUS_CODES.SESSION_BLOCKED:
        case API_STATUS_CODES.SESSION_NOT_FOUND:
            return 'warning'
        default:
            return 'error'
    }
}

export class ApiError extends Error {
    constructor(status, detail) {
        super(detail)
        this.name = 'ApiError'
        this.status = status
        this.detail = detail
    }
}

export async function fetchApiJson(endpoint, options = {}) {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/${endpoint}`, {
        credentials: 'include',
        ...options,
    })

    const body = await res.json().catch(() => null)

    if (!res.ok) {
        const detail = body?.detail ?? body?.error ?? `Request to ${endpoint} failed with status ${res.status}`
        throw new ApiError(res.status, detail)
    }

    return body
}
