#!/bin/bash
set -euo pipefail

echo "Running unit tests..."
npm test
echo "Unit tests completed"
