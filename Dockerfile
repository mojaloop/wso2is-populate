FROM node:15-alpine3.13 AS builder

RUN apk update && apk add git

WORKDIR /src

COPY ./package.json ./package-lock.json /src/

RUN npm ci

FROM node:15-alpine3.13

WORKDIR /src
CMD ["node", "/src/index.js"]

COPY --from=builder /src /src
COPY ./src /src/
