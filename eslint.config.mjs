import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// Combine all configurations into a single default export array
export default tseslint.config(
	// Global ignores
	{
		ignores: ['node_modules/**', 'dist/**', 'examples/**', 'src/generated/**'],
	},
	// Base ESLint recommended rules
	eslint.configs.recommended,
	// Base TypeScript recommended rules
	...tseslint.configs.recommended,
	// Custom TypeScript rules
	{
		files: ['**/*.ts'], // Apply these rules only to TS files
		rules: {
			indent: ['error', 'tab', { SwitchCase: 1 }],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_' },
			],
			'@typescript-eslint/no-explicit-any': 'off', // Disabled for now
		},
		languageOptions: {
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
			globals: {
				node: 'readonly',
				jest: 'readonly',
			},
		},
	},
	// Specific rules for TypeScript test files
	{
		files: ['**/*.test.ts'],
		rules: {
			// Relax rules that might be annoying in tests
			'@typescript-eslint/no-explicit-any': 'off', // Already off globally, but keep for clarity
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-unsafe-function-type': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
		},
	},
	// Specific config for JS files (like jest.config.js)
	{
		files: ['**/*.js'],
		languageOptions: {
			globals: {
				node: 'readonly',
				jest: 'readonly',
				module: 'readonly', // Allow CommonJS module
				require: 'readonly', // Allow CommonJS require
			}
		},
		rules: {
			// Turn off TypeScript-specific rules for JS files
			...tseslint.configs.disableTypeChecked.rules,
			// Add any other JS-specific rules if needed
			'@typescript-eslint/no-var-requires': 'off' // Allow require() in JS
		}
	}
);
