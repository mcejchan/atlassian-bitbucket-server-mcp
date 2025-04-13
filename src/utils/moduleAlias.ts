import path from 'path';
import moduleAlias from 'module-alias';

// Setup module aliases to match tsconfig.json paths
const baseDir = path.resolve(process.cwd());

moduleAlias.addAliases({
  '@src': path.join(baseDir, 'dist'),
  '@generated': path.join(baseDir, 'dist/generated')
});

export default moduleAlias; 