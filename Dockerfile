
# Stage 1 - Build the React client and Node.js server
FROM --platform=linux/amd64 node:24.13.1-slim AS build
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && apt-get upgrade -y \
 && rm -rf /var/lib/apt/lists/*

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

# Stage 2 - Run the Node.js server
FROM --platform=linux/amd64 node:24.13.1-slim
RUN npm install -g npm@11.10.0 \
 && npm pack tar@7.5.11 \
 && tar -xzf tar-7.5.11.tgz -C /usr/local/lib/node_modules/npm/node_modules/tar --strip-components=1 \
 && rm tar-7.5.11.tgz \
 && npm pack minimatch@10.2.1 \
 && npm pack picomatch@4.0.4 \
 && npm cache clean --force \
 && cp -r /usr/local/lib/node_modules/npm/node_modules/minimatch/node_modules /tmp/minimatch_nm 2>/dev/null || true \
 && tar -xzf minimatch-10.2.1.tgz -C /usr/local/lib/node_modules/npm/node_modules/minimatch --strip-components=1 \
 && cp -r /tmp/minimatch_nm /usr/local/lib/node_modules/npm/node_modules/minimatch/node_modules 2>/dev/null || true \
 && rm -rf /tmp/minimatch_nm minimatch-10.2.1.tgz \
 && mkdir -p /usr/local/lib/node_modules/npm/node_modules/tinyglobby/node_modules/picomatch \
 && tar -xzf picomatch-4.0.4.tgz -C /usr/local/lib/node_modules/npm/node_modules/tinyglobby/node_modules/picomatch --strip-components=1 \
 && rm picomatch-4.0.4.tgz
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && apt-get upgrade -y \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/app/server
COPY --from=build /opt/app/server /opt/app/server
COPY --from=build /opt/app/LICENSE /opt/app/LICENSE
CMD ["npm", "run", "start:prod"]
