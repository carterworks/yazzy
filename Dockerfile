FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

FROM base as release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/src/ src/
COPY --from=prerelease /usr/src/app/package.json .

USER bun
EXPOSE 3000/tcp
# TODO: fix error 
# $ bun --define:process.env.NODE_ENV="'production'" ./src/index.ts
# error: Cannot find module "react/jsx-dev-runtime" from "/usr/src/app/src/pages/ClippedPage.tsx"
CMD ["bun", "start"]
