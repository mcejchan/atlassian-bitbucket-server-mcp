# OpenAPI Integration

This directory manages the Bitbucket Server API integration through OpenAPI specifications.

## Overview

The system works in three main stages:

1. **Download** the official Bitbucket Server OpenAPI specification
2. **Filter** the specification to include only required endpoints
3. **Generate** TypeScript client code from the filtered specification

## Key Files

- **bitbucket.downloaded.8.19.openapi.v3.json**  
  The complete OpenAPI v3 specification for Bitbucket Server 8.19 from Atlassian

- **bitbucket.pyfiltered.8.19.openapi.v3.json**  
  The filtered specification containing only endpoints with tags: "Project", "Pull Requests", "Repository", "Authentication"

- **filter_openapi.py**  
  Python script that processes the full specification to:
  - Keep only endpoints with selected tags
  - Fix duplicate operation IDs
  - Include all required schema references
  - Sanitize operation names for TypeScript compatibility

- **openapi-generator-config.json**  
  Configuration for the OpenAPI Generator that controls TypeScript output settings

## Working with the API

### Filtering the Specification

```bash
# Filter the API to include only needed endpoints
npm run filter-spec
```

This command runs the Python script which reads the downloaded specification and creates a filtered version.

### Generating TypeScript Client

```bash
# Generate the TypeScript API client
npm run generate
```

This creates strongly-typed API client code in `src/generated/` directory, providing:

- Type-safe API calls
- Request/response models
- Authentication handling

### Complete Rebuild

```bash
# Clean, filter, and regenerate the API client
npm run rebuild
```

This command performs a complete regeneration of the API client by:

1. Removing previously generated files
2. Filtering the OpenAPI specification
3. Generating fresh TypeScript client code
4. Building the project
