import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { repositoriesService } from '../../src/services/atlassianRepositoriesService';
import { writeFileSync } from 'fs';

async function main() {
	const data = await repositoriesService.listFiles('PRJ', 'git-repo');
	writeFileSync('src/services/__fixtures__/listFiles.json', JSON.stringify(data, null, 2));
	 
	console.log('Fixture written to src/services/__fixtures__/listFiles.json');
}

main().catch(err => {
	 
	console.error('Error gathering files fixture:', err);
	process.exit(1);
});
