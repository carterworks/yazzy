#!/bin/bash
# Test script to verify Docker build works correctly

set -e

echo "Testing Docker build..."

# Build the Docker image
docker build -t yazzy-test:latest .

echo "✓ Docker build completed successfully"

# Verify the image exists
if docker image inspect yazzy-test:latest > /dev/null 2>&1; then
    echo "✓ Docker image created successfully"
else
    echo "✗ Docker image not found"
    exit 1
fi

# Test that the entrypoint exists in the image
echo "Verifying build output structure..."
docker run --rm yazzy-test:latest ls -la /app/dist/server/entry.mjs > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Entry point file exists in image"
else
    echo "✗ Entry point file not found"
    exit 1
fi

echo ""
echo "All Docker build tests passed! ✓"
echo ""
echo "To run the container:"
echo "  docker run -p 4321:4321 yazzy-test:latest"

