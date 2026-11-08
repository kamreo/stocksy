FROM node:24-alpine

RUN npm i -g pnpm@12.18.0 && mkdir /app && chown node:node /app

USER node

WORKDIR /app

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node backend/package.json backend/
COPY --chown=node:node frontend/package.json frontend/

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY --chown=node:node . .

RUN pnpm --filter backend exec prisma generate
