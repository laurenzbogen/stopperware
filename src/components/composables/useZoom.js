import * as d3 from 'd3'
import { EDITMODES } from "@/helpers";
import { watch, inject, ref, computed, createSlots } from 'vue';
import { useDataStore } from '@/components/composables/useDataStore';
import { storeToRefs } from 'pinia';

export default function useZoom(id, container, scaledPositions) {
    const dataStore = useDataStore()
    const { updateStageState } = dataStore
    const { stagesStateNoHistory, editorData } = storeToRefs(dataStore)
    const { zoomIsGesturing: globalZoomIsBlocking } = inject('injectGlobalState')


    const zoomTransform = ref(null);
    const zoomedPositions = computed(() => scaledPositions.value?.map(d => {
        if (zoomTransform.value == null) return null
        const { k, x, y } = zoomTransform.value.transform
        const transform = new d3.ZoomTransform(k, x, y)

        return transform.apply(d)
    }))

    const zoom = ref(null)

    watch(zoomTransform, (zoomVal) => {
        const state = { transform: zoomVal }
        // data.value.editorData.detailStageId = id
        updateStageState(id, state, false)
    })

    watch(container, (containerVal) => {
        if (containerVal === null) return
        const prevTransform = stagesStateNoHistory.value.get(id)?.transform?.transform
        const { k, x, y } = prevTransform ? prevTransform : d3.zoomIdentity
        const initTransform = new d3.ZoomTransform(k, x, y)
        zoom.value = d3.zoom()
            .filter(event => filterZoomEvents(event, zoom.value))
            // Zooming is setting the zoomTransform.value which gets watched
            .on('zoom', (e) => { zoomTransform.value = e })

        const selection = d3.select(containerVal)
        selection
            .call(zoom.value)
            .call(zoom.value.transform, initTransform)
    })


    function filterZoomEvents(event, z) {
        if (globalZoomIsBlocking.value) {
            return false
        }
        //todo touchscreen
        if (event.type === 'mousedown') {
            return editorData.value.mainToolSelected === EDITMODES['Move'].name
        }
        const isPinch = event.ctrlKey
        if (isPinch) {
            // zoom
            return true
        }

        // pan
        event.preventDefault()
        event.stopPropagation()
        const t = d3.zoomTransform(container.value)
        z.translateBy(d3.select(container.value), -event.deltaX / t.k, -event.deltaY / t.k)
        return false
    }

    function targetZoom(center, bounds) {
        const PADDING_FACTOR = 0.7
        const containerBounds = [container.value.clientWidth, container.value.clientHeight]
        const xFactor = bounds[0] !== 0 ? containerBounds[0] * PADDING_FACTOR / bounds[0] : 1.2
        const yFactor = bounds[1] !== 0 ? containerBounds[1] * PADDING_FACTOR / bounds[1] : 1.2
        const factor = Math.min(xFactor, yFactor)


        const e = zoom.value.extent().call(container.value)
        const b = [e[1][0] - e[0][0], e[1][1] - e[0][1]]


        const transform = new d3.ZoomTransform(
            factor,
            b[0] / 2 - factor * center[0],
            b[1] / 2 - factor * center[1]
        )
        d3.select(container.value)
            .transition()
            .duration(750)
            .call(zoom.value.transform, transform)
        //.call(zoom.value.scaleTo, factor)
    }

    function resetZoom() {
        d3.select(container.value)
            .transition()
            .duration(750)
            .call(zoom.value.transform, d3.zoomIdentity)

    }

    return { zoomedPositions, zoomTransform, targetZoom, resetZoom }
}


