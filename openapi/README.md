# OpenAPI Folder

This directory contains OpenAPI specifications and related scripts/configs for Atlassian Bitbucket Server.

## Contents

- **bitbucket.8.19.openapi.v3.json**  
  The full, unmodified OpenAPI v3 contract for Bitbucket Server 8.19, downloaded from Atlassian:
  [Original Swagger JSON](https://dac-static.atlassian.com/server/bitbucket/8.19.swagger.v3.json?_v=1.637.20)

- **bitbucket.pyfiltered.subset.openapi.v3.json**  
  A filtered subset of the OpenAPI contract, used for code generation and tooling.

- **filter_openapi.py**  
  Python script to generate the filtered contract from the full contract.

- **openapi-generator-config.json**, **openapi-v2-config.json**, **openapitools.json**  
  Configuration files for OpenAPI code generation tools.

## How to Generate the Filtered OpenAPI Contract

1. Ensure you have Python 3 installed.
2. From the project root, run:

   ```bash
   python3 openapi/filter_openapi.py
   ```

   This will read `bitbucket.8.19.openapi.v3.json` and output the filtered contract as `bitbucket.pyfiltered.subset.openapi.v3.json` in this folder.

3. Use the filtered contract and configs in this directory for code generation or further processing.
