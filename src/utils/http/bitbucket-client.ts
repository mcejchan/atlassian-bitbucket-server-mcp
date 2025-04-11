import axios, { 
	AxiosInstance, 
	InternalAxiosRequestConfig,
	AxiosRequestConfig,
	RawAxiosRequestHeaders
} from 'axios';
import { Logger } from '../logger.util';
import { config } from '../config.util';
import { McpError, ErrorType } from '../error.util';

const clientLogger = Logger.forContext('BitbucketClient');

// Extend InternalAxiosRequestConfig to include bitbucket config
interface BitbucketRequestConfig extends InternalAxiosRequestConfig {
	bitbucket?: {
		username?: string;
		password?: string;
	};
}

/**
 * Create an Axios instance for Bitbucket API calls with proper authentication
 */
export class BitbucketClient {
	private readonly client: AxiosInstance;
	private readonly logger: Logger;
	private static instance: BitbucketClient;

	private constructor() {
		this.logger = Logger.forContext('utils/http/bitbucket-client.ts');
		this.client = this.createClient();
	}

	public static getInstance(): BitbucketClient {
		if (!BitbucketClient.instance) {
			BitbucketClient.instance = new BitbucketClient();
		}
		return BitbucketClient.instance;
	}

	private createClient(): AxiosInstance {
		const methodLogger = this.logger.forMethod('createClient');
		methodLogger.debug('Creating Bitbucket HTTP client...');

		clientLogger.info('BitbucketClient constructor called.');
		const serverUrl = config.get('ATLASSIAN_BITBUCKET_SERVER_URL');
		clientLogger.info(`Retrieved ATLASSIAN_BITBUCKET_SERVER_URL: ${serverUrl ? 'Set' : 'Not Set or undefined'}`);

		if (!serverUrl) {
			clientLogger.error(
				'ATLASSIAN_BITBUCKET_SERVER_URL is not configured.',
			);
			throw new Error(
				'Bitbucket Server URL is not configured. Please set ATLASSIAN_BITBUCKET_SERVER_URL environment variable.',
			);
		}

		const client = axios.create({
			baseURL: serverUrl,
			headers: {
				'Content-Type': 'application/json',
			} as RawAxiosRequestHeaders,
		});

		// Add interceptors
		this.addAuthInterceptor(client);
		this.addLoggingInterceptor(client);
		this.addErrorInterceptor(client);

		methodLogger.debug('Bitbucket HTTP client created');
		return client;
	}

	private addAuthInterceptor(client: AxiosInstance): void {
		client.interceptors.request.use(
			(requestConfig: BitbucketRequestConfig) => {
				const methodLogger = this.logger.forMethod('authInterceptor');
				
				// --- Bearer Token Auth (Priority 1) ---
				const token = config.get('ATLASSIAN_BITBUCKET_ACCESS_TOKEN');
				if (token) {
					if (requestConfig.headers) {
						requestConfig.headers.Authorization = `Bearer ${token}`;
						methodLogger.debug('Added Bearer token authorization header.');
					}
					return requestConfig; // Use token auth and proceed
				}

				// --- Basic Auth (Fallback - Priority 2) ---
				methodLogger.debug('Bearer token not found, attempting Basic auth.');
				// Allow overriding credentials per-request if needed (though unlikely for Bitbucket)
				const username = requestConfig.bitbucket?.username || config.get('ATLASSIAN_BITBUCKET_USERNAME');
				const password = requestConfig.bitbucket?.password || config.get('ATLASSIAN_BITBUCKET_PASSWORD');

				if (username && password) {
					const auth = Buffer.from(`${username}:${password}`).toString('base64');
					if (requestConfig.headers) {
						requestConfig.headers.Authorization = `Basic ${auth}`;
						methodLogger.debug('Added Basic auth header using username/password.');
					}
				} else {
					// --- No Credentials ---
					methodLogger.warn('No suitable authentication credentials (Bearer token or Basic auth username/password) were found in config.');
					// Depending on API, some calls might work without auth, so we don't error here.
					// Error handling for 401/403 should happen in the response interceptor.
				}

				return requestConfig;
			},
			(error) => {
				this.logger.error('Auth interceptor error:', error);
				return Promise.reject(error);
			},
		);
	}

	private addLoggingInterceptor(client: AxiosInstance): void {
		client.interceptors.request.use(
			(config: BitbucketRequestConfig) => {
				const methodLogger = this.logger.forMethod('loggingInterceptor');
				methodLogger.debug(`${config.method?.toUpperCase()} ${config.url}`);
				return config;
			},
			(error) => {
				this.logger.error('Request error:', error);
				return Promise.reject(error);
			},
		);

		client.interceptors.response.use(
			(response) => {
				const methodLogger = this.logger.forMethod('loggingInterceptor');
				methodLogger.debug(
					`${response.status} ${response.config.method?.toUpperCase()} ${
						response.config.url
					}`,
				);
				return response;
			},
			(error) => {
				this.logger.error('Response error:', error);
				return Promise.reject(error);
			},
		);
	}

	private addErrorInterceptor(client: AxiosInstance): void {
		client.interceptors.response.use(
			(response) => response,
			(error) => {
				const methodLogger = this.logger.forMethod('errorInterceptor');
				methodLogger.error('API error:', error);

				if (error.response) {
					const status = error.response.status;
					const message = error.response.data?.error?.message || error.message;

					switch (status) {
						case 401:
							return Promise.reject(
								new McpError(message, ErrorType.AUTH_INVALID, 401, error)
							);
						case 403:
							return Promise.reject(
								new McpError(message, ErrorType.FORBIDDEN, 403, error)
							);
						case 404:
							return Promise.reject(
								new McpError(message, ErrorType.NOT_FOUND, 404, error)
							);
						default:
							return Promise.reject(
								new McpError(message, ErrorType.API_ERROR, status || 500, error)
							);
					}
				}

				return Promise.reject(
					new McpError(
						'Network error occurred',
						ErrorType.REQUEST_ERROR,
						500,
						error
					),
				);
			},
		);
	}

	public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
		return (await this.client.get<T>(url, config)).data;
	}

	public async post<T>(
		url: string,
		data?: any,
		config?: AxiosRequestConfig,
	): Promise<T> {
		return (await this.client.post<T>(url, data, config)).data;
	}

	public async put<T>(
		url: string,
		data?: any,
		config?: AxiosRequestConfig,
	): Promise<T> {
		return (await this.client.put<T>(url, data, config)).data;
	}

	public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
		return (await this.client.delete<T>(url, config)).data;
	}
}
