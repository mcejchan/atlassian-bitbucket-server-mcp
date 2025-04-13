import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { repositoriesService } from '../../src/services/atlassianRepositoriesService';
import { writeFileSync } from 'fs';

async function main() {
	const data = await repositoriesService.listRepositories('PRJ');
	writeFileSync('src/services/__fixtures__/listRepositories.json', JSON.stringify(data, null, 2));
	 
	console.log('Fixture written to src/services/__fixtures__/listRepositories.json');
}

main().catch(err => {
	 
	console.error('Error gathering listRepositories fixture:', err);
	process.exit(1);
});
