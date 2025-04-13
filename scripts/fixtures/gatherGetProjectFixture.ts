import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { projectsService } from '../../src/services/atlassianProjectsService';
import { writeFileSync } from 'fs';

async function main() {
	const data = await projectsService.getProject('PRJ');
	writeFileSync('src/services/__fixtures__/getProject.json', JSON.stringify(data, null, 2));
	 
	console.log('Fixture written to src/services/__fixtures__/getProject.json');
}

main().catch(err => {
	 
	console.error('Error gathering getProject fixture:', err);
	process.exit(1);
});
