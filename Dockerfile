FROM node:20-alpine AS build

WORKDIR /app

# Copy config files
COPY package.json yarn.lock ./

ARG port
RUN echo "nodeLinker: node-modules" > .yarnrc.yml \
    && corepack enable \
    && corepack enable yarn \
    && yarn install --immutable \
    && yarn -v

COPY ./dist ./dist

EXPOSE $port

# Start the app using serve command
ENTRYPOINT [ "node", "/app/dist/server.js" ]
