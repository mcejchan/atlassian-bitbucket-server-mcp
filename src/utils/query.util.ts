/**
 * Utilities for formatting and handling query parameters for the Bitbucket API.
 * These functions help convert user-friendly query strings into the format expected by Bitbucket's REST API.
 */

/**
 * Format a simple text query into Bitbucket's query syntax
 * Bitbucket API expects query parameters in a specific format for the 'q' parameter
 *
 * @param query - The search query string
 * @param field - Optional field to search in, defaults to 'name'
 * @returns Formatted query string for Bitbucket API
 *
 * @example
 * // Simple text search (returns: name ~ "vue3")
 * formatBitbucketQuery("vue3")
 *
 * @example
 * // Already formatted query (returns unchanged: name = "repository")
 * formatBitbucketQuery("name = \"repository\"")
 *
 * @example
 * // With specific field (returns: description ~ "API")
 * formatBitbucketQuery("API", "description")
 */
export function formatBitbucketQuery(
	query: string,
	field: string = 'name',
): string {
	// If the query is empty, return it as is
	if (!query || query.trim() === '') {
		return query;
	}

	// Regular expression to check if the query already contains operators
	// like ~, =, !=, >, <, etc., which would indicate it's already formatted
	const operatorPattern = /[~=!<>]/;

	// If the query already contains operators, assume it's properly formatted
	if (operatorPattern.test(query)) {
		return query;
	}

	// If query is quoted, assume it's an exact match
	if (query.startsWith('"') && query.endsWith('"')) {
		return `${field} ~ ${query}`;
	}

	// Format simple text as a field search with fuzzy match
	// Wrap in double quotes to handle spaces and special characters
	return `${field} ~ "${query}"`;
}
