/**
 * Grouped column chart — income beside spending, month by month.
 *
 * One y-axis, always. Two measures of the same unit (money) belong on the same scale;
 * a second axis would let any two series be drawn to tell whatever story you like.
 */

import { barPath, createCanvasChart, seriesColor, tooltipContent } from "./base.js";
import { niceScale, scaleLinear } from "./scale.js";

const PADDING = { top: 16, right: 10, bottom: 28, left: 56 };
const MAX_BAR_WIDTH = 24;
const BAR_GAP = 2; // the surface gap between the two bars of a group

export function createBarChart(container, { ariaLabel = "Monthly income and spending" } = {}) {
    return createCanvasChart(container, {
        ariaLabel,
        height: 240,
        render(ctx, { width, height, theme, data, active }) {
            const { points = [], series = [], formatTick = String } = data ?? {};
            const plotLeft = PADDING.left;
            const plotRight = width - PADDING.right;
            const plotTop = PADDING.top;
            const plotBottom = height - PADDING.bottom;
            const layout = { points: [], plotLeft, plotRight, plotTop, plotBottom, bands: [] };

            if (points.length === 0 || series.length === 0) {
                ctx.fillStyle = theme.muted;
                ctx.textAlign = "center";
                ctx.fillText("No transactions yet", width / 2, height / 2);
                return layout;
            }

            const maxValue = Math.max(
                1,
                ...points.flatMap((point) => series.map((entry) => point[entry.key] ?? 0))
            );
            const scale = niceScale(0, maxValue, 4);
            const toY = (value) => scaleLinear(value, scale.min, scale.max, plotBottom, plotTop);

            // Gridlines first: recessive, hairline, solid, behind the data.
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

            const bandWidth = (plotRight - plotLeft) / points.length;
            const barWidth = Math.max(
                4,
                Math.min(MAX_BAR_WIDTH, (bandWidth * 0.62 - BAR_GAP * (series.length - 1)) / series.length)
            );
            const groupWidth = barWidth * series.length + BAR_GAP * (series.length - 1);

            points.forEach((point, index) => {
                const bandStart = plotLeft + bandWidth * index;
                const bandCenter = bandStart + bandWidth / 2;

                if (active?.key === point.key) {
                    ctx.fillStyle = theme.grid;
                    ctx.globalAlpha = 0.45;
                    ctx.fillRect(bandStart + 2, plotTop, bandWidth - 4, plotBottom - plotTop);
                    ctx.globalAlpha = 1;
                }

                series.forEach((entry, seriesIndex) => {
                    const value = point[entry.key] ?? 0;
                    const x = bandCenter - groupWidth / 2 + seriesIndex * (barWidth + BAR_GAP);
                    const y = toY(value);
                    const barHeight = plotBottom - y;

                    if (barHeight > 0.5) {
                        barPath(ctx, x, y, barWidth, barHeight, 4);
                        ctx.fillStyle = seriesColor(theme, entry.slot);
                        ctx.fill();
                    }
                });

                ctx.fillStyle = theme.muted;
                ctx.textAlign = "center";
                ctx.fillText(point.label, bandCenter, plotBottom + 14);

                layout.bands.push({ key: point.key, start: bandStart, end: bandStart + bandWidth, center: bandCenter, point });
            });

            // Baseline last, so it sits crisply on top of the columns' square feet.
            ctx.strokeStyle = theme.axis;
            ctx.beginPath();
            ctx.moveTo(plotLeft, Math.round(plotBottom) + 0.5);
            ctx.lineTo(plotRight, Math.round(plotBottom) + 0.5);
            ctx.stroke();

            return layout;
        },

        hitTest(point, { layout, data, theme }) {
            if (point.y < layout.plotTop - 8 || point.y > layout.plotBottom + 8) return null;

            const band = layout.bands.find((entry) => point.x >= entry.start && point.x < entry.end);
            if (!band) return null;

            const format = data.formatValue ?? String;

            return {
                key: band.key,
                x: band.center,
                y: layout.plotTop + 12,
                node: tooltipContent(
                    band.point.tooltipTitle ?? band.point.label,
                    data.series.map((entry) => ({
                        label: entry.label,
                        value: format(band.point[entry.key] ?? 0),
                        color: seriesColor(theme, entry.slot)
                    }))
                )
            };
        }
    });
}
