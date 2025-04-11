/**
 * Default values for pagination across the application.
 * These values should be used consistently throughout the codebase.
 */

/**
 * Default page size for all list operations.
 * This value determines how many items are returned in a single page by default.
 */
export const DEFAULT_PAGE_SIZE = 25;

/**
 * Default values for repository operations
 */
export const REPOSITORY_DEFAULTS = {
	/**
	 * Whether to include branches in repository details by default
	 */
	INCLUDE_BRANCHES: false,

	/**
	 * Whether to include commits in repository details by default
	 */
	INCLUDE_COMMITS: false,

	/**
	 * Whether to include pull requests in repository details by default
	 */
	INCLUDE_PULL_REQUESTS: false,
};

/**
 * Default values for pull request operations
 */
export const PULL_REQUEST_DEFAULTS = {
	/**
	 * Whether to include participants in pull request details by default
	 */
	INCLUDE_PARTICIPANTS: true,

	/**
	 * Whether to include activities in pull request details by default
	 */
	INCLUDE_ACTIVITIES: false,

	/**
	 * Whether to include commits in pull request details by default
	 */
	INCLUDE_COMMITS: false,

	/**
	 * Whether to include comments in pull request details by default
	 */
	INCLUDE_COMMENTS: false,
};

/**
 * Apply default values to options object.
 * This utility ensures that default values are consistently applied.
 *
 * @param options Options object that may have some values undefined
 * @param defaults Default values to apply when options values are undefined
 * @returns Options object with default values applied
 *
 * @example
 * const options = applyDefaults({ limit: 10 }, { limit: DEFAULT_PAGE_SIZE, includeBranches: true });
 * // Result: { limit: 10, includeBranches: true }
 */
export function applyDefaults<T extends object>(
	options: Partial<T>,
	defaults: Partial<T>,
): T {
	return {
		...defaults,
		...Object.fromEntries(
			Object.entries(options).filter(([_, value]) => value !== undefined),
		),
	} as T;
}
