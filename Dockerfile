
# Stage 1 - Build the React client and Node.js server
FROM dhi.io/node:24-debian13-dev AS build

# Build React client v2
WORKDIR /opt/app/web-console-v2
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

# Stage 2 - Run the Node.js server (DHI distroless runtime, non-root by default)
FROM dhi.io/node:24-debian13
WORKDIR /opt/app/server
COPY --from=build --chown=node:node /opt/app/server /opt/app/server
COPY --from=build --chown=node:node /opt/app/LICENSE /opt/app/LICENSE
# start:prod is `node ./dist/index.js` — run it directly (no shell/npm in the distroless runtime)
CMD ["node", "./dist/index.js"]
