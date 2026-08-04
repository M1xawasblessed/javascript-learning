/**
 * A tiny predictable state container (the Redux pattern, ~80 lines, no dependencies).
 *
 *   const store = createStore(reducer, initialState, [persistMiddleware]);
 *   store.subscribe((state, action) => render(state));
 *   store.dispatch({ type: "transaction/add", payload: txn });
 *
 * Rules the implementation enforces:
 *   - state is only ever replaced by a reducer, never mutated in place;
 *   - a reducer may not dispatch (that would make the update order undefined);
 *   - subscribers are snapshotted before notification, so unsubscribing inside a
 *     listener can't make the loop skip a neighbour.
 */

/** Dispatched once at creation so reducers can return their default state. */
export const INIT_ACTION = { type: "@@store/init" };

/** `compose(a, b, c)(x)` === `a(b(c(x)))` — used to build the middleware chain. */
export function compose(...functions) {
    if (functions.length === 0) return (value) => value;
    if (functions.length === 1) return functions[0];
    return functions.reduce((a, b) => (...args) => a(b(...args)));
}

export function createStore(reducer, preloadedState, middlewares = []) {
    if (typeof reducer !== "function") {
        throw new TypeError("createStore expects a reducer function");
    }

    let state = preloadedState;
    let isDispatching = false;
    const listeners = new Set();

    function getState() {
        if (isDispatching) {
            throw new Error("getState() cannot be called while a reducer is running");
        }
        return state;
    }

    function baseDispatch(action) {
        if (!action || typeof action.type !== "string") {
            throw new TypeError("Actions must be plain objects with a string `type`");
        }
        if (isDispatching) {
            throw new Error("Reducers must not dispatch actions");
        }

        try {
            isDispatching = true;
            state = reducer(state, action);
        } finally {
            isDispatching = false;
        }

        for (const listener of [...listeners]) listener(state, action);
        return action;
    }

    let dispatch = baseDispatch;

    function subscribe(listener) {
        if (typeof listener !== "function") {
            throw new TypeError("subscribe expects a function");
        }
        listeners.add(listener);
        return () => listeners.delete(listener);
    }

    /**
     * Subscribe to a slice. `onChange` runs only when `selector(state)` changes
     * identity — the cheap alternative to diffing the whole tree on every action.
     */
    function watch(selector, onChange, { immediate = false } = {}) {
        let previous = selector(state);
        if (immediate) onChange(previous, previous);

        return subscribe((nextState) => {
            const next = selector(nextState);
            if (Object.is(next, previous)) return;
            const last = previous;
            previous = next;
            onChange(next, last);
        });
    }

    const store = { getState, subscribe, watch, dispatch: (action) => dispatch(action) };

    // Middleware signature: store => next => action. Each one sees the *outer*
    // dispatch, so a middleware can re-dispatch without bypassing its neighbours.
    if (middlewares.length > 0) {
        const middlewareApi = {
            getState,
            dispatch: (action) => dispatch(action)
        };
        const chain = middlewares.map((middleware) => middleware(middlewareApi));
        dispatch = compose(...chain)(baseDispatch);
    }

    dispatch(INIT_ACTION);
    return store;
}

/** Logs every action and the resulting state — handy while learning, off by default. */
export function createLoggerMiddleware({ logger = console, enabled = true } = {}) {
    return () => (next) => (action) => {
        if (!enabled) return next(action);
        logger.groupCollapsed?.(`action ${action.type}`);
        logger.log?.("payload", action.payload);
        const result = next(action);
        logger.groupEnd?.();
        return result;
    };
}
