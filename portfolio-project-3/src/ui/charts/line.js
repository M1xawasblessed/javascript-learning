/**
 * Line chart — running balance over time.
 *
 * One series, so there is no legend: the title already says what is plotted. The only
 * direct label is the endpoint, which is the number the reader actually came for.
 */

import { createCanvasChart, tooltipContent } from "./base.js";
import { clamp, niceScale, scaleLinear } from "./scale.js";

// The right gutter holds the endpoint's direct label, so it is wider than the others.
const PADDING = { top: 22, right: 92, bottom: 26, left: 56 };
const MARKER_RADIUS = 4.5;

export function createLineChart(container, { ariaLabel = "Balance over time" } = {}) {
    return createCanvasChart(container, {
        ariaLabel,
        height: 240,
        render(ctx, { width, height, theme, data, active }) {
            const { points = [], formatTick = String, endLabel = "" } = data ?? {};
            const plotLeft = PADDING.left;
            const plotRight = width - PADDING.right;
            const plotTop = PADDING.top;
            const plotBottom = height - PADDING.bottom;
            const layout = { points: [], plotLeft, plotRight, plotTop, plotBottom };

            if (points.length === 0) {
                ctx.fillStyle = theme.muted;
                ctx.textAlign = "center";
                ctx.fillText("No balance history yet", width / 2, height / 2);
                return layout;
            }

            const values = points.map((point) => point.value);
            const scale = niceScale(Math.min(0, ...values), Math.max(...values), 4);
            const toY = (value) => scaleLinear(value, scale.min, scale.max, plotBottom, plotTop);
            // Points are evenly spaced by order, not by calendar distance: this is a
            // trend line over "the days something happened", not a time axis.
            const toX = (index) =>
                points.length === 1
                    ? (plotLeft + plotRight) / 2
                    : scaleLinear(index, 0, points.length - 1, plotLeft, plotRight);

            ctx.lineWidth = 1;
            ctx.textAlign = "right";
            for (const tick of scale.ticks) {
                const y = Math.round(toY(tick)) + 0.5;
                ctx.strokeStyle = tick === 0 ? theme.axis : theme.grid;
                ctx.beginPath();
                ctx.moveTo(plotLeft, y);
                ctx.lineTo(plotRight, y);
                ctx.stroke();

                ctx.fillStyle = theme.muted;
                ctx.fillText(formatTick(tick), plotLeft - 8, y);
            }

            const coordinates = points.map((point, index) => ({
                ...point,
                x: toX(index),
                y: toY(point.value)
            }));
            layout.points = coordinates;

            // Area wash: the series hue at 10%, never a saturated block.
            ctx.beginPath();
            ctx.moveTo(coordinates[0].x, toY(Math.max(scale.min, 0)));
            for (const point of coordinates) ctx.lineTo(point.x, point.y);
            ctx.lineTo(coordinates.at(-1).x, toY(Math.max(scale.min, 0)));
            ctx.closePath();
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = theme.accent;
            ctx.fill();
            ctx.globalAlpha = 1;

            ctx.beginPath();
            coordinates.forEach((point, index) => {
                if (index === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.strokeStyle = theme.accent;
            ctx.lineWidth = 2;
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            ctx.stroke();

            // Crosshair for the hovered point, drawn under the markers.
            const activePoint = active ? coordinates.find((point) => point.key === active.key) : null;
            if (activePoint) {
                ctx.strokeStyle = theme.axis;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(Math.round(activePoint.x) + 0.5, plotTop);
                ctx.lineTo(Math.round(activePoint.x) + 0.5, plotBottom);
                ctx.stroke();
                drawMarker(ctx, activePoint.x, activePoint.y, theme);
            }

            const last = coordinates.at(-1);
            drawMarker(ctx, last.x, last.y, theme);

            if (endLabel) {
                // Measure before placing: a label that would run off the right edge is
                // moved left of the marker rather than clipped.
                const labelWidth = ctx.measureText(endLabel).width;
                const fitsRight = last.x + 10 + labelWidth <= width - 4;

                ctx.fillStyle = theme.ink;
                ctx.textAlign = "left";
                ctx.fillText(
                    endLabel,
                    fitsRight ? last.x + 10 : Math.max(last.x - 10 - labelWidth, plotLeft),
                    // Lifted clear of the stroke when it has to sit back over the plot.
                    clamp(fitsRight ? last.y : last.y - 14, plotTop + 6, plotBottom - 6)
                );
            }

            ctx.fillStyle = theme.muted;
            ctx.textAlign = "left";
            ctx.fillText(points[0].label, plotLeft, plotBottom + 14);
            if (points.length > 1) {
                ctx.textAlign = "right";
                ctx.fillText(points.at(-1).label, plotRight, plotBottom + 14);
            }

            return layout;
        },

        hitTest(point, { layout, data }) {
            if (layout.points.length === 0) return null;
            if (point.x < layout.plotLeft - 12 || point.x > layout.plotRight + 12) return null;

            // Nearest point on x — a vertical band is far easier to hit than a 9px dot.
            const nearest = layout.points.reduce((best, candidate) =>
                Math.abs(candidate.x - point.x) < Math.abs(best.x - point.x) ? candidate : best
            );

            const format = data.formatValue ?? String;
            const rows = [{ label: data.valueLabel ?? "Balance", value: format(nearest.value) }];
            if (typeof nearest.delta === "number") {
                rows.push({ label: "Change", value: format(nearest.delta, { signed: true }) });
            }

            return {
                key: nearest.key,
                x: nearest.x,
                y: nearest.y,
                node: tooltipContent(nearest.tooltipTitle ?? nearest.label, rows)
            };
        }
    });
}

/** A filled dot with a 2px surface ring, so it stays legible where it crosses the line. */
function drawMarker(ctx, x, y, theme) {
    ctx.beginPath();
    ctx.arc(x, y, MARKER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = theme.accent;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme.surface;
    ctx.stroke();
}
