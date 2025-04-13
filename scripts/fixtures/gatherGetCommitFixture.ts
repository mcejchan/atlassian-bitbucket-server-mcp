import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { repositoriesService } from '../../src/services/atlassianRepositoriesService';
import { writeFileSync } from 'fs';

async function main() {
	const data = await repositoriesService.getCommit('PRJ', 'git-repo', '12345679e4240c758669d14db6aad117e72d');
	writeFileSync('src/services/__fixtures__/getCommit.json', JSON.stringify(data, null, 2));
	 
	console.log('Fixture written to src/services/__fixtures__/getCommit.json');
}

main().catch(err => {
	 
	console.error('Error gathering getCommit fixture:', err);
	process.exit(1);
});
