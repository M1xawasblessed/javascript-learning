/**
 * Donut chart — share of spending by category.
 *
 * Slices are separated by a 2px gap in the surface colour rather than by a stroke:
 * white does the separating, so no non-data ink is added. Colour comes from the
 * category's permanent slot, never from its rank in this particular month.
 */

import { createCanvasChart, seriesColor, tooltipContent } from "./base.js";

const TAU = Math.PI * 2;
const START_ANGLE = -Math.PI / 2; // twelve o'clock

export function createDonutChart(container, { ariaLabel = "Spending by category" } = {}) {
    return createCanvasChart(container, {
        ariaLabel,
        height: (width) => Math.max(200, Math.min(260, width)),
        render(ctx, { width, height, theme, data, active }) {
            const { slices = [], centerLabel = "", centerValue = "" } = data ?? {};
            const cx = width / 2;
            const cy = height / 2;
            const outer = Math.max(40, Math.min(width, height) / 2 - 12);
            const thickness = Math.max(22, Math.min(46, outer * 0.38));
            const inner = outer - thickness;
            const midRadius = (outer + inner) / 2;

            const total = slices.reduce((sum, slice) => sum + slice.amountMinor, 0);
            const layout = { cx, cy, inner, outer, slices: [] };

            if (total <= 0) {
                ctx.fillStyle = theme.muted;
                ctx.textAlign = "center";
                ctx.fillText("No spending in this period", cx, cy);
                return layout;
            }

            // A 2px surface gap, expressed as the angle that spans 2px at mid-radius.
            const gap = slices.length > 1 ? 2 / midRadius : 0;
            let angle = START_ANGLE;

            for (const slice of slices) {
                const span = (slice.amountMinor / total) * TAU;
                const isActive = active?.key === slice.label;
                const radius = isActive ? outer + 3 : outer;

                // Skip the gap on slivers too small to survive it.
                const inset = span > gap * 2 ? gap / 2 : 0;
                const start = angle + inset;
                const end = angle + span - inset;

                ctx.beginPath();
                ctx.arc(cx, cy, radius, start, end);
                ctx.arc(cx, cy, inner, end, start, true);
                ctx.closePath();
                ctx.fillStyle = seriesColor(theme, slice.slot);
                ctx.fill();

                layout.slices.push({ ...slice, start: angle, end: angle + span, mid: angle + span / 2 });
                angle += span;
            }

            ctx.textAlign = "center";
            if (centerValue) {
                ctx.fillStyle = theme.ink;
                ctx.font = '600 20px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
                ctx.fillText(centerValue, cx, cy - 2);
            }
            if (centerLabel) {
                ctx.fillStyle = theme.muted;
                ctx.font = theme.font;
                ctx.fillText(centerLabel, cx, cy + 16);
            }

            return layout;
        },

        hitTest(point, { layout, data, theme }) {
            const dx = point.x - layout.cx;
            const dy = point.y - layout.cy;
            const distance = Math.hypot(dx, dy);
            if (distance < layout.inner - 2 || distance > layout.outer + 6) return null;

            // Normalize the pointer angle into the same [START_ANGLE, START_ANGLE + 2π) space.
            let angle = Math.atan2(dy, dx);
            while (angle < START_ANGLE) angle += TAU;

            const slice = layout.slices.find((entry) => angle >= entry.start && angle < entry.end);
            if (!slice) return null;

            const radius = (layout.inner + layout.outer) / 2;
            const format = data.formatValue ?? String;

            return {
                key: slice.label,
                x: layout.cx + Math.cos(slice.mid) * radius,
                y: layout.cy + Math.sin(slice.mid) * radius,
                node: tooltipContent(slice.label, [
                    { label: "Spent", value: format(slice.amountMinor), color: seriesColor(theme, slice.slot) },
                    { label: "Share", value: `${Math.round(slice.share * 1000) / 10}%` }
                ])
            };
        }
    });
}
