# Stage 1 : build des assets statiques
FROM node:20-alpine AS build

WORKDIR /app

# VITE_WS_URL est inliné par Vite au build (import.meta.env.VITE_WS_URL, cf.
# src/ws/WebSocketProvider.tsx). Un chemin relatif ("/ws") fonctionne car le
# constructeur WebSocket() du navigateur résout les URLs relatives contre
# l'origine de la page et réécrit automatiquement http(s) -> ws(s) — donc
# "/ws" derrière nginx sur :80 donne ws://localhost/ws en local (ou via un
# tunnel ngrok pointant sur ce port), et wss://<domaine>/ws une fois nginx
# exposé en TLS derrière un vrai domaine.
ARG VITE_WS_URL=/ws
ENV VITE_WS_URL=${VITE_WS_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2 : juste porteur des fichiers statiques, pas de serveur web ici
# (nginx s'en charge, voir docker-compose.yml + nginx/nginx.conf)
FROM alpine:3.20 AS export
COPY --from=build /app/dist /dist
