# DHI hardened build. Runtime uses the minimal shell-less debian variant — this service
# compiles to dist/ and starts via plain `node`, so no shell/npm is needed at runtime.
ARG BUILD_IMAGE=dhi.io/node:24-debian13-dev
ARG RUNTIME_IMAGE=dhi.io/node:24-debian13

# Stage 1 - Build the React client and Node.js server
FROM ${BUILD_IMAGE} AS build

# Production build settings: no source maps (smaller, no source leak, big memory saver on
# emulated builds), skip the eslint plugin pass. Keeps peak RSS down for multi-arch builds.
ENV GENERATE_SOURCEMAP=false
ENV DISABLE_ESLINT_PLUGIN=true
ENV NODE_OPTIONS=--max-old-space-size=3072

# Build React client v2 with the app's own build (react-scripts, as before DHI). craco was
# never part of the original build (git history + package.json use `react-scripts build`), so
# it's dropped. `npm run build` runs react-scripts + the package.json `postbuild` script, which
# already does `mkdir build/console && mv build/static build/console/static` — so no inline move.
WORKDIR /opt/app/web-console-v2
# package.json overrides cap webpack-dev-server <6 (v6 pulls express5 -> parseurl -> node:url,
# which webpack5 won't polyfill -> react-scripts build fails). npm install resolves the capped set.
COPY ./web-console-v2/package.json .
RUN npm install --legacy-peer-deps
COPY ./web-console-v2/ .
RUN npm run build

# Build Node.js server
WORKDIR /opt/app/server
COPY ./package.json .
RUN npm install
COPY . .
RUN npm run build
COPY LICENSE /opt/app/LICENSE
RUN cp -r /opt/app/web-console-v2/build /opt/app/server/dist/build
RUN rm -rf /opt/app/server/web-console-v2
RUN npm prune --omit=dev

# Stage 2 - Runtime (minimal, shell-less, non-root)
FROM ${RUNTIME_IMAGE}
WORKDIR /opt/app/server
COPY --chown=node:node --from=build /opt/app/server /opt/app/server
COPY --chown=node:node --from=build /opt/app/LICENSE /opt/app/LICENSE
USER node
CMD ["node", "./dist/index.js"]
