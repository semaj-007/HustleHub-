# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim@sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9 AS build
WORKDIR /app
COPY backend/package*.json ./
RUN --mount=type=secret,id=proxy_ca if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; npm ci --strict-ssl=true --no-audit --no-fund
COPY backend/server.js ./server.js
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY backend/test ./test
RUN npm run build
FROM node:24-bookworm-slim@sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9 AS production-dependencies
WORKDIR /app
COPY backend/package*.json ./
RUN --mount=type=secret,id=proxy_ca if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; npm ci --omit=dev --strict-ssl=true --no-audit --no-fund && npm cache clean --force
FROM node:24-bookworm-slim@sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9
WORKDIR /app
ENV NODE_ENV=production PORT=8443
COPY --chown=node:node --from=production-dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 8443
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=6 CMD ["node", "-e", "require('https').get({hostname:'localhost',port:8443,path:'/api/ready',ca:require('fs').readFileSync(process.env.HTTPS_CERT_PATH)},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]
CMD ["node", "server.js"]
