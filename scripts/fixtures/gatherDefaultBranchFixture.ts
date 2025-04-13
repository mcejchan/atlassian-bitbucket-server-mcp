import * as dotenv from 'dotenv';
const dotenvResult = dotenv.config({ path: '.env.test' });

import { writeFileSync } from 'fs';
import { repositoriesService } from '../../src/services/atlassianRepositoriesService';

console.log('CWD:', process.cwd());
console.log('dotenv.config() result:', dotenvResult);
console.log('ATLASSIAN_BITBUCKET_SERVER_URL:', process.env.ATLASSIAN_BITBUCKET_SERVER_URL);

async function main() {
	const data = await repositoriesService.getDefaultBranch('PRJ', 'git-repo');
	writeFileSync('src/services/__fixtures__/getDefaultBranch.json', JSON.stringify(data, null, 2));
	 
	console.log('Fixture written to src/services/__fixtures__/getDefaultBranch.json');
}

main().catch(err => {
	 
	console.error('Error gathering default branch fixture:', err);
	process.exit(1);
});
