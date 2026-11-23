# 2. Bundle the Monaco editor

## Status

Accepted

## Context

The JSONata playground (`web-console-v2/src/components/JsonPlay/JSONataPlayground.tsx`) renders Monaco through `@monaco-editor/react`. By default its loader downloads Monaco at page load from `https://cdn.jsdelivr.net`, at a version hardcoded in `@monaco-editor/loader`, not one this repo chooses, and with no integrity check. When `helmet()` was enabled in 2.2.0, its default Content-Security-Policy (`script-src 'self'`) blocked that download, so the playground stayed on "Loading..." indefinitely. The editor shows the same endless "Loading..." whenever the CDN is unreachable, because the loader's failure is only logged to the console.

Two fixes were possible: allow `https://cdn.jsdelivr.net` in the CSP, or bundle Monaco with the app.

## Decision

- Monaco is a pinned dependency (`monaco-editor` `0.55.1`, the version the loader was fetching) and is bundled into the build. `monacoSetup.ts` calls `loader.config({ monaco })` with the bundled copy before the playground renders, so nothing is fetched from a CDN.
- Monaco's web workers are bundled too. Without `MonacoEnvironment.getWorker`, Monaco has no location for its base editor worker and runs that work on the main thread. `window.MonacoEnvironment.getWorker` therefore maps every label to its worker (JSON, CSS, HTML, TypeScript/JavaScript, and the base editor worker for everything else), each created with `new Worker(new URL(..., import.meta.url))` so webpack emits them as same-origin files under `/console/static/`. No worker is created from a `blob:` URL.
- The Content-Security-Policy is helmet's default. Scripts and workers load from `'self'`, which covers the bundled editor, its workers, its CSS and its font.
- `helmet()` is applied once, in `src/app.ts`. `src/index.ts` used the same express app and applied an identical second copy.
- The unused `resize-observer-polyfill` script tag that `public/index.html` loaded from the same CDN is removed; `ResizeObserver` is native in every supported browser.

## Consequences

The frontend build is larger by Monaco's size. It imports the public `monaco-editor` entry rather than internal paths, so it includes every language Monaco ships; the workers for languages the playground never uses (TypeScript, CSS, HTML) are emitted as files but only load if a model in that language is created. The playground works offline, behind proxies that block jsdelivr, and under the default CSP. Upgrading Monaco is a dependency bump that goes through review and the build, rather than a change on the CDN. `package-lock.json` is still gitignored, so `@monaco-editor/loader` is resolved fresh on each build; that no longer affects which Monaco runs, because the bundled copy is passed in explicitly.
