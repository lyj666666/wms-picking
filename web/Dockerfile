FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# 核心：将 /api 请求转发给后端的 server 容器
RUN echo "server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files \$uri \$uri/ /index.html; } location /api { proxy_pass http://server:3001; } }" > /etc/nginx/conf.d/default.conf
EXPOSE 80