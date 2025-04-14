import json
import sys
import os
import re
import argparse
import urllib.request
import urllib.error

DEFAULT_TAGS = ["Project", "Pull Requests", "Repository", "Authentication"]

def find_refs(obj, prefix="#/components/schemas/"):
    """Recursively finds all $ref values starting with the given prefix."""
    refs = set()
    if isinstance(obj, dict):
        if '$ref' in obj and isinstance(obj['$ref'], str) and obj['$ref'].startswith(prefix):
            refs.add(obj['$ref'][len(prefix):])
        for key, value in obj.items():
            refs.update(find_refs(value, prefix))
    elif isinstance(obj, list):
        for item in obj:
            refs.update(find_refs(item, prefix))
    return refs

def sanitize_operation_id(op_id):
    """Basic sanitization and normalization similar to what some generators might do."""
    # Remove leading/trailing whitespace
    sanitized = op_id.strip()
    # Replace non-alphanumeric characters with underscores
    sanitized = re.sub(r'[^a-zA-Z0-9_]', '_', sanitized)
    # Remove leading underscores if any resulted
    sanitized = re.sub(r'^_+', '', sanitized)
     # Remove trailing underscores
    sanitized = re.sub(r'_+$', '', sanitized)
    # Replace multiple consecutive underscores with a single one
    sanitized = re.sub(r'_+', '_', sanitized)
    # Handle potential empty string after sanitization
    return sanitized if sanitized else "defaultOperationId"

def filter_openapi(input_url, output_filename, tags_to_keep):
    desired_tags_set = set(tags_to_keep)
    print(f"Filtering spec to keep tags: {desired_tags_set}")
    print(f"Attempting to download OpenAPI spec from: {input_url}")
    try:
        # Add a user-agent header to potentially avoid blocks
        hdr = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'}
        req = urllib.request.Request(input_url, headers=hdr)
        with urllib.request.urlopen(req) as response:
            if response.getcode() == 200:
                raw_data = response.read()
                data = json.loads(raw_data.decode('utf-8'))
                print("Download successful.")
            else:
                print(f"Error: Failed to download. Status code: {response.getcode()}")
                sys.exit(1)
    except urllib.error.HTTPError as e:
        print(f"Error: HTTP Error {e.code} downloading from '{input_url}': {e.reason}")
        print("Please check the version number and URL.")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Error: URL Error downloading from '{input_url}': {e.reason}")
        print("Please check your network connection and the URL.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON downloaded from '{input_url}': {e}")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred during download: {e}")
        sys.exit(1)

    original_paths = data.get('paths', {})
    original_schemas = data.get('components', {}).get('schemas', {})
    original_security_schemes = data.get('components', {}).get('securitySchemes', {})

    filtered_paths = {}
    seen_operation_ids_by_tag = {} # Track IDs per tag

    print("Filtering paths and operations, fixing duplicate operationIds...")
    for path_string, path_item in original_paths.items():
        if not isinstance(path_item, dict): continue

        kept_operations = {}
        for method, operation in path_item.items():
            if method not in ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']:
                 continue
            if not isinstance(operation, dict): continue

            op_tags = operation.get('tags')
            is_deprecated = operation.get('deprecated', False)

            if isinstance(op_tags, list) and not is_deprecated:
                if desired_tags_set.intersection(op_tags):
                    if 'operationId' in operation:
                        tag = op_tags[0]
                        if tag not in seen_operation_ids_by_tag:
                            seen_operation_ids_by_tag[tag] = set()

                        original_op_id = str(operation['operationId']).strip()

                        # *** Add specific rename ***
                        if original_op_id == "streamRaw":
                            print(f"  INFO: Specifically renaming 'streamRaw' to 'streamFileContentRaw' in path '{path_string}'")
                            original_op_id = "streamFileContentRaw"
                            operation['operationId'] = original_op_id
                        # *** End specific rename ***

                        sanitized_op_id = sanitize_operation_id(original_op_id)
                        current_op_id = sanitized_op_id
                        counter = 1

                        processed_ids = seen_operation_ids_by_tag[tag]

                        while current_op_id in processed_ids:
                            current_op_id = sanitize_operation_id(f"{original_op_id}_{counter}")
                            counter += 1
                            if counter > 20:
                                print(f"ERROR: Could not resolve operationId conflict for '{original_op_id}' in tag '{tag}' at path '{path_string}'. Aborting rename.")
                                current_op_id = original_op_id # Revert
                                break

                        if current_op_id != original_op_id:
                           print(f"  WARN: Renaming operationId '{original_op_id}' to '{current_op_id}' for tag '{tag}' in path '{path_string}'")
                           operation['operationId'] = current_op_id
                        elif current_op_id != sanitized_op_id: # Log if only sanitization occurred
                           print(f"  INFO: Sanitized operationId '{original_op_id}' to '{current_op_id}' for tag '{tag}' in path '{path_string}'")
                           operation['operationId'] = current_op_id

                        seen_operation_ids_by_tag[tag].add(current_op_id)

                    else:
                         print(f"  WARN: Missing operationId for {method.upper()} {path_string}")

                    kept_operations[method] = operation

        if kept_operations:
            base_path_item = {k: v for k, v in path_item.items() if k not in ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']}
            base_path_item.update(kept_operations)
            filtered_paths[path_string] = base_path_item

    print(f"Kept {len(filtered_paths)} paths after filtering.")

    print("Collecting tags used in filtered operations...")
    used_tag_names = set()
    for path_item in filtered_paths.values():
        for method, operation in path_item.items():
             if method in ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] and isinstance(operation, dict):
                 op_tags = operation.get('tags')
                 if isinstance(op_tags, list):
                     used_tag_names.update(op_tags)

    print(f"Found {len(used_tag_names)} unique tags used in kept operations.")

    original_tag_definitions = data.get("tags", [])
    filtered_tag_definitions = []
    if isinstance(original_tag_definitions, list):
        print("Filtering top-level tag definitions...")
        tag_name_set = set(used_tag_names)
        filtered_tag_definitions = [
            tag_def for tag_def in original_tag_definitions
            if isinstance(tag_def, dict) and tag_def.get("name") in tag_name_set
        ]
        print(f"Kept {len(filtered_tag_definitions)} top-level tag definitions.")
    else:
        print("Warning: Original top-level 'tags' field is not a list, cannot filter definitions.")

    print("Finding referenced schemas...")
    required_schema_names = find_refs(filtered_paths)
    print(f"Initially found {len(required_schema_names)} referenced schemas.")

    print("Finding schemas referenced by other schemas (dependencies)...")
    all_found_schemas = set(required_schema_names)
    newly_found = set(required_schema_names)
    iterations = 0
    MAX_ITERATIONS = 10

    while newly_found and iterations < MAX_ITERATIONS:
        iterations += 1
        print(f"  Iteration {iterations}: Looking for dependencies of {len(newly_found)} schemas...")
        current_round_found = set()
        schemas_to_scan = {name: original_schemas[name] for name in newly_found if name in original_schemas}
        refs_in_dependencies = find_refs(schemas_to_scan)

        truly_new = refs_in_dependencies - all_found_schemas
        if truly_new:
             print(f"    Found {len(truly_new)} new schema dependencies.")
             current_round_found.update(truly_new)
             all_found_schemas.update(truly_new)

        newly_found = current_round_found

    if iterations == MAX_ITERATIONS:
         print("Warning: Reached maximum iterations for schema dependency resolution. May be incomplete.")

    print(f"Total required schemas including dependencies: {len(all_found_schemas)}")

    print("Filtering schemas component...")
    filtered_schemas = {name: schema for name, schema in original_schemas.items() if name in all_found_schemas}

    final_data = {
        "openapi": data.get("openapi"),
        "info": data.get("info"),
        "servers": data.get("servers", []),
        "tags": filtered_tag_definitions,
        "paths": filtered_paths,
        "components": {
            "schemas": filtered_schemas,
            "securitySchemes": original_security_schemes
        }
    }
    final_data = {k: v for k, v in final_data.items() if v is not None}

    if not final_data.get("tags"):
         final_data.pop("tags", None)

    if not final_data.get("components", {}).get("schemas"):
        final_data.get("components", {}).pop("schemas", None)
    if not final_data.get("components", {}).get("securitySchemes"):
         final_data.get("components", {}).pop("securitySchemes", None)
    if not final_data.get("components"):
         final_data.pop("components", None)

    print(f"Writing filtered contract to '{output_filename}'...")
    try:
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(final_data, f, indent=2)
        print("Done.")
    except IOError as e:
        print(f"Error writing to output file '{output_filename}': {e}")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Filter Bitbucket OpenAPI spec and fix operationIds.')
    # parser.add_argument(
    #     'version',
    #     type=str,
    #     help='The version of the Bitbucket OpenAPI spec to process (e.g., "9.6", "8.19"). '
    #          'This version is used to construct the download URL.'
    # )
    parser.add_argument(
        '--tags',
        nargs='+',
        default=DEFAULT_TAGS,
        help=f'Space-separated list of OpenAPI tags to keep. Default: {" ".join(DEFAULT_TAGS)}'
    )

    args = parser.parse_args()
    # version = args.version
    version = os.getenv('BITBUCKET_VERSION', '8.19') # <-- Read from env, default to 8.19
    print(f"Using Bitbucket version: {version} (from BITBUCKET_VERSION env or default)") # <-- Add log
    tags = args.tags

    script_dir = os.path.dirname(__file__)
    input_url = f"https://dac-static.atlassian.com/server/bitbucket/{version}.swagger.v3.json"

    output_filename = f"bitbucket.pyfiltered.{version}.openapi.v3.json"
    output_file_path = os.path.join(script_dir, output_filename)

    print(f"Input URL: {input_url}")
    print(f"Output file: {output_file_path}")

    filter_openapi(input_url, output_file_path, tags)
