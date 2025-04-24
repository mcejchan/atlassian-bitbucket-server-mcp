#!/bin/bash

# Check if required environment variables are set
if [ -n "$ATLASSIAN_BITBUCKET_SERVER_URL" ] && [ -n "$ATLASSIAN_BITBUCKET_ACCESS_TOKEN" ]; then
  echo "Using environment variables from Docker"
else
  # Only try to load .env as fallback
  if [ -f .env ]; then
    echo "Loading missing environment variables from .env file"
    export $(cat .env | grep -v "^#" | xargs)
  else
    echo "WARNING: Environment variables not set and no .env file found"
  fi
fi

# Ensure STDIO transport mode
export MCP_TRANSPORT=stdio

# Start the MCP server
exec node dist/index.js "$@"
