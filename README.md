# Atlassian Bitbucket MCP Server

A Model Context Protocol (MCP) server that integrates Atlassian Bitbucket Server/Data Center with AI systems.

## What It Does

This server enables AI systems to interact with Bitbucket repositories by providing:

- Access to projects, repositories, branches, and files
- Tools for working with pull requests
- Type-safe API integration with official Bitbucket OpenAPI specs

## Quick Setup

### Prerequisites

- Node.js (v20+ recommended)
- npm
- Python 3 (for OpenAPI filtering script)
- Bitbucket Server access token

### Installation

```bash
git clone [<atlassian-bitbucket-server-mcp>](https://github.com/guenichone/atlassian-bitbucket-server-mcp)
cd mcp-server-selfhosted-bitbucket
npm install
npm run build-app
```

### Running the Server

```bash
# As STDIO server (default for AI integration)
ATLASSIAN_BITBUCKET_SERVER_URL=https://git.your-company.com/ \
ATLASSIAN_BITBUCKET_ACCESS_TOKEN=your-token \
npm start

# As HTTP/SSE server
MCP_TRANSPORT=sse \
ATLASSIAN_BITBUCKET_SERVER_URL=https://git.your-company.com/ \
ATLASSIAN_BITBUCKET_ACCESS_TOKEN=your-token \
npm start
```

## Docker Usage

### Using Docker CLI

```bash
# Build
docker build -t bitbucket-mcp-server .

# Run
docker run --rm -i \
  -e ATLASSIAN_BITBUCKET_SERVER_URL=https://git.your-company.com/ \
  -e ATLASSIAN_BITBUCKET_ACCESS_TOKEN=your-token \
  bitbucket-mcp-server
```

### Using the Makefile (Recommended)

The project includes a Makefile for simplified Docker operations:

```bash
# Build the Docker image
make docker-build

# Run with your Bitbucket credentials
BITBUCKET_URL=https://git.your-company.com/ BITBUCKET_TOKEN=your-token make docker-run

# Build and run in one command
BITBUCKET_URL=https://git.your-company.com/ BITBUCKET_TOKEN=your-token make docker-all

# View all available make commands and examples
make help
```

## Environment Variables

- `ATLASSIAN_BITBUCKET_SERVER_URL` - Bitbucket server URL
- `ATLASSIAN_BITBUCKET_ACCESS_TOKEN` - Your access token
- `MCP_TRANSPORT` - `stdio` (default) or `sse`
- `PORT` - HTTP port when using SSE (default: 3000)

## Thanks

This project was inspired by [aashari/mcp-server-atlassian-bitbucket](https://github.com/aashari/mcp-server-atlassian-bitbucket).

## License

MIT - See [LICENSE](LICENSE) file for details.
