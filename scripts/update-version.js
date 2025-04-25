const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];
if (!newVersion) {
	console.error('Error: New version not provided.');
	process.exit(1);
}

const packageJsonPath = path.resolve(__dirname, '../package.json');

try {
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
	packageJson.version = newVersion;
	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n');
	console.log(`Updated package.json version to ${newVersion}`);
} catch (error) {
	console.error(`Error updating package.json: ${error.message}`);
	process.exit(1);
} 