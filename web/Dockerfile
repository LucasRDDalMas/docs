# Stage 1: production dependencies only (used by runner)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: full build (includes devDependencies for build tools)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Non-sensitive build args (org name, repo name, docs path)
ARG GITHUB_OWNER
ARG GITHUB_REPO
ARG GITHUB_DOCS_ROOT=doc

# GITHUB_TOKEN passed as a BuildKit secret — never baked into a layer
RUN --mount=type=secret,id=github_token \
    GITHUB_TOKEN="$(cat /run/secrets/github_token)" \
    GITHUB_OWNER="${GITHUB_OWNER}" \
    GITHUB_REPO="${GITHUB_REPO}" \
    GITHUB_DOCS_ROOT="${GITHUB_DOCS_ROOT}" \
    npm run build:search
RUN npm run build

# Stage 3: lean production image
FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy the standalone server
COPY --from=builder /app/.next/standalone ./
# Copy static assets where Next.js standalone expects them
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
