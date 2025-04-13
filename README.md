# Atlassian Bitbucket MCP Server

A Model Context Protocol (MCP) server for Atlassian Bitbucket Server/Data Center integration.  
Supports CLI, STDIO, SSE/HTTP, and Dockerized deployments.  
Compatible with Dive AI, MCP Inspector, and other MCP clients.

---

## Features

- **Bitbucket Server/Datacenter Integration**: Exposes Bitbucket projects, repositories, branches, commits, and file content as MCP tools.
- **OpenAPI-Generated Client**: Utilizes code generated from the official Bitbucket Server OpenAPI specification for type safety and API accuracy.
- **MCP Protocol Support**: Works as a standalone MCP server (STDIO/SSE/HTTP) or as a CLI tool.
- **Docker Support**: Easily build and run as a Docker container for consistent environments.
- **Configurable**: Uses environment variables for Bitbucket server URL and access token.
- **Robust Logging**: Logs to both stdout and rotating log files.

---

## Quick Start

### 1. Prerequisites

- Node.js (v20+ recommended)
- npm
- Python 3 (for OpenAPI filtering script)
- Bitbucket Server/Datacenter instance and a valid access token with appropriate permissions.

### 2. Clone and Install

```bash
git clone <this-repo-url>
cd mcp-server-selfhosted-bitbucket
npm install
```

### 3. Build the Application

This command generates the API client from the OpenAPI spec (using the default version specified in `package.json`), lints the code, and compiles the TypeScript:

```bash
npm run build-app
```

*(See the Development section for details on updating the OpenAPI spec version.)*

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
# After running npm run build-app
node dist/src/index.js help
```

---

## Docker Usage

### Build the Docker Image

```bash
# Build the image, which runs npm run build-app inside
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

## Development

### Project Structure

- `src/` - Manually written TypeScript source code.
- `src/generated/` - **Automatically generated** API client code (do not edit directly).
- `openapi/` - Contains the OpenAPI specification filtering script and related files.
- `dist/` - Compiled JavaScript output.
- `Dockerfile` - Docker build instructions.
- `package.json` - Project manifest.
- `tsconfig.json` - TypeScript configuration for the main project.
- `eslint.config.mjs` - ESLint configuration.

### Updating the API Client (OpenAPI Spec)

The API client code in `src/generated/` is created from the official Bitbucket Server/DC OpenAPI specification using `openapi-generator-cli`.

1.  **Choose Version:** Decide which Bitbucket version you want to target (e.g., `9.6`, `8.19`).
2.  **Download & Filter:** Run the Python script to download the specific version, filter it for relevant parts, and fix potential generator issues (like duplicate operation IDs). Replace `<version>` with the desired version number:
    ```bash
    npm run update-spec -- <version>
    # Example: npm run update-spec -- 9.6
    ```
    This creates `openapi/bitbucket.pyfiltered.subset.<version>.openapi.v3.json`.
3.  **Generate Code:** Run the generator, telling it which version's filtered spec to use via the `BITBUCKET_VERSION` environment variable:
    ```bash
    BITBUCKET_VERSION=<version> npm run generate
    # Example: BITBUCKET_VERSION=9.6 npm run generate
    ```
    *(If `BITBUCKET_VERSION` is not set, it defaults to the version specified in the `generate` script in `package.json`.)*

### Build, Lint, Test

- **Full Build (Generate, Lint, Compile):**
  ```bash
  # Uses BITBUCKET_VERSION env var or default for generate step
  npm run build-app
  ```
- **Clean Rebuild:**
  ```bash
  npm run rebuild-app
  ```
- **Run Linters:**
  ```bash
  npm run lint
  # Or to auto-fix:
  npm run lint -- --fix
  ```
- **Run Tests:**
  ```bash
  npm run test
  ```
- **Clean Output:**
  ```bash
  npm run clean
  ```

### Simulating CI Locally

To catch issues before pushing, run the core CI steps after a clean install:

```bash
rm -rf node_modules && npm ci && npm run generate && npm run lint && npm run build && npm run test
```
*(Remember to set `BITBUCKET_VERSION` if needed for the `generate` step in this chain.)*

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

### Build Errors

- Ensure the Python script (`openapi/filter_openapi.py`) ran successfully for the target `BITBUCKET_VERSION` before running `npm run generate`.
- If `tsc` fails, check errors. Issues in `src/generated/` often require fixes in the Python script or the OpenAPI spec itself.

### Docker

- Ensure the entry point is `dist/src/index.js` and is executable.
- If you see permission errors, check the Dockerfile's `chmod` step.

---

## License

MIT
