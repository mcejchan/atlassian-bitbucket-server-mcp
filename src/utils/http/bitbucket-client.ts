import axios, { 
	AxiosInstance, 
	AxiosRequestConfig,
	RawAxiosRequestHeaders,
} from 'axios';
import { Logger } from '../logger.util';
import { config } from '../config.util';
// Import ConfigurationParameters and Configuration types
import { Configuration } from '@generated/runtime';
// Import interceptor functions
import { addAuthHeader, handleAuthError } from './interceptors/auth.interceptor';
import { logRequest, logRequestError, logResponse, logResponseError } from './interceptors/logging.interceptor';
import { handleErrorResponse } from './interceptors/error.interceptor';

type FetchAPI = (input: RequestInfo | URL, init?: RequestInit | undefined) => Promise<Response>;

const clientLogger = Logger.forContext('BitbucketClient');

/**
 * Create an Axios instance for Bitbucket API calls with proper authentication
 */
export class BitbucketClient {
	private readonly client: AxiosInstance;
	private readonly logger: Logger;
	private static instance: BitbucketClient;
	private basePath: string = '';

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

		// Ensure baseURL doesn't end with a slash
		const sanitizedBaseUrl = serverUrl.replace(/\/+$/, '');
		methodLogger.debug(`Using sanitized base URL: ${sanitizedBaseUrl}`);
		this.basePath = sanitizedBaseUrl; // Store the base path

		const client = axios.create({
			baseURL: this.basePath, // Use stored base path
			headers: {
				'Content-Type': 'application/json',
			} as RawAxiosRequestHeaders,
		});

		// Add interceptors using imported functions
		client.interceptors.request.use(addAuthHeader, handleAuthError);
		client.interceptors.request.use(logRequest, logRequestError);
		client.interceptors.response.use(logResponse, logResponseError);
		client.interceptors.response.use(undefined, handleErrorResponse); // Error handler for response

		methodLogger.debug('Bitbucket HTTP client created with external interceptors');
		return client;
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

	// Public getter for the base path
	public getBasePath(): string {
		return this.basePath;
	}

	// New Public Method: Returns an instantiated Configuration object
	public getGeneratedClientConfiguration(): Configuration {
		return new Configuration({
			// The generated client might still benefit from the base path for resolving relative URLs passed to its methods
			// though the fetchApi implementation will ultimately use the Axios client's base URL.
			basePath: this.getBasePath(), 
			fetchApi: this.getFetchApi(),
			// We don't pass headers here, as the fetchApi's underlying Axios client handles auth via interceptors.
		});
	}

	// Method to provide a FetchAPI compatible function using the internal Axios client
	public getFetchApi(): FetchAPI {
		return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			const methodLogger = this.logger.forMethod('getFetchApi');
			let url: string;

			// Determine URL from input
			if (typeof input === 'string') {
				url = input;
			} else if (input instanceof URL) {
				url = input.toString();
			} else {
				// Assuming input is a Request object
				url = input.url;
				// Merge headers and other properties from Request object if not in init
				init = { ...input, ...init }; 
			}

			// Construct Axios config from fetch init
			const axiosConfig: AxiosRequestConfig = {
				url: url, // Axios uses url property within config
				method: init?.method || 'GET',
				headers: init?.headers ? this.convertHeadersToAxios(init.headers) : {},
				data: init?.body,
				// Map other relevant fetch options to Axios options if needed (e.g., signal)
				// Use 'any' for pragmatic type casting between fetch and Axios signals
				signal: init?.signal as any, 
				responseType: 'arraybuffer' // Get raw response to construct Response object
			};

			try {
				methodLogger.debug(`Executing request via Axios: ${axiosConfig.method} ${url}`);
				const axiosResponse = await this.client.request(axiosConfig);

				// Construct a standard Response object from the Axios response
				const responseHeaders = new Headers();
				for (const key in axiosResponse.headers) {
					if (Object.prototype.hasOwnProperty.call(axiosResponse.headers, key)) {
						// Handle potential array values for headers like set-cookie
						const headerValue = axiosResponse.headers[key];
						if (Array.isArray(headerValue)) {
							headerValue.forEach(val => responseHeaders.append(key, String(val)));
						} else {
							responseHeaders.set(key, String(headerValue));
						}
					}
				}

				const response = new Response(axiosResponse.data, { // data is ArrayBuffer due to responseType
					status: axiosResponse.status,
					statusText: axiosResponse.statusText,
					headers: responseHeaders,
				});

				return response;
			} catch (error: any) {
				methodLogger.error(`Error executing request via Axios for ${url}:`, error);
				// Let the Axios error interceptor handle creating McpError.
				// Just re-throw the original error to propagate it.
				throw error; 
			}
		};
	}

	// Helper to convert Fetch Headers (HeadersInit) to Axios Headers (RawAxiosRequestHeaders)
	private convertHeadersToAxios(fetchHeaders: HeadersInit): RawAxiosRequestHeaders {
		const axiosHeaders: RawAxiosRequestHeaders = {};
		if (fetchHeaders instanceof Headers) {
			// Correctly iterate over Headers object using forEach
			fetchHeaders.forEach((value, key) => {
				// Axios headers can handle string | number | boolean | string[]
				// Check if header already exists (e.g., multiple Set-Cookie)
				if (axiosHeaders[key]) {
					const existing = axiosHeaders[key];
					if (Array.isArray(existing)) {
						(existing as string[]).push(value); // Push to existing array
					} else {
						// Convert to array if it's the second value for this key
						axiosHeaders[key] = [String(existing), value];
					}
				} else {
					axiosHeaders[key] = value; // Assign first value
				}
			});
		} else if (Array.isArray(fetchHeaders)) {
			// Handle string[][]
			fetchHeaders.forEach(([key, value]) => {
				if (axiosHeaders[key]) {
					// Append if header already exists and is an array, otherwise create array
					const existing = axiosHeaders[key];
					if (Array.isArray(existing)) {
						existing.push(value);
					} else if (typeof existing === 'string'){
						axiosHeaders[key] = [existing, value];
					} else {
						// Handle cases where existing value might be number/boolean (though unlikely for headers)
						axiosHeaders[key] = [String(existing), value]; 
					}
				} else {
					axiosHeaders[key] = value;
				}
			});
		} else {
			// Assuming it's Record<string, string | ReadonlyArray<string>> - Axios can handle arrays
			Object.assign(axiosHeaders, fetchHeaders);
		}
		return axiosHeaders;
	}
}
