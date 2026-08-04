import test from "node:test";
import assert from "node:assert/strict";

import { compose, createStore, INIT_ACTION } from "../src/core/store.js";

const counter = (state = { value: 0 }, action) =>
    action.type === "inc" ? { value: state.value + (action.payload ?? 1) } : state;

test("createStore seeds state through an init action", () => {
    const seen = [];
    const store = createStore((state = { value: 7 }, action) => {
        seen.push(action.type);
        return state;
    });

    assert.deepEqual(store.getState(), { value: 7 });
    assert.deepEqual(seen, [INIT_ACTION.type]);
});

test("preloaded state wins over the reducer default", () => {
    const store = createStore(counter, { value: 41 });
    store.dispatch({ type: "inc" });
    assert.deepEqual(store.getState(), { value: 42 });
});

test("subscribers receive the new state and the action", () => {
    const store = createStore(counter);
    const calls = [];
    store.subscribe((state, action) => calls.push([state.value, action.type]));

    store.dispatch({ type: "inc", payload: 5 });
    store.dispatch({ type: "unrelated" });

    assert.deepEqual(calls, [
        [5, "inc"],
        [5, "unrelated"]
    ]);
});

test("unsubscribing inside a listener does not skip the next listener", () => {
    const store = createStore(counter);
    const calls = [];

    const off = store.subscribe(() => {
        calls.push("first");
        off();
    });
    store.subscribe(() => calls.push("second"));

    store.dispatch({ type: "inc" });
    store.dispatch({ type: "inc" });

    assert.deepEqual(calls, ["first", "second", "second"]);
});

test("watch only fires when the selected slice changes identity", () => {
    const store = createStore(counter);
    const seen = [];
    store.watch((state) => state.value, (next, previous) => seen.push([previous, next]));

    store.dispatch({ type: "inc" });
    store.dispatch({ type: "noop" });
    store.dispatch({ type: "inc", payload: 2 });

    assert.deepEqual(seen, [
        [0, 1],
        [1, 3]
    ]);
});

test("watch can emit immediately for initial paint", () => {
    const store = createStore(counter, { value: 3 });
    const seen = [];
    store.watch((state) => state.value, (next) => seen.push(next), { immediate: true });

    assert.deepEqual(seen, [3]);
});

test("malformed actions are rejected", () => {
    const store = createStore(counter);
    assert.throws(() => store.dispatch(null), TypeError);
    assert.throws(() => store.dispatch({ payload: 1 }), TypeError);
    assert.throws(() => store.dispatch("inc"), TypeError);
});

test("a reducer may not dispatch", () => {
    let store;
    const reducer = (state = {}, action) => {
        if (action.type === "reenter") store.dispatch({ type: "inc" });
        return state;
    };

    store = createStore(reducer);
    assert.throws(() => store.dispatch({ type: "reenter" }), /must not dispatch/);
});

test("getState is unavailable while a reducer runs", () => {
    let store;
    const reducer = (state = {}, action) => {
        if (action.type === "peek") store.getState();
        return state;
    };

    store = createStore(reducer);
    assert.throws(() => store.dispatch({ type: "peek" }), /cannot be called while a reducer is running/);
});

test("middleware runs outside-in and can transform actions", () => {
    const order = [];

    const outer = () => (next) => (action) => {
        order.push("outer:before");
        const result = next(action);
        order.push("outer:after");
        return result;
    };
    const doubler = () => (next) => (action) =>
        next(action.type === "inc" ? { ...action, payload: (action.payload ?? 1) * 2 } : action);

    const store = createStore(counter, undefined, [outer, doubler]);
    order.length = 0; // drop the init pass, which the next test covers explicitly
    store.dispatch({ type: "inc", payload: 3 });

    assert.equal(store.getState().value, 6);
    assert.deepEqual(order, ["outer:before", "outer:after"]);
});

test("middleware sees the init action only through the store, not before it", () => {
    const types = [];
    const spy = () => (next) => (action) => {
        types.push(action.type);
        return next(action);
    };

    const store = createStore(counter, undefined, [spy]);
    store.dispatch({ type: "inc" });

    assert.deepEqual(types, [INIT_ACTION.type, "inc"]);
});

test("compose applies right to left", () => {
    const add = (n) => (value) => value + n;
    assert.equal(compose(add(1), add(2), add(3))(0), 6);
    assert.equal(compose((value) => value * 2, (value) => value + 1)(3), 8);
    assert.equal(compose()(9), 9);
});

test("createStore validates its reducer", () => {
    assert.throws(() => createStore(null), TypeError);
});
