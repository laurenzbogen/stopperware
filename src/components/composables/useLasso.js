// useLasso.js
import * as d3 from 'd3';
import { ref } from 'vue';

export function createLasso({ svg, onStart, onDraw, onEnd, getZoom, enabled }) {
    let lassoPath = [];
    let lassoLine = null;


    const lineGenerator = d3.line().x(d => d[0]).y(d => d[1]);

    const drag = d3.drag()
        .filter((e) => {
            return enabled && e.target.id === svg.node().id
        })
        .on('start', (evt) => {
            const [mx, my] = d3.pointer(evt, svg.node());
            lassoPath = [[evt.x, evt.y]];
            lassoLine = svg.append('path')
                .attr('class', 'lasso-path')
                .attr('fill', 'none')
                .attr('stroke', '#667')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '4');
            onStart?.();
        })
        .on('drag', (evt) => {
            lassoPath.push([evt.x, evt.y]);
            lassoLine?.attr('d', lineGenerator(lassoPath) + '');
        })
        .on('end', () => {
            const items = svg.selectAll("g")
            lassoLine?.remove();
            lassoLine = null;

            let centers = [];
            items.each(function (e) {
                centers.push([
                    parseFloat(this.querySelector("text")?.getAttribute("x")),
                    parseFloat(this.querySelector("text")?.getAttribute("y"))
                ])
            })

            let selected = []
            const trans = getZoom()
            const unzoomedLassoPath = lassoPath.map(e => trans.invert(e))
            items.each(function (d, i) {
                const [cx, cy] = centers[i]
                const isSelected = pointInPolygon([cx, cy], unzoomedLassoPath);
                d._lassoSelected = isSelected
                if (isSelected) {
                    selected.push(d)
                }
            });
            onEnd?.(selected);
            lassoPath = [];
        });


    return drag
}

function pointInPolygon([x, y], polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}
