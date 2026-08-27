import { EDITMODES } from '@/helpers';
import * as d3 from 'd3';
import { computed, createSlots, inject, onMounted, ref, watch } from 'vue';

export function useLasso({ container, onStart, onDraw, onEnd, getZoom }) {
    const { data } = inject('injectGlobalState')
    const enabled = computed(() => data.value.editorData.mainToolSelected === EDITMODES['Lasso'].name)

    const lassoPath = ref([])
    const pathElement = ref(null)

    watch(lassoPath, (lassoPathVal) => {
        if (pathElement.value === null) return
        console.log(pathElement.value)
        console.log(lassoPathVal)
    }, { deep: true })

    const lineGenerator = d3.line().x(d => d[0]).y(d => d[1]);

    onMounted(() => {
        if (container.value === null) throw new Error('Lasso couldnt be initialized because of null container')
        const svgSelect = d3.select(container.value)
        pathElement.value = svgSelect.append('path')
            .attr('class', 'lasso-path')
            .attr('fill', 'none')
            .attr('stroke', '#667')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4');

        const drag = svgSelect.call(d3.drag()
            .filter((e) => {
                return enabled.value === true
            })
            .on('start', (evt) => {
                const [mx, my] = d3.pointer(evt, svgSelect.node());
                lassoPath.value = [[evt.x, evt.y]];
                onStart?.();
            })
            .on('drag', (evt) => {
                lassoPath.value.push([evt.x, evt.y]);
                //lassoLine?.attr('d', lineGenerator(lassoPath) + '');
            })
            .on('end', () => {
                lassoPath.value = []
            }));
    })

    return true

    //const items = svgSelect.selectAll("g")
    //lassoLine?.remove();
    //lassoLine = null;

    //let centers = [];
    //items.each(function (e) {
    //    centers.push([
    //        parseFloat(this.querySelector("text")?.getAttribute("x")),
    //        parseFloat(this.querySelector("text")?.getAttribute("y"))
    //    ])
    //})

    //let selected = []
    //const trans = getZoom()
    //const unzoomedLassoPath = lassoPath.map(e => getZoom(e[0], e[1]))

    //items.each(function (d, i) {
    //    const [cx, cy] = centers[i]
    //    const isSelected = pointInPolygon([cx, cy], unzoomedLassoPath);
    //    d._lassoSelected = isSelected
    //    if (isSelected) {
    //        selected.push(d)
    //    }
    //});
    //onEnd?.(selected);
    //lassoPath = [];


    //return drag
}

