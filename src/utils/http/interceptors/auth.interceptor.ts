import { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { McpError, ErrorType } from '../../error.util.js';

export class AuthInterceptor {
	onRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
		const token = process.env.ATLASSIAN_BITBUCKET_ACCESS_TOKEN;
		const username = process.env.ATLASSIAN_BITBUCKET_USERNAME;
		const appPassword = process.env.ATLASSIAN_BITBUCKET_APP_PASSWORD;

		if (!token && (!username || !appPassword)) {
			throw new McpError(
				'Bitbucket authentication credentials are required',
				ErrorType.AUTH_MISSING,
				401
			);
		}

		if (!config.headers) {
			config.headers = new AxiosHeaders();
		}

		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		} else if (username && appPassword) {
			const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
			config.headers.Authorization = `Basic ${auth}`;
		}

		return config;
	}

	onError(error: unknown): never {
		throw new McpError(
			'Authentication failed',
			ErrorType.AUTH_ERROR,
			401,
			error instanceof Error ? error : undefined
		);
	}
} 