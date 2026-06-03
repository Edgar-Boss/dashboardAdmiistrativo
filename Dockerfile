# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM nginx:1.27-alpine AS runtime

# Used by envsubst in the entrypoint
RUN apk add --no-cache gettext

COPY --from=build /app/dist/ /usr/share/nginx/html/

COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

ENV API_UPSTREAM=http://host.docker.internal:8080
EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]

