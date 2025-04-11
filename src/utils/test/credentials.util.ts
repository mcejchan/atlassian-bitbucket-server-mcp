import { Logger } from '../logger.util.js';

/**
 * Interface for Atlassian API credentials
 */
export interface AtlassianCredentials {
	bitbucketServerUrl: string;
	bitbucketAccessToken?: string;
	bitbucketUsername?: string;
	bitbucketAppPassword?: string;
}

/**
 * Get Atlassian credentials from environment variables for testing
 * @returns AtlassianCredentials object or null if credentials are missing
 */
export function getTestCredentials(): AtlassianCredentials | null {
	const methodLogger = Logger.forContext(
		'utils/test/credentials.util.ts',
		'getTestCredentials',
	);

	const serverUrl = process.env.ATLASSIAN_BITBUCKET_SERVER_URL;
	const username = process.env.ATLASSIAN_BITBUCKET_USERNAME;
	const appPassword = process.env.ATLASSIAN_BITBUCKET_APP_PASSWORD;
	const accessToken = process.env.ATLASSIAN_BITBUCKET_ACCESS_TOKEN;

	if (!serverUrl) {
		methodLogger.warn('Missing Bitbucket Server credentials. Please set ATLASSIAN_BITBUCKET_SERVER_URL environment variable.');
		return null;
	}

	const credentials: AtlassianCredentials = {
		bitbucketServerUrl: serverUrl
	};

	// Prefer access token over basic auth
	if (accessToken) {
		credentials.bitbucketAccessToken = accessToken;
	} else if (username && appPassword) {
		credentials.bitbucketUsername = username;
		credentials.bitbucketAppPassword = appPassword;
	} else {
		methodLogger.warn('Missing Bitbucket Server credentials. Please set either ATLASSIAN_BITBUCKET_ACCESS_TOKEN or both ATLASSIAN_BITBUCKET_USERNAME and ATLASSIAN_BITBUCKET_APP_PASSWORD environment variables.');
		return null;
	}

	return credentials;
} 