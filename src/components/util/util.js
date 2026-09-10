import { createSlots, inject } from "vue"

export function useSelectionStyle(stageSelection) {
    console.log(stageSelection)
    const { isStopword, stopwords } = inject('injectGlobalState')
    const { selection: pipelineSelection } = inject('injectPipelineState')
    const triggers = [ stopwords, pipelineSelection ]


    function getSelectionStyle(word) {
        let str = ""
        if (isStopword(word)) {
            if (pipelineSelection.value.has(word)) {
                str = 'text-secondary'
            } else {
                str = 'text-accent'
            }
        } else if (pipelineSelection.value.has(word)) {
            str = 'text-info'
        }

        if (stageSelection?.value.length > 1) {
            if (!stageSelection.value.includes(d.word)) {
                str += ' opacity-35'
            }
        }

        return str
    }

    return { getSelectionStyle, triggers }


}
