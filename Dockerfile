# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=lts
FROM node:${NODE_VERSION} AS base

LABEL fly_launch_runtime="Bun"

# Bun app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3

# Install node modules
COPY --link package-lock.json package.json ./
RUN npm ci

# Copy application code
COPY --link . .

# Build application
RUN npm run build

# Final stage for app image
FROM base
ARG HOST=0.0.0.0
ARG PORT=4321

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
ENV HOST=${HOST}
ENV PORT=${PORT}
EXPOSE ${PORT}
CMD [ "bun", "run", "--bun", "start" ]
