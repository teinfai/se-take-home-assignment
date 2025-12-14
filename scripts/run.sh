#!/bin/bash
set -euo pipefail

echo "Running CLI application..."
node cli.js > scripts/result.txt
echo "CLI application execution completed"
echo "Result stored in scripts/result.txt"
