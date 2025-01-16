# syntax = docker/dockerfile:1

# Adjust BUN_VERSION as desired
ARG BUN_VERSION=1.1
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
COPY --link bun.lockb package.json ./
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
COPY --from=build /app/dist/yazzy /app/yazzy

# Start the server by default, this can be overwritten at runtime
ENV HOST=${HOST}
ENV PORT=${PORT}
EXPOSE ${PORT}
CMD [ "./yazzy" ]
