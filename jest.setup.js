const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables with explicit loading to ensure they're available
// First try to use dotenv's method
dotenv.config();
dotenv.config({ path: '.env.test' });

// Additional explicit loading to make sure variables are set properly
// This is more reliable and visible than dotenv.config() alone
const envPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envPath)) {
	console.log(`Loading test environment variables from ${envPath}`);
	const envConfig = dotenv.parse(fs.readFileSync(envPath));
	for (const k in envConfig) {
		process.env[k] = envConfig[k];
	}

	// Log important variables (but not sensitive tokens)
	console.log(`ATLASSIAN_BITBUCKET_SERVER_URL set to: ${process.env.ATLASSIAN_BITBUCKET_SERVER_URL}`);
	console.log(`DEBUG set to: ${process.env.DEBUG}`);
	console.log(`ACCESS_TOKEN: ${process.env.ATLASSIAN_BITBUCKET_ACCESS_TOKEN ? 'Present (masked)' : 'Missing'}`);
} else {
	console.warn(`Warning: .env.test file not found at ${envPath}`);
} 