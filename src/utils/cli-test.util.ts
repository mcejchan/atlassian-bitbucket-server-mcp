import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from './config.util.js';

const execAsync = promisify(exec);

export class CliTestUtil {
    static async runCommand(command: string, args: string[] = []): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }> {
        try {
            // Ensure config is loaded
            config.load();

            // Build the full command
            const fullCommand = `node dist/index.js ${command} ${args.join(' ')}`;

            // Execute the command
            const { stdout, stderr } = await execAsync(fullCommand);
            return {
                stdout,
                stderr,
                exitCode: 0
            };
        } catch (error: any) {
            return {
                stdout: error.stdout || '',
                stderr: error.stderr || '',
                exitCode: error.code || 1
            };
        }
    }

    static async runCommandWithInput(
        command: string,
        args: string[] = [],
        input: string
    ): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }> {
        try {
            // Ensure config is loaded
            config.load();

            // Build the full command
            const fullCommand = `echo "${input}" | node dist/index.js ${command} ${args.join(' ')}`;

            // Execute the command
            const { stdout, stderr } = await execAsync(fullCommand);
            return {
                stdout,
                stderr,
                exitCode: 0
            };
        } catch (error: any) {
            return {
                stdout: error.stdout || '',
                stderr: error.stderr || '',
                exitCode: error.code || 1
            };
        }
    }
} 