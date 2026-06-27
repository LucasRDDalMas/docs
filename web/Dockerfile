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

# Build args for the search-index script (requires GitHub API access)
ARG GITHUB_TOKEN
ARG GITHUB_OWNER
ARG GITHUB_REPO
ARG GITHUB_DOCS_ROOT=doc
ENV GITHUB_TOKEN=${GITHUB_TOKEN}
ENV GITHUB_OWNER=${GITHUB_OWNER}
ENV GITHUB_REPO=${GITHUB_REPO}
ENV GITHUB_DOCS_ROOT=${GITHUB_DOCS_ROOT}

RUN npm run build:search
RUN npm run build

# Stage 3: lean production image
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy build output, static assets, and prod-only node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

USER node
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
