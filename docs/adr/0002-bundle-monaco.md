# 2. Bundle the Monaco editor

## Status

Accepted

## Context

The JSONata playground (`web-console-v2/src/components/JsonPlay/JSONataPlayground.tsx`) renders Monaco through `@monaco-editor/react`. By default its loader downloads Monaco at page load from `https://cdn.jsdelivr.net`, at a version hardcoded in `@monaco-editor/loader`, not one this repo chooses, and with no integrity check. When `helmet()` was enabled in 2.2.0, its default Content-Security-Policy (`script-src 'self'`) blocked that download, so the playground stayed on "Loading..." indefinitely. The editor shows the same endless "Loading..." whenever the CDN is unreachable, because the loader's failure is only logged to the console.

Two fixes were possible: allow `https://cdn.jsdelivr.net` in the CSP, or bundle Monaco with the app.

## Decision

- Monaco is a pinned dependency (`monaco-editor` `0.57.0`) and is bundled into the build. `monacoSetup.ts` calls `loader.config({ monaco })` with the bundled copy before the playground renders, so nothing is fetched from a CDN. `0.57.0` is the first release whose bundled DOMPurify (`3.4.15`) clears the moderate advisories present in `0.55.1`'s `3.2.7`.
- Monaco ships its own copy of DOMPurify inside its build (`esm/vs/base/browser/dompurify/dompurify.js`) and never imports the npm `dompurify` package, so an npm `overrides` entry for `dompurify` would change what scanners report without changing the code that runs. The DOMPurify version only moves by upgrading Monaco.
- From `0.56`, Monaco's `typings` field points at a file the package doesn't ship, and its types are reachable only through `exports`, which TypeScript's `moduleResolution: node` ignores. `src/monaco-editor.d.ts` points `monaco-editor` at `esm/vs/index.d.ts`. Worker files are addressed through the same `exports` map (`monaco-editor/language/json/json.worker`), which webpack honours.
- Monaco's web workers are bundled too. Without `MonacoEnvironment.getWorker`, Monaco has no location for its base editor worker and runs that work on the main thread. `window.MonacoEnvironment.getWorker` therefore maps every label to its worker (JSON, CSS, HTML, TypeScript/JavaScript, and the base editor worker for everything else), each created with `new Worker(new URL(..., import.meta.url))` so webpack emits them as same-origin files under `/console/static/`. That factory lives in `monacoWorkers.ts`, apart from `monacoSetup.ts`, because jest can't parse `import.meta`; tests mock it and check that `monacoSetup.ts` passes the bundled Monaco to the loader. No worker is created from a `blob:` URL.
- The playground is loaded with `React.lazy` through `LazyJSONataPlayground`, so Monaco and `monacoSetup` sit in their own chunk that is only downloaded when a playground opens; every other page, including login, loads without it. If that chunk fails to load, the popover says the editor couldn't be loaded and offers Try again, which re-requests the chunk without reloading the page, and Close, which returns to the form. Both keep what the user typed. React caches a rejected lazy component, so a retry creates a new one and later mounts use it. Only a `ChunkLoadError` gets this; an error thrown by the editor itself shows a generic message with Close, since retrying the download wouldn't help.
- The CSP stays at helmet's default: the `cdn.jsdelivr.net` and `blob:` allowances from this PR's first attempt were dropped, so scripts and workers load only from `'self'`, which covers the bundled editor, its workers, its CSS and its font.
- The unused `resize-observer-polyfill` script tag that `public/index.html` loaded from the same CDN is removed; `ResizeObserver` is native in every supported browser.

## Consequences

The frontend build is larger by Monaco's size. It imports the public `monaco-editor` entry rather than internal paths, so it includes every language Monaco ships; the workers for languages the playground never uses (TypeScript, CSS, HTML) are emitted as files but only load if a model in that language is created. The playground works offline, behind proxies that block jsdelivr, and under the default CSP. Upgrading Monaco is a dependency bump that goes through review and the build, rather than a change on the CDN. `package-lock.json` is still gitignored, so `@monaco-editor/loader` is resolved fresh on each build; that no longer affects which Monaco runs, because the bundled copy is passed in explicitly. `monaco-editor`'s bundled DOMPurify `3.4.15` still has two low-severity advisories; they clear only with a Monaco release that ships a newer copy.

## Related decision: drop `upgrade-insecure-requests` from the CSP

This is separate from bundling Monaco; it came up while testing the fix on a plain-HTTP deployment.

### Context

helmet's default CSP includes `upgrade-insecure-requests`. The console is served over plain HTTP as well as HTTPS, and on a plain-HTTP origin that directive makes the browser request every asset over HTTPS, so the page loads blank.

### Decision

- `src/app.ts` sets `upgradeInsecureRequests: null`. That is the only change from helmet's default directives: `script-src 'self'` and the rest are unchanged.
- `helmet()` is applied once, in `src/app.ts`. `src/index.ts` used the same express app and applied a second copy whose directives spread helmet's defaults; as the later middleware its header replaced the one from `src/app.ts`, putting `upgrade-insecure-requests` back, so it is removed.

### Consequences

On an HTTPS deployment, an absolute `http://` sub-resource or fetch URL is now blocked as mixed content instead of being upgraded to `https://`. There are none today: the console's assets are relative paths and its API calls go through same-origin proxies. Any absolute URL added later, for example an embedded Grafana built from a configured `http://` URL, has to use `https://` when the console is served over HTTPS. HSTS is still set (`max-age` of one year, `includeSubDomains`), so a browser that has reached a host over HTTPS keeps using HTTPS for it for a year.
