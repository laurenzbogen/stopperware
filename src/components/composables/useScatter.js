import * as d3 from 'd3'
import { createLasso } from './useLasso.js';
import { createSlots, inject, onMounted, ref, watch } from 'vue'
import { useSelectionStyle } from '../util/util.js';
import SuperJSON from 'superjson';

// reactiveData: {
//  minX,
//  maxX,
//  minY,
//  maxY,
//  data: [{x, y, word}]
// }
export default function useScatter(stageData, stage) {
    const { container,
        reactiveData,
        currentFilter, stageSelection, stateNoUndo } = stageData
    const { stopwords, toggleIsStopword, isStopword, editMode } = inject('injectGlobalState')
    let initialTransformApplied = false
    const { selection: pipelineSelection } = inject('injectPipeline')

    const currentTransform = ref(d3.zoomIdentity)

    // Kept outside the watcher so it's created once and reused,
    // rather than rebuilt (and rebound) on every reactive change.
    let zoomBehavior = null

    onMounted(() => {
        if (stage && stage.stateNoUndo) {
            // ???
            const parsed = stage.stateNoUndo.json
            currentTransform.value = parsed.transform
        }
    })

    const { getSelectionStyle, triggers } = useSelectionStyle()

    function drawStopWords() {
        if (!container.value) {
            return
        }

        const groups = d3.select(container.value)
            .selectAll('g#scatter_point')
            .attr('class', (d) => getSelectionStyle(d.word))
    }

    watch(triggers, drawStopWords, { deep: true })

    function handleZoom(e) {
        currentTransform.value = e.transform
        const { k } = e.transform

        d3.select(container.value)
            .selectAll('text')
            .attr('transform', e.transform)
            .attr('font-size', 12 / k)

        d3.select(container.value)
            .selectAll('circle')
            .style('opacity', 0)

        d3.select(container.value)
            .call(occlusion)
    }

    function ensureZoomBehavior() {
        if (!zoomBehavior) {
            zoomBehavior = d3.zoom()
                .filter(event => {
                    if (editMode.value === 'MOVE') {
                        return true
                    }
                    return event.type === 'wheel' ||
                        (event.type === 'touchstart' && event.touches.length === 2);
                })
                .on('zoom', handleZoom)
        }
        return zoomBehavior
    }

    /**
     * Manually set the zoom/pan transform.
     *
     * @param {{x?: number, y?: number, k?: number} | d3.ZoomTransform} transform
     *   Either a plain object with x/y translation and k scale, or a
     *   d3.ZoomTransform instance.
     * @param {{ duration?: number }} [options] - pass a duration (ms) to animate.
     *
     * Usage:
     *   setZoomTransform({ x: 0, y: 0, k: 2 })                  // instant
     *   setZoomTransform({ x: 50, y: -20, k: 1.5 }, { duration: 400 }) // animated
     */
    function setZoomTransform(transform, { duration = 0 } = {}) {
        if (!container.value) return

        const zoom = ensureZoomBehavior()
        const nextTransform = transform instanceof d3.ZoomTransform
            ? transform
            : d3.zoomIdentity
                .translate(transform.x ?? 0, transform.y ?? 0)
                .scale(transform.k ?? 1)

        const selection = d3.select(container.value)

        // Make sure the zoom behavior is bound to the container before we
        // try to programmatically drive it.
        selection.call(zoom)

        if (duration > 0) {
            selection.transition().duration(duration).call(zoom.transform, nextTransform)
        } else {
            selection.call(zoom.transform, nextTransform)
        }
    }

    watch([container, currentFilter, stageSelection, editMode, pipelineSelection], () => {
        const data = reactiveData.value
        if (!container.value) return

        const width = container.value.clientWidth
        const height = container.value.clientHeight
        const marginX = 100
        const marginY = 100

        const xScale = d3.scaleLinear()
            .domain([data.minX, data.maxX])
            .range([0, width - marginX])

        const yScale = d3.scaleLinear()
            .domain([data.minX, data.maxY])
            .range([height - marginY, 0])

        // Filter without mutating the source
        const filtered = data.data.filter(d => !currentFilter.value.includes(d.word))

        const groups = d3.select(container.value)
            .selectAll('g')
            .data(filtered, d => d.word)  // <-- key by word
            .join(
                enter => {
                    const g = enter.append('g')

                    g.attr('id', 'scatter_point')

                    g.append('circle')
                        .attr('r', 1)
                        .attr('fill', 'currentColor')
                        .attr('cx', d => xScale(d.x) + marginX / 2)
                        .attr('cy', d => yScale(d.y) + marginY / 2)

                    g.append('text')
                        .text(d => d.word)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .attr('x', d => xScale(d.x) + marginX / 2)
                        .attr('y', d => yScale(d.y) + marginY / 2)
                        .attr('font-size', 12)
                        .attr('fill', 'currentColor')

                    return g
                },
                update => update,  // existing nodes stay as-is
                exit => exit.remove()  // <-- selected words get removed
            )

        const zoom = ensureZoomBehavior()

        const lasso = createLasso({
            svg: d3.select(container.value),
            onDraw: (items) => {
                items.attr('class', d =>
                    d._lassoPossible ? 'scatter_point lasso-possible' : 'scatter_point'
                );
            },
            onEnd: (selected) => {
                stageSelection.value = selected.map(s => s.word)
            },
            getZoom: () => currentTransform.value,
            enabled: editMode.value === 'LASSO'
        });

        d3.select(container.value)
            .call(occlusion)
            .call(lasso)
            .call(zoom)

        drawStopWords()

        if (!initialTransformApplied && container.value) {
            initialTransformApplied = true
            if (stage?.stateNoUndo?.json?.transform) {
                setZoomTransform(stage.stateNoUndo.json.transform)
            }
        }
    }, { deep: true })

    function occlusion(svg, against = "g") {
        const svgEl = container.value;
        const nodes = d3
            .sort(svg.selectAll(against), (node) => +node.getAttribute("data-priority"))
            .reverse()
            .map((node) => {
                const { x, y, width, height } = node.getBoundingClientRect();
                return { node, x, y, width, height };
            });

        const visible = [];
        for (const d of nodes) {
            const occluded = visible.some((e) => intersectRect(d, e));
            if (occluded) {
                d3.select(d.node)
                    .select('circle')
                    .style('opacity', 1)
                d3.select(d.node)
                    .select('text')
                    .style('display', 'none')

                if (!occluded) visible.push(d);
            }
            return visible;
        }
    }

    function intersectRect(a, b) {
        return !(
            a.x + a.width < b.x ||
            b.x + b.width < a.x ||
            a.y + a.height < b.y ||
            b.y + b.height < a.y
        );
    }

    return { currentTransform, setZoomTransform }
}
