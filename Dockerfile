FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js telemetry is disabled
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 65532 nodejs
RUN adduser --system --uid 65532 nextjs

RUN apk add --no-cache docker-cli

# Install Prisma CLI globally to run db push on startup
RUN npm install -g prisma@6.19.3

COPY --from=builder /app/public ./public
# Copy Prisma schema
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Copy Xray gRPC proto files
COPY --from=builder --chown=nextjs:nodejs /app/src/proto ./src/proto

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create start script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'chmod 777 /app/xray 2>/dev/null || true' >> /app/start.sh && \
    echo 'chown root:root /app/xray/config.json 2>/dev/null || true' >> /app/start.sh && \
    echo 'chmod 444 /app/xray/config.json 2>/dev/null || true' >> /app/start.sh && \
    echo 'echo "Syncing database..."' >> /app/start.sh && \
    echo 'prisma db push --accept-data-loss --skip-generate' >> /app/start.sh && \
    echo 'echo "Starting NadamuDash..."' >> /app/start.sh && \
    echo 'exec node server.js' >> /app/start.sh && \
    chown nextjs:nodejs /app/start.sh && \
    chmod +x /app/start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/start.sh"]
