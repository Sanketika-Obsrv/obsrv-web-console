# Stage 1 - Build the React client
FROM --platform=linux/amd64 node:20.10-alpine AS client-build
WORKDIR /opt/app/client
COPY ./client/package.json .
RUN npm install --legacy-peer-deps
COPY ./client/ .
RUN npm run build

# Stage 2 - Build the React client v2
FROM --platform=linux/amd64 node:20.10-alpine AS clientv2-build
WORKDIR /opt/app/web-console-v2
COPY ./web-console-v2/package.json .
RUN npm install --legacy-peer-deps
COPY ./web-console-v2/ .
RUN npm run build

# Stage 2 - Run the Node.js server
FROM --platform=linux/amd64 node:20.10-alpine AS server-build
WORKDIR /opt/app/server
COPY ./package.json .
RUN npm install
COPY . .
COPY LICENSE /opt/app/LICENSE
COPY --from=client-build /opt/app/client/build ./src/build
COPY --from=clientv2-build /opt/app/web-console-v2/build ./src/buildV2
RUN rm -rf /opt/app/server/client
RUN rm -rf /opt/app/server/web-console-v2
CMD ["npm", "run", "start"]
