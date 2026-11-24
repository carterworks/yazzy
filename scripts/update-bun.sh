#!/usr/bin/env bash
# Pin Bun to one version everywhere: the Dockerfile (what Fly builds with),
# nix/bun-hashes.json (what the dev shell downloads) and @types/bun.
# Usage: scripts/update-bun.sh [version]   (defaults to the latest release)
set -euo pipefail
cd "$(dirname "$0")/.."

version="${1:-}"
if [[ -z "$version" ]]; then
  latest_url=$(curl -fsSLo /dev/null -w '%{url_effective}' https://github.com/oven-sh/bun/releases/latest)
  version="${latest_url##*/bun-v}"
fi
version="${version#v}"

if ! curl -fsSo /dev/null "https://hub.docker.com/v2/repositories/oven/bun/tags/$version"; then
  echo "oven/bun:$version is not on Docker Hub yet, so Fly could not build it" >&2
  exit 1
fi

hash() {
  local url="https://github.com/oven-sh/bun/releases/download/bun-v$version/bun-$1.zip"
  nix hash convert --hash-algo sha256 --to sri "$(nix-prefetch-url --type sha256 "$url" 2>/dev/null)"
}

cat > nix/bun-hashes.json <<JSON
{
	"version": "$version",
	"aarch64-darwin": "$(hash darwin-aarch64)",
	"aarch64-linux": "$(hash linux-aarch64)",
	"x86_64-linux": "$(hash linux-x64-baseline)"
}
JSON

# -i.bak keeps this portable between GNU and BSD sed.
sed -i.bak "s/^ARG BUN_VERSION=.*/ARG BUN_VERSION=$version/" Dockerfile && rm Dockerfile.bak

nix develop --command bun add --dev "@types/bun@^$version"

echo "Bun pinned to $version"
