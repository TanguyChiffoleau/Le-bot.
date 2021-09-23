FROM node:16.10.0-alpine3.13
RUN apk add dumb-init
ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY --chown=node:node . ./
RUN npm ci --only=production

USER node
CMD ["dumb-init", "node", "src/index.js"]
