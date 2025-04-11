import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger.util';
import * as dotenv from 'dotenv';
import * as os from 'os';

/**
 * Configuration loader that handles multiple sources with priority:
 * 1. Direct ENV pass (process.env)
 * 2. .env.test file in project root (when NODE_ENV=test)
 * 3. .env file in project root
 * 4. Global config file at $HOME/.mcp/configs.json
 */
class ConfigLoader {
	private packageName: string;
	private configLoaded: boolean = false;

	/**
	 * Create a new ConfigLoader instance
	 * @param packageName The package name to use for global config lookup
	 */
	constructor(packageName: string) {
		this.packageName = packageName;
	}

	/**
	 * Load configuration from all sources with proper priority
	 */
	load(): void {
		const methodLogger = Logger.forContext('utils/config.util.ts', 'load');
		if (this.configLoaded) {
			methodLogger.debug('Configuration already loaded, skipping');
			return;
		}

		methodLogger.debug('Loading configuration...');

		// Priority 4: Load from global config file
		this.loadFromGlobalConfig();

		// Priority 3: Load from .env file
		this.loadFromEnvFile();

		// Priority 2: Load from .env.test file when NODE_ENV=test
		if (process.env.NODE_ENV === 'test') {
			this.loadFromTestEnvFile();
		}

		// Priority 1: Direct ENV pass is already in process.env
		// No need to do anything as it already has highest priority

		this.configLoaded = true;
		methodLogger.debug('Configuration loaded successfully');
	}

	/**
	 * Load configuration from .env file in project root
	 */
	private loadFromEnvFile(): void {
		const methodLogger = Logger.forContext(
			'utils/config.util.ts',
			'loadFromEnvFile'
		);
		try {
			methodLogger.debug(`Attempting to load .env from CWD: ${process.cwd()}`);
			const result = dotenv.config(); // Loads into process.env
			if (result.error) {
				methodLogger.warn('No .env file found or error reading it', result.error);
				return;
			}
			// Check if the specific variable was loaded into process.env
			const serverUrl = process.env.ATLASSIAN_BITBUCKET_SERVER_URL;
			const token = process.env.ATLASSIAN_BITBUCKET_ACCESS_TOKEN;
			methodLogger.debug(
				`Loaded configuration from .env file. ` +
				`ATLASSIAN_BITBUCKET_SERVER_URL found: ${!!serverUrl}, ` +
				`ATLASSIAN_BITBUCKET_ACCESS_TOKEN found: ${!!token}`
			);
			// Optionally log the value if debugging is intense (be careful with tokens)
			// methodLogger.debug(`Server URL Value: ${serverUrl}`); 
		} catch (error) {
			methodLogger.error('Error during dotenv.config() execution', error);
		}
	}

	/**
	 * Load configuration from .env.test file in project root
	 */
	private loadFromTestEnvFile(): void {
		const methodLogger = Logger.forContext(
			'utils/config.util.ts',
			'loadFromTestEnvFile',
		);
		try {
			const result = dotenv.config({ path: '.env.test' });
			if (result.error) {
				methodLogger.debug('No .env.test file found or error reading it');
				return;
			}
			methodLogger.debug('Loaded configuration from .env.test file');
		} catch (error) {
			methodLogger.error('Error loading .env.test file', error);
		}
	}

	/**
	 * Load configuration from global config file at $HOME/.mcp/configs.json
	 */
	private loadFromGlobalConfig(): void {
		const methodLogger = Logger.forContext(
			'utils/config.util.ts',
			'loadFromGlobalConfig',
		);
		try {
			const homedir = os.homedir();
			const globalConfigPath = path.join(homedir, '.mcp', 'configs.json');

			if (!fs.existsSync(globalConfigPath)) {
				methodLogger.debug('Global config file not found');
				return;
			}

			const configContent = fs.readFileSync(globalConfigPath, 'utf8');
			const config = JSON.parse(configContent);

			if (
				!config[this.packageName] ||
				!config[this.packageName].environments
			) {
				methodLogger.debug(
					`No configuration found for ${this.packageName}`,
				);
				return;
			}

			const environments = config[this.packageName].environments;
			for (const [key, value] of Object.entries(environments)) {
				// Only set if not already defined in process.env
				if (process.env[key] === undefined) {
					process.env[key] = String(value);
				}
			}

			methodLogger.debug('Loaded configuration from global config file');
		} catch (error) {
			methodLogger.error('Error loading global config file', error);
		}
	}

	/**
	 * Get a configuration value
	 * @param key The configuration key
	 * @param defaultValue The default value if the key is not found
	 * @returns The configuration value or the default value
	 */
	get(key: string, defaultValue?: string): string | undefined {
		return process.env[key] || defaultValue;
	}

	/**
	 * Get a boolean configuration value
	 * @param key The configuration key
	 * @param defaultValue The default value if the key is not found
	 * @returns The boolean configuration value or the default value
	 */
	getBoolean(key: string, defaultValue: boolean = false): boolean {
		const value = this.get(key);
		if (value === undefined) {
			return defaultValue;
		}
		return value.toLowerCase() === 'true';
	}

	/**
	 * Set a configuration value
	 * @param key The configuration key
	 * @param value The value to set
	 */
	set(key: string, value: string): void {
		const methodLogger = Logger.forContext('utils/config.util.ts', 'set');
		methodLogger.debug(`Setting configuration value for ${key}`);
		process.env[key] = value;
	}

	/**
	 * Reset the configuration state
	 * This is primarily used for testing purposes
	 */
	reset(): void {
		const methodLogger = Logger.forContext('utils/config.util.ts', 'reset');
		methodLogger.debug('Resetting configuration state');
		this.configLoaded = false;
		// Clear all environment variables that were set by this config loader
		// but preserve Node's own environment variables
		const nodeEnvVars = ['NODE_ENV', 'PATH', 'PWD', 'HOME', 'SHELL'];
		for (const key of Object.keys(process.env)) {
			if (!nodeEnvVars.includes(key)) {
				delete process.env[key];
			}
		}
	}
}

// Create and export a singleton instance with the package name from package.json
export const config = new ConfigLoader(
	'@eguenichon/atlassian-bitbucket-server-mcp',
);
