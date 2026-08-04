/**
 * Shared canvas-chart plumbing.
 *
 * Each chart module supplies two pure-ish callbacks — `render` draws and returns a
 * layout, `hitTest` turns a pointer position into a tooltip — and this module deals
 * with everything that is the same for all of them:
 *
 *   - device-pixel-ratio scaling, so nothing is blurry on a retina screen;
 *   - re-drawing on container resize (`ResizeObserver`, coalesced into one frame);
 *   - re-drawing when the theme changes, re-reading colours from CSS;
 *   - the hover layer: pointer tracking, the active mark, and tooltip placement.
 */

import { h } from "../../core/dom.js";

const CANVAS_FONT = '12px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** The event the app fires after flipping `data-theme`, so charts can repaint. */
export const THEME_CHANGE_EVENT = "fintrack:themechange";

/**
 * Read the palette out of CSS custom properties.
 * Colours therefore live in exactly one place: `assets/css/tokens.css`.
 */
export function readTheme(element) {
    const styles = getComputedStyle(element);
    const value = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;

    return {
        surface: value("--surface-1", "#ffffff"),
        ink: value("--text-primary", "#0b0b0b"),
        secondary: value("--text-secondary", "#52514e"),
        muted: value("--text-muted", "#898781"),
        grid: value("--chart-grid", "#e1e0d9"),
        axis: value("--chart-axis", "#c3c2b7"),
        accent: value("--accent", "#2a78d6"),
        positive: value("--text-positive", "#006300"),
        negative: value("--text-negative", "#a51f1f"),
        font: CANVAS_FONT,
        series: Array.from({ length: 9 }, (_, slot) => value(`--series-${slot}`, "#898781"))
    };
}

/** Colour for a category slot (`0` is the neutral "Other" slot). */
export function seriesColor(theme, slot) {
    return theme.series[slot] ?? theme.series[0];
}

/**
 * Create a canvas chart inside `container`.
 *
 * `render(ctx, { width, height, theme, data, active })` must return a layout object;
 * `hitTest(point, { layout, data, theme })` returns `{ key, x, y, node }` or `null`.
 */
export function createCanvasChart(container, { render, hitTest, height = 240, ariaLabel = "" }) {
    const canvas = h("canvas", { class: "chart__canvas", role: "img", "aria-label": ariaLabel });
    const tooltip = h("div", { class: "chart__tooltip", "data-visible": "false", role: "presentation" });

    container.classList.add("chart__canvas-wrap");
    container.replaceChildren(canvas, tooltip);

    const context = canvas.getContext("2d");
    let data = null;
    let layout = null;
    let active = null;
    let frame = null;
    let destroyed = false;

    function paint() {
        frame = null;
        if (destroyed || data === null) return;

        const cssWidth = Math.max(1, container.clientWidth);
        const cssHeight = typeof height === "function" ? height(cssWidth) : height;
        const ratio = Math.min(globalThis.devicePixelRatio || 1, 3);

        // The canvas is sized in device pixels but drawn in CSS pixels.
        canvas.width = Math.round(cssWidth * ratio);
        canvas.height = Math.round(cssHeight * ratio);
        canvas.style.height = `${cssHeight}px`;

        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, cssWidth, cssHeight);
        context.font = CANVAS_FONT;
        context.textBaseline = "middle";

        const theme = readTheme(container);
        layout = render(context, { width: cssWidth, height: cssHeight, theme, data, active });
    }

    function schedule() {
        if (frame === null && !destroyed) frame = requestAnimationFrame(paint);
    }

    function hideTooltip() {
        tooltip.dataset.visible = "false";
        if (active !== null) {
            active = null;
            schedule();
        }
    }

    function onPointerMove(event) {
        if (!hitTest || !layout) return;

        const bounds = canvas.getBoundingClientRect();
        const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
        const hit = hitTest(point, { layout, data, theme: readTheme(container) });

        if (!hit) {
            hideTooltip();
            return;
        }

        if (!active || active.key !== hit.key) {
            active = hit;
            schedule();
        }

        tooltip.replaceChildren(hit.node);
        tooltip.dataset.visible = "true";
        // Keep the tooltip inside the container: it is centred on the mark, then clamped.
        const halfWidth = tooltip.offsetWidth / 2;
        const left = Math.min(Math.max(hit.x, halfWidth + 4), container.clientWidth - halfWidth - 4);
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${Math.max(hit.y - 10, tooltip.offsetHeight + 4)}px`;
    }

    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(container);

    const media = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener?.("change", schedule);
    document.addEventListener(THEME_CHANGE_EVENT, schedule);

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", hideTooltip);
    canvas.addEventListener("pointercancel", hideTooltip);

    return {
        /** Replace the data and repaint on the next frame. */
        update(nextData, nextAriaLabel) {
            data = nextData;
            if (nextAriaLabel) canvas.setAttribute("aria-label", nextAriaLabel);
            active = null;
            hideTooltip();
            schedule();
        },
        destroy() {
            destroyed = true;
            if (frame !== null) cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            media?.removeEventListener?.("change", schedule);
            document.removeEventListener(THEME_CHANGE_EVENT, schedule);
            canvas.removeEventListener("pointermove", onPointerMove);
            canvas.removeEventListener("pointerleave", hideTooltip);
            canvas.removeEventListener("pointercancel", hideTooltip);
        }
    };
}

/** Tooltip body: a bold title over `label / value` rows, each with its series swatch. */
export function tooltipContent(title, rows) {
    return h(
        "div",
        null,
        h("div", { class: "chart__tooltip-title" }, title),
        ...rows.map((row) =>
            h(
                "div",
                { class: "chart__tooltip-row" },
                h(
                    "span",
                    { class: "chart__tooltip-key" },
                    row.color ? h("span", { class: "legend__swatch", style: { background: row.color } }) : null,
                    row.label
                ),
                h("span", { class: "chart__tooltip-value" }, row.value)
            )
        )
    );
}

/**
 * A rectangle with rounded top corners and a square base — the bar/column spec.
 * Bars grow from the baseline, so only the data end is rounded.
 */
export function barPath(ctx, x, y, width, height, radius = 4) {
    const r = Math.max(0, Math.min(radius, width / 2, Math.abs(height)));
    const bottom = y + height;

    ctx.beginPath();
    ctx.moveTo(x, bottom);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, bottom);
    ctx.closePath();
}
