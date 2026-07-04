# Reader SPA — built with the pinned Node/pnpm, served as static files by nginx.
# Build context is the repo ROOT (it's a pnpm workspace). See docker-compose.yaml.
FROM node:24-slim AS build
RUN corepack enable
WORKDIR /repo

# Workspace metadata + members needed for a frozen install.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY reader ./reader
COPY desktop/package.json ./desktop/package.json

RUN pnpm install --frozen-lockfile
RUN pnpm --filter reader build

FROM nginx:alpine
COPY reader/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/reader/dist /usr/share/nginx/html
EXPOSE 80
