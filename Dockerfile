
# Stage 1 - Build the React client v2
FROM --platform=linux/amd64 node:23.4-alpine AS clientv2-build
WORKDIR /opt/app/web-console-v2
COPY ./web-console-v2/package.json .
RUN npm install --legacy-peer-deps
COPY ./web-console-v2/ .
RUN npm run build

# Stage 2 - Run the Node.js server
FROM --platform=linux/amd64 node:23.4-alpine AS server-build
WORKDIR /opt/app/server
COPY ./package.json .
RUN npm install
COPY . .
COPY LICENSE /opt/app/LICENSE
COPY --from=clientv2-build /opt/app/web-console-v2/build ./src/build
RUN rm -rf /opt/app/server/web-console-v2
CMD ["npm", "run", "start"]
