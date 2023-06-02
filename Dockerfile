# Stage 1 - Build the React client
FROM --platform=linux/amd64 node:18-alpine AS client-build
WORKDIR /opt/app/client
COPY ./client/package.json .
RUN yarn install
COPY ./client/ .
RUN yarn run build

# Stage 2 - Run the Node.js server
FROM --platform=linux/amd64 node:18-alpine AS server-build
WORKDIR /opt/app/server
COPY  ./package.json .
RUN yarn install
COPY . .
COPY --from=client-build /opt/app/client/build ./src/build
RUN rm -rf /opt/app/server/client
CMD ["npm", "run", "start"]