# Atlassian Bitbucket MCP Server

A Model Context Protocol (MCP) server for Atlassian Bitbucket integration.  
Supports CLI, STDIO, SSE/HTTP, and Dockerized deployments.  
Compatible with Dive AI, MCP Inspector, and other MCP clients.

---

## Features

- **Bitbucket Server/Datacenter Integration**: Exposes Bitbucket projects, repositories, branches, commits, and file content as MCP tools.
- **MCP Protocol Support**: Works as a standalone MCP server (STDIO/SSE/HTTP) or as a CLI tool.
- **Docker Support**: Easily build and run as a Docker container for consistent environments.
- **Configurable**: Uses environment variables for Bitbucket server URL and access token.
- **Robust Logging**: Logs to both stdout and rotating log files.

---

## Quick Start

### 1. Prerequisites

- Node.js (v18+ recommended)
- npm
- Bitbucket Server/Datacenter instance and a valid access token

### 2. Clone and Install

```bash
git clone <this-repo-url>
cd mcp-server-selfhosted-bitbucket
npm install
```

### 3. Build

```bash
npm run build
```

### 4. Run (STDIO/SSE/CLI)

#### As MCP Server (STDIO, default)

```bash
ATLASSIAN_BITBUCKET_SERVER_URL=https://git.repo.com/ \
ATLASSIAN_BITBUCKET_ACCESS_TOKEN=your-token \
npm start
```

#### As HTTP/SSE Server

```bash
MCP_TRANSPORT=sse \
ATLASSIAN_BITBUCKET_SERVER_URL=https://git.repo.com/ \
ATLASSIAN_BITBUCKET_ACCESS_TOKEN=your-token \
npm start
```
Server will listen on port 3000 by default.

#### As CLI

```bash
npm run cli -- help
```
or
```bash
node dist/src/index.js help
```

---

## Docker Usage

### Build the Docker Image

```bash
docker build -t bitbucket-mcp-server:latest .
```

### Run the Container

```bash
docker run --rm -i \
  -e ATLASSIAN_BITBUCKET_SERVER_URL=https://git.repo.com/ \
  -e ATLASSIAN_BITBUCKET_ACCESS_TOKEN=your-token \
  bitbucket-mcp-server:latest
```

---

## Integration with Dive AI

**Recommended Docker config for Dive:**

```json
"bitbucket-local": {
  "command": "docker",
  "args": [
    "run", "--rm", "-i",
    "-e", "ATLASSIAN_BITBUCKET_SERVER_URL=https://git.repo.com/",
    "-e", "ATLASSIAN_BITBUCKET_ACCESS_TOKEN=your-token",
    "bitbucket-mcp-server:latest"
  ],
  "enabled": true
}
```

- The `-i` flag is required for proper stdio communication.
- Do not use the `"env"` block; pass env vars via `-e` in args.

---

## Environment Variables

- `ATLASSIAN_BITBUCKET_SERVER_URL` (required): Bitbucket server base URL.
- `ATLASSIAN_BITBUCKET_ACCESS_TOKEN` (required): Bitbucket access token.
- `MCP_TRANSPORT` (optional): `stdio` (default) or `sse` for HTTP/SSE mode.
- `PORT` (optional): HTTP/SSE port (default: 3000).

---

## Project Structure

- `src/` - TypeScript source code
- `dist/` - Compiled JavaScript output
- `Dockerfile` - Docker build instructions
- `package.json` - Project manifest

---

## Troubleshooting

### Dive AI Integration

- If you see `MCP error -32000: Connection closed`, ensure:
  - The Docker config uses `-i` for interactive stdio.
  - The MCP server image is up to date and built from the latest code.
  - Environment variables are passed via `-e` in args, not in the `"env"` block.
- If using STDIO mode, do not use the `"env"` block in Dive config.

### MCP Inspector

- Use STDIO transport and let Inspector launch the server, or run in SSE/HTTP mode and connect via URL.

### Docker

- Ensure the entry point is `dist/src/index.js` and is executable.
- If you see permission errors, check the Dockerfile's `chmod` step.

---

## Development

- TypeScript code in `src/`
- Tests in `src/utils/*.test.ts` and `src/services/*.test.ts`
- Build with `npm run build`
- Run tests with `npm test`

---

## License

MIT
