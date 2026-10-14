# --- build: instala dependências e gera o dist/ puro (estático) ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_URL é embutida no bundle em tempo de build (código roda no navegador do usuário).
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- produção: só os arquivos estáticos, servidos pelo nginx ---
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
