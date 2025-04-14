#!/bin/bash
if [ -f .env ]; then
  echo "Loading environment variables from .env file"
  export $(cat .env | grep -v "^#" | xargs)
fi

# Start the MCP server
exec node dist/index.js "$@" 