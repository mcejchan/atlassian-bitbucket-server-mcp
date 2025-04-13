/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/src/**/*.test.ts'],
	transform: {
		'^.+\\.tsx?$': ['ts-jest', { useESM: true }],
	},
	extensionsToTreatAsEsm: ['.ts'],
	moduleNameMapper: {
		'^@src/(.*)$': '<rootDir>/src/$1',
		'^@generated/(.*)$': '<rootDir>/src/generated/$1',
	},
	modulePathIgnorePatterns: [
		'<rootDir>/dist/'
	],
};
