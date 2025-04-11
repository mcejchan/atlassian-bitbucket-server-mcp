import json
import sys
import os

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

def filter_openapi(input_filename, output_filename):
    desired_tags = {"Project", "Pull Requests", "Repository", "Authentication"}

    try:
        with open(input_filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input file '{input_filename}' not found.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from '{input_filename}': {e}")
        sys.exit(1)

    original_paths = data.get('paths', {})
    original_schemas = data.get('components', {}).get('schemas', {})
    original_security_schemes = data.get('components', {}).get('securitySchemes', {})

    filtered_paths = {}
    print("Filtering paths and operations...")
    for path_string, path_item in original_paths.items():
        if not isinstance(path_item, dict): continue # Skip invalid path items

        kept_operations = {}
        for method, operation in path_item.items():
             # Basic methods + extensions like 'parameters' that aren't operations
            if method not in ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']:
                 continue
            if not isinstance(operation, dict): continue # Skip invalid operations

            op_tags = operation.get('tags')
            is_deprecated = operation.get('deprecated', False)

            # Check if tags match and not deprecated
            if isinstance(op_tags, list) and not is_deprecated:
                if desired_tags.intersection(op_tags):
                    kept_operations[method] = operation

        if kept_operations:
            # Keep original non-method elements like 'parameters' if they exist
            base_path_item = {k: v for k, v in path_item.items() if k not in ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']}
            base_path_item.update(kept_operations)
            filtered_paths[path_string] = base_path_item
            # print(f"  Keeping path: {path_string} with methods: {list(kept_operations.keys())}") # Debugging

    print(f"Kept {len(filtered_paths)} paths after filtering.")

    print("Collecting tags used in filtered operations...")
    used_tag_names = set()
    for path_item in filtered_paths.values():
        # path_item contains methods (get, post...) and potentially 'parameters'
        for method, operation in path_item.items():
            # Ensure we are looking at an operation object, not parameters etc.
             if method in ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] and isinstance(operation, dict):
                 op_tags = operation.get('tags')
                 if isinstance(op_tags, list):
                     used_tag_names.update(op_tags)

    print(f"Found {len(used_tag_names)} unique tags used in kept operations.")

    # Filter the original top-level tag definitions
    original_tag_definitions = data.get("tags", [])
    filtered_tag_definitions = []
    if isinstance(original_tag_definitions, list):
        print("Filtering top-level tag definitions...")
        tag_name_set = set(used_tag_names) # Use set for faster lookups
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

    # Iteratively find schemas referenced by other required schemas
    print("Finding schemas referenced by other schemas (dependencies)...")
    all_found_schemas = set(required_schema_names)
    newly_found = set(required_schema_names)
    iterations = 0
    MAX_ITERATIONS = 10 # Safety break

    while newly_found and iterations < MAX_ITERATIONS:
        iterations += 1
        print(f"  Iteration {iterations}: Looking for dependencies of {len(newly_found)} schemas...")
        current_round_found = set()
        schemas_to_scan = {name: original_schemas[name] for name in newly_found if name in original_schemas}
        refs_in_dependencies = find_refs(schemas_to_scan)

        # Find schemas that are referenced but not yet included
        truly_new = refs_in_dependencies - all_found_schemas
        if truly_new:
             print(f"    Found {len(truly_new)} new schema dependencies.")
             current_round_found.update(truly_new)
             all_found_schemas.update(truly_new)

        newly_found = current_round_found # Schemas to scan in the next round

    if iterations == MAX_ITERATIONS:
         print("Warning: Reached maximum iterations for schema dependency resolution. May be incomplete.")

    print(f"Total required schemas including dependencies: {len(all_found_schemas)}")

    print("Filtering schemas component...")
    filtered_schemas = {name: schema for name, schema in original_schemas.items() if name in all_found_schemas}

    final_data = {
        "openapi": data.get("openapi"),
        "info": data.get("info"),
        "servers": data.get("servers", []),
        "tags": filtered_tag_definitions, # Use the filtered list here
        "paths": filtered_paths,
        "components": {
            "schemas": filtered_schemas,
            "securitySchemes": original_security_schemes
            # Note: other components like parameters, requestBodies etc. are NOT included
            # unless directly referenced via $ref from kept paths/operations/schemas.
            # A more complete solution would involve finding their refs too.
        }
    }
    # Remove empty top-level keys if necessary
    final_data = {k: v for k, v in final_data.items() if v is not None}

    # Explicitly remove tags if the list is empty after filtering
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
            json.dump(final_data, f, indent=2) # Use indent=None for minified output
        print("Done.")
    except IOError as e:
        print(f"Error writing to output file '{output_filename}': {e}")
        sys.exit(1)


if __name__ == "__main__":
    input_file = "bitbucket.8.19.openapi.v3.json"
    output_file = "bitbucket.pyfiltered.subset.openapi.v3.json"

    if not os.path.exists(input_file):
         print(f"Error: Default input file '{input_file}' does not exist in the current directory.")
         print("Please place the file here or modify the script.")
         sys.exit(1)

    filter_openapi(input_file, output_file)
