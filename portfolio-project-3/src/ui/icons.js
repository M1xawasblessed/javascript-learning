/**
 * Inline SVG icons.
 *
 * Drawn from path data instead of an icon font or sprite sheet: no extra request, no
 * flash of missing glyphs, and `currentColor` means every icon inherits the ink of the
 * element it sits in. Icons are decorative here — every one is paired with a text
 * label or an `aria-label` on the control itself.
 */

import { svg } from "../core/dom.js";

const PATHS = {
    wallet: ["M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M16 12h3", "M3 9h16"],
    dashboard: ["M4 4h7v7H4z", "M13 4h7v4h-7z", "M13 10h7v10h-7z", "M4 13h7v7H4z"],
    list: ["M8 6h12", "M8 12h12", "M8 18h12", "M4 6h.01", "M4 12h.01", "M4 18h.01"],
    target: ["M12 3a9 9 0 1 0 9 9", "M12 7a5 5 0 1 0 5 5", "M12 12l7-7", "M16 5h3v3"],
    settings: ["M4 7h10", "M18 7h2", "M4 17h6", "M14 17h6", "M16 5v4", "M12 15v4"],
    plus: ["M12 5v14", "M5 12h14"],
    search: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z", "M20 20l-4-4"],
    download: ["M12 4v10", "M8 11l4 4 4-4", "M4 19h16"],
    upload: ["M12 15V5", "M8 8l4-4 4 4", "M4 19h16"],
    trash: ["M4 7h16", "M9 7V5h6v2", "M6 7l1 13h10l1-13", "M10 11v6", "M14 11v6"],
    edit: ["M4 20h4L19 9a2 2 0 0 0-3-3L5 17z", "M14 6l4 4"],
    sun: ["M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "M12 2v2", "M12 20v2", "M2 12h2", "M20 12h2", "M5 5l1.5 1.5", "M17.5 17.5L19 19", "M19 5l-1.5 1.5", "M6.5 17.5L5 19"],
    moon: ["M20 14a8 8 0 1 1-9.5-11 7 7 0 0 0 9.5 11z"],
    monitor: ["M4 5h16v11H4z", "M9 20h6", "M12 16v4"],
    arrowUp: ["M12 19V5", "M6 11l6-6 6 6"],
    arrowDown: ["M12 5v14", "M6 13l6 6 6-6"],
    chevronLeft: ["M14 6l-6 6 6 6"],
    chevronRight: ["M10 6l6 6-6 6"],
    chevronDown: ["M6 9l6 6 6-6"],
    check: ["M5 13l4 4L19 7"],
    alert: ["M12 4l9 16H3z", "M12 10v4", "M12 17h.01"],
    close: ["M6 6l12 12", "M18 6L6 18"],
    info: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 11v5", "M12 8h.01"],
    inbox: ["M4 13h4l2 3h4l2-3h4", "M5 5h14l2 8v6H3v-6z"],
    refresh: ["M4 12a8 8 0 0 1 13.7-5.7L20 8", "M20 4v4h-4", "M20 12a8 8 0 0 1-13.7 5.7L4 16", "M4 20v-4h4"]
};

export function icon(name, { size = 16, className = "" } = {}) {
    const paths = PATHS[name] ?? PATHS.info;

    return svg(
        "svg",
        {
            width: size,
            height: size,
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": 1.75,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            "aria-hidden": "true",
            focusable: "false",
            class: className
        },
        ...paths.map((d) => svg("path", { d }))
    );
}

export const iconNames = Object.keys(PATHS);
