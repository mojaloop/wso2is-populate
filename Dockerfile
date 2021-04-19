FROM node:15-alpine3.13 AS builder

WORKDIR /src

COPY ./package.json ./package-lock.json /src/

RUN npm ci --production

CMD ["node", "/src/index.js"]

COPY ./src /src/
