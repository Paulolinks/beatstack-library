FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ARG BEATSTACK_APP_MODE=library
ARG NEXT_PUBLIC_BEATSTACK_APP_MODE=library
ENV BEATSTACK_APP_MODE=$BEATSTACK_APP_MODE
ENV NEXT_PUBLIC_BEATSTACK_APP_MODE=$NEXT_PUBLIC_BEATSTACK_APP_MODE
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# /app/prisma é o volume do banco: o schema de lá fica preso na versão antiga.
COPY --from=builder /app/prisma/schema.prisma ./prisma-schema/schema.prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p storage prisma

EXPOSE 3000

CMD ["sh", "-c", "node ./node_modules/prisma/build/index.js db push --schema=./prisma-schema/schema.prisma --skip-generate && exec node server.js"]
