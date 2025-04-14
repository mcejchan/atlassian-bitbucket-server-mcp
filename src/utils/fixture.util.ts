import path from 'path';
import fs from 'fs';

/**
 * Gets the absolute path to the fixtures directory
 */
export function getFixturesDir(): string {
	return path.resolve(__dirname, '../services/__fixtures__');
}

/**
 * Gets the absolute path to a specific fixture file
 */
export function getFixturePath(fileName: string): string {
	return path.join(getFixturesDir(), fileName);
}

/**
 * Loads a fixture file as JSON
 */
export function loadJsonFixture<T>(fileName: string): T {
	const filePath = getFixturePath(fileName);
	const fileContent = fs.readFileSync(filePath, 'utf8');
	return JSON.parse(fileContent) as T;
}

/**
 * Loads a fixture file as string
 */
export function loadTextFixture(fileName: string): string {
	const filePath = getFixturePath(fileName);
	return fs.readFileSync(filePath, 'utf8');
} 