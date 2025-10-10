#!/bin/bash

# Centralized Environment Configuration Script
# This script allows you to set ports from one location

# Default values
DEFAULT_BACKEND_PORT=3001
DEFAULT_FRONTEND_PORT=4201

# Override with environment variables if set, otherwise use defaults
BACKEND_PORT=${PORT:-$DEFAULT_BACKEND_PORT}
FRONTEND_PORT=${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}

# Export all variables
export PORT=$BACKEND_PORT
export FRONTEND_PORT=$FRONTEND_PORT
export BACKEND_URL="http://localhost:$BACKEND_PORT"
export FRONTEND_URL="http://localhost:$FRONTEND_PORT"
export ALLOWED_ORIGINS="http://localhost:$FRONTEND_PORT,http://127.0.0.1:$FRONTEND_PORT"

echo "🚀 Environment Configuration:"
echo "📍 Backend Port: $PORT"
echo "🌐 Frontend Port: $FRONTEND_PORT"
echo "🔗 Backend URL: $BACKEND_URL"
echo "🔗 Frontend URL: $FRONTEND_URL"
echo ""
echo "To change ports, modify this script or set environment variables:"
echo "  export PORT=3001 FRONTEND_PORT=4201"
echo ""
echo "Now you can run: npm run dev:full"
