# Stage 1 - Build the React client
FROM --platform=linux/amd64 node:20.10-alpine AS client-build
WORKDIR /opt/app/client
COPY ./client/package.json .
RUN npm install --legacy-peer-deps
COPY ./client/ .
RUN npm run build

# Stage 2 - Run the Node.js server
FROM --platform=linux/amd64 node:20.10-alpine AS server-build
WORKDIR /opt/app/server
COPY ./package.json .
RUN npm install
COPY . .
COPY LICENSE /opt/app/LICENSE
COPY --from=client-build /opt/app/client/build ./src/build
RUN rm -rf /opt/app/server/client
CMD ["npm", "run", "start"]
