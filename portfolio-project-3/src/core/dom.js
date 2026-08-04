/**
 * A hyperscript layer over the DOM.
 *
 * Everything in FinTrack is built with `h()` instead of `innerHTML`. That is not a
 * style preference: user text (a transaction description, a CSV column, an imported
 * category) goes through `document.createTextNode`, so a description of
 * `<img src=x onerror=alert(1)>` renders as literal text and can never execute.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/** Attributes that must be set with `setAttribute` rather than as a property. */
const ATTRIBUTE_ONLY = new Set(["role", "for", "list", "form", "colspan", "rowspan"]);

function applyProps(node, props) {
    for (const [key, value] of Object.entries(props)) {
        if (value === null || value === undefined || value === false) continue;

        if (key === "class" || key === "className") {
            node.setAttribute("class", Array.isArray(value) ? value.filter(Boolean).join(" ") : String(value));
        } else if (key === "style" && typeof value === "object") {
            Object.assign(node.style, value);
        } else if (key === "dataset" && typeof value === "object") {
            Object.assign(node.dataset, value);
        } else if (key === "text") {
            node.append(document.createTextNode(String(value)));
        } else if (key.startsWith("on") && typeof value === "function") {
            node.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key.startsWith("aria-") || key.startsWith("data-") || ATTRIBUTE_ONLY.has(key)) {
            node.setAttribute(key, value === true ? "" : String(value));
        } else if (key in node) {
            node[key] = value;
        } else {
            node.setAttribute(key, value === true ? "" : String(value));
        }
    }
}

function appendChildren(node, children) {
    for (const child of children.flat(Infinity)) {
        if (child === null || child === undefined || child === false || child === true) continue;
        node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
}

/**
 * Create an element.
 *
 *   h("button", { class: "btn", onClick: save, "aria-label": "Save" }, "Save")
 *   h("li", null, h("span", { class: "dot" }), transaction.description)
 */
export function h(tag, props = null, ...children) {
    const node = document.createElement(tag);
    if (props) applyProps(node, props);
    appendChildren(node, children);
    return node;
}

/** Same as `h`, for the SVG namespace (icons, sparklines). */
export function svg(tag, props = null, ...children) {
    const node = document.createElementNS(SVG_NS, tag);
    if (props) {
        for (const [key, value] of Object.entries(props)) {
            if (value === null || value === undefined || value === false) continue;
            if (key.startsWith("on") && typeof value === "function") {
                node.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                node.setAttribute(key === "className" ? "class" : key, String(value));
            }
        }
    }
    appendChildren(node, children);
    return node;
}

/** A detached fragment, for returning several siblings from one function. */
export function fragment(...children) {
    const frag = document.createDocumentFragment();
    appendChildren(frag, children);
    return frag;
}

/** Replace a container's children in a single operation. */
export function mount(container, ...children) {
    container.replaceChildren();
    appendChildren(container, children);
    return container;
}

/**
 * One listener for a whole list instead of one per row.
 * Returns an unsubscribe function.
 */
export function delegate(root, type, selector, handler) {
    const listener = (event) => {
        const target = event.target.closest(selector);
        if (target && root.contains(target)) handler(event, target);
    };
    root.addEventListener(type, listener);
    return () => root.removeEventListener(type, listener);
}

const FOCUSABLE = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type=hidden])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
].join(",");

export function focusableElements(container) {
    return [...container.querySelectorAll(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null || element === document.activeElement
    );
}

/**
 * Keep Tab inside a dialog and restore focus to the opener on release.
 * Without this a keyboard user tabs straight out of an open modal into the page behind it.
 */
export function trapFocus(container) {
    const previouslyFocused = document.activeElement;

    const onKeydown = (event) => {
        if (event.key !== "Tab") return;
        const focusable = focusableElements(container);
        if (focusable.length === 0) {
            event.preventDefault();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    container.addEventListener("keydown", onKeydown);
    focusableElements(container)[0]?.focus();

    return function release() {
        container.removeEventListener("keydown", onKeydown);
        if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
            previouslyFocused.focus();
        }
    };
}

/**
 * Re-render a container without stealing the caret.
 *
 * Views are re-rendered wholesale on every state change; a debounced search box
 * would lose focus mid-word. This restores the focused element by its `id` plus the
 * text selection, which is enough for the handful of persistent inputs in the app.
 */
export function preserveFocus(render) {
    const active = document.activeElement;
    const id = active instanceof HTMLElement ? active.id : "";
    const isTextField = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
    const start = isTextField ? active.selectionStart : null;
    const end = isTextField ? active.selectionEnd : null;

    render();

    if (!id) return;
    const restored = document.getElementById(id);
    if (!restored || restored === document.activeElement) return;

    restored.focus({ preventScroll: true });
    if (start !== null && typeof restored.setSelectionRange === "function") {
        try {
            restored.setSelectionRange(start, end);
        } catch {
            // Number and date inputs throw on setSelectionRange; focus alone is enough.
        }
    }
}

/** Trailing-edge debounce, used for the search field and for persistence. */
export function debounce(fn, delay = 200) {
    let timer = null;

    const debounced = (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            fn(...args);
        }, delay);
    };

    debounced.cancel = () => {
        clearTimeout(timer);
        timer = null;
    };

    return debounced;
}
