FROM node:lts-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY backend/package*.json ./backend/
RUN npm install --prefix backend
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
RUN chown -R node /usr/src/app
USER node
CMD ["npm", "start"]