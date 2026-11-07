# ===============================
# Stage 1: Build the application
# ===============================
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

# Verify upload module files exist before building
RUN ls -la src/shared/modules/upload/ && \
    test -f src/shared/modules/upload/upload.module.ts || (echo "ERROR: upload.module.ts not found!" && exit 1) && \
    test -f src/shared/modules/upload/services/upload.service.ts || (echo "ERROR: upload.service.ts not found!" && exit 1)

RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm run build 

# ===============================
# Stage 2: Production image
# ===============================
FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist
# Note: env folder is not copied - environment variables should be set via Render's environment variables
# or docker-compose env_file. The ConfigModule will read from process.env if env files don't exist.

ENV NODE_ENV=production
ENV NODE_OPTIONS=--experimental-global-webcrypto

EXPOSE 80

CMD ["node", "dist/src/main.js"]
