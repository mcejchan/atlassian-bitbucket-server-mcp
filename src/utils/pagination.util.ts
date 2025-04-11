import { Logger } from './logger.util';

/**
 * Types of pagination mechanisms used by different Atlassian APIs
 */
export enum PaginationType {
	/**
	 * Offset-based pagination (startAt, maxResults, total)
	 * Used by Jira APIs
	 */
	OFFSET = 'offset',

	/**
	 * Cursor-based pagination (cursor in URL)
	 * Used by Confluence APIs
	 */
	CURSOR = 'cursor',

	/**
	 * Page-based pagination (page parameter in URL)
	 * Used by Bitbucket APIs
	 */
	PAGE = 'page',
}

/**
 * Structure for offset-based pagination data
 */
export interface OffsetPaginationData {
	startAt?: number;
	maxResults?: number;
	total?: number;
	nextPage?: string;
	values?: unknown[];
}

/**
 * Structure for cursor-based pagination data (Confluence)
 */
export interface CursorPaginationData {
	_links: {
		next?: string;
	};
	results?: unknown[];
}

/**
 * Structure for page-based pagination data (Bitbucket)
 */
export interface PagePaginationData {
	next?: string;
	values?: unknown[];
}

/**
 * Union type for all pagination data types
 */
export type PaginationData =
	| OffsetPaginationData
	| CursorPaginationData
	| PagePaginationData;

/**
 * Extract pagination information from API response
 * @param data The API response containing pagination information
 * @param paginationType The type of pagination mechanism used
 * @returns Object with nextCursor, hasMore, and count properties
 */
export function extractPaginationInfo(
	data: PaginationData,
	paginationType: PaginationType,
): { nextCursor?: string; hasMore: boolean; count?: number } {
	const methodLogger = Logger.forContext(
		'utils/pagination.util.ts',
		'extractPaginationInfo',
	);

	let nextCursor: string | undefined;
	let count: number | undefined;

	try {
		// Extract count from the appropriate data field based on pagination type
		switch (paginationType) {
			case PaginationType.OFFSET: {
				const offsetData = data as OffsetPaginationData;
				count = offsetData.values?.length;

				// Handle Jira's offset-based pagination
				if (
					offsetData.startAt !== undefined &&
					offsetData.maxResults !== undefined &&
					offsetData.total !== undefined &&
					offsetData.startAt + offsetData.maxResults <
						offsetData.total
				) {
					nextCursor = String(
						offsetData.startAt + offsetData.maxResults,
					);
				} else if (offsetData.nextPage) {
					nextCursor = offsetData.nextPage;
				}
				break;
			}

			case PaginationType.CURSOR: {
				const cursorData = data as CursorPaginationData;
				count = cursorData.results?.length;

				// Handle Confluence's cursor-based pagination
				if (cursorData._links && cursorData._links.next) {
					const nextUrl = cursorData._links.next;
					const cursorMatch = nextUrl.match(/cursor=([^&]+)/);
					if (cursorMatch && cursorMatch[1]) {
						nextCursor = decodeURIComponent(cursorMatch[1]);
					}
				}
				break;
			}

			case PaginationType.PAGE: {
				const pageData = data as PagePaginationData;
				count = pageData.values?.length;

				// Handle Bitbucket's page-based pagination
				if (pageData.next) {
					try {
						const nextUrl = new URL(pageData.next);
						const nextPage = nextUrl.searchParams.get('page');
						if (nextPage) {
							nextCursor = nextPage;
						}
					} catch (error) {
						methodLogger.warn(
							`Failed to parse next URL: ${pageData.next}`,
							{ error },
						);
					}
				}
				break;
			}

			default:
				methodLogger.warn(`Unknown pagination type: ${paginationType}`);
		}

		if (nextCursor) {
			methodLogger.debug(`Next cursor: ${nextCursor}`);
		}

		if (count !== undefined) {
			methodLogger.debug(`Count: ${count}`);
		}

		return {
			nextCursor,
			hasMore: !!nextCursor,
			count,
		};
	} catch (error) {
		methodLogger.warn(
			`Error extracting pagination information: ${error instanceof Error ? error.message : String(error)}`,
		);
		return { hasMore: false };
	}
}
