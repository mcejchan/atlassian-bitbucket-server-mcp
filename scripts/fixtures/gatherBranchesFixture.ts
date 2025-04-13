import { repositoriesService } from '../../src/services/atlassianRepositoriesService';
import { writeFileSync } from 'fs';

async function main() {
	const data = await repositoriesService.listBranches('PRJ', 'git-repo');
	writeFileSync('src/services/__fixtures__/listBranches.json', JSON.stringify(data, null, 2));
	 
	console.log('Fixture written to src/services/__fixtures__/listBranches.json');
}

main().catch(err => {
	 
	console.error('Error gathering branches fixture:', err);
	process.exit(1);
});
