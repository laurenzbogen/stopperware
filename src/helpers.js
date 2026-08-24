import { v4 as uuidv4 } from "uuid";


export function getInitializedPipeline() {
    return {
        id: uuidv4(),
        selection: new Set([]),
        stages: [],
    }
}
