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
COPY --from=builder --chown=nextjs:nodejs /app/bin ./bin
COPY --from=builder --chown=nextjs:nodejs /app/entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/bin/* /app/entrypoint.sh && \
    ln -sf /app/bin/utka /usr/local/bin/utka

USER nextjs

EXPOSE 3000 8008

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/entrypoint.sh"]
