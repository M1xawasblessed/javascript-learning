/**
 * Axis scaling.
 *
 * Ticks land on 1 / 2 / 5 × 10ⁿ ("nice numbers", Heckbert 1990) so an axis reads
 * 0 / 500 / 1,000 / 1,500 instead of 0 / 437 / 874 / 1,311.
 */

/** Round a number to a "nice" one, either down to the containing step or up. */
export function niceNumber(range, round) {
    if (range <= 0) return 0;

    const exponent = Math.floor(Math.log10(range));
    const fraction = range / 10 ** exponent;

    let niceFraction;
    if (round) {
        niceFraction = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10;
    } else {
        niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    }

    return niceFraction * 10 ** exponent;
}

/**
 * A rounded axis covering `[min, max]` with about `tickCount` intervals.
 * Returns the padded bounds, the step, and the tick values themselves.
 */
export function niceScale(min, max, tickCount = 4) {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, step: 1, ticks: [0, 1] };

    let low = Math.min(min, max);
    let high = Math.max(min, max);

    if (low === high) {
        // A flat series still needs a visible axis around its single value.
        if (low === 0) return { min: 0, max: 1, step: 1, ticks: [0, 1] };
        low = Math.min(0, low);
        high = Math.max(0, high);
    }

    const step = niceNumber((high - low) / Math.max(1, tickCount), true) || 1;
    const niceMin = Math.floor(low / step) * step;
    const niceMax = Math.ceil(high / step) * step;

    const ticks = [];
    // Accumulate with a guard against floating-point creep past the last tick.
    for (let value = niceMin; value <= niceMax + step * 0.5; value += step) {
        ticks.push(Math.round(value * 1e6) / 1e6);
    }

    return { min: niceMin, max: niceMax, step, ticks };
}

/** Map a value from a data range onto a pixel range. */
export function scaleLinear(value, domainMin, domainMax, rangeMin, rangeMax) {
    if (domainMax === domainMin) return rangeMin;
    return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
