import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { repositoriesService } from '../../src/services/atlassianRepositoriesService';
import { writeFileSync } from 'fs';

async function main() {
  const data = await repositoriesService.listCommits('PRJ', 'git-repo');
  writeFileSync('src/services/__fixtures__/listCommits.json', JSON.stringify(data, null, 2));
  // eslint-disable-next-line no-console
  console.log('Fixture written to src/services/__fixtures__/listCommits.json');
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error('Error gathering commits fixture:', err);
  process.exit(1);
});
