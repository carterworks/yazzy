# syntax = docker/dockerfile:1

# Adjust BUN_VERSION as desired
ARG BUN_VERSION=1.2
FROM oven/bun:${BUN_VERSION} AS base

LABEL fly_launch_runtime="Bun"

# Bun app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt update -qq && \
    apt install --no-install-recommends -y build-essential pkg-config python-is-python3

# Install node modules
COPY --link bun.lock package.json ./
RUN bun install --frozen-lockfile

# Copy application code
COPY --link . .

# Build application
RUN bun run build

# Final stage for app image
FROM base
ARG HOST=0.0.0.0
ARG PORT=4321

# Copy built application
COPY --from=build /app/dist /app/dist
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/src/db/migrations /app/src/db/migrations
COPY --from=build /app/package.json /app/package.json

# Start the server by default, this can be overwritten at runtime
ENV HOST=${HOST}
ENV PORT=${PORT}

# Memory management settings for Bun runtime
# BUN_JSC_forceGCSlowPaths=1 makes garbage collection more aggressive
# This helps prevent OOM in memory-constrained containers
ENV BUN_JSC_forceGCSlowPaths=1

EXPOSE ${PORT}
# Use --smol flag for reduced memory footprint
CMD [ "bun", "--smol", "run", "dist/server/entry.mjs" ]
