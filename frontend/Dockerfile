# frontend/Dockerfile - build React (Vite) và serve bằng nginx
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# optional: custom nginx conf (placed in infra/nginx)
COPY infra/nginx/frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD [""nginx"", ""-g"", ""daemon off;""] 
