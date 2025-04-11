import * as dotenv from 'dotenv';
import { config } from './src/utils/config.util.js';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.test' });

// Load configuration
config.load(); 