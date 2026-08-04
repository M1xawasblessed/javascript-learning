/**
 * Entry point.
 *
 * Loaded as `<script type="module">`, so it is deferred by default and the shell in
 * index.html already exists by the time this runs.
 */

import { startApp } from "./app.js";

const app = startApp(document);

// Handy while learning: `window.fintrack.store.getState()` in the console.
globalThis.fintrack = app;
