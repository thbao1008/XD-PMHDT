# services/<service>/Dockerfile - simple Node runtime (production)
FROM node:18-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --production
COPY . .
ENV NODE_ENV=production
EXPOSE 
CMD [""node"", ""src/server.js""]
