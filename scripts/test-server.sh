#!/bin/bash

echo "Testing server on port 3000..."
timeout 5 curl -s "http://localhost:3000/api/health" || echo "Request timed out or failed"
