import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useRefHistory } from '@vueuse/core'
import SuperJSON from 'superjson'
import { EDITMODES, getInitializedPipeline, getInitializedStage, getInitData } from '@/helpers'

export const useKeyStore = defineStore('stopperwareKeyStore', () => {
    const keybinds = ref([])

    watch('keybinds', () => {
        document.removeEventListener('keydown', handleKeyDown)

        document.addEventListener('keydown', handleKeyDown)
    }, { immediate: true })

    function handleKeyDown(e) {
        const found = keybinds.value.filter(([keycombination, _]) => {
            let key = keycombination
            const modifier = matchModifierKey(keycombination)
            // <C-e><A-e><M-e>
            if (modifier) {
                const [mod, k] = modifier
                if (!e[mod]) return false
                key = k
            }

            return key.toLowerCase() === e.key
        })

        for (let f of found) {
            f[1]?.()
        }
    }

    return { keybinds }

})


function matchModifierKey(str) {
    const match = str.match(/^<([CAM])-([a-zA-Z0-9])>$/);
    if (!match) return null;

    const [, modifier, key] = match;
    return [modifierDict[modifier], key]
}

const modifierDict = {
    'C': 'ctrlKey',
    'A': 'altKey',
    'M': 'metaKey',
}
