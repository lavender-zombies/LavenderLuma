import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';
import protobufVitePlugin from '@lavenderluma/proton/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [protobufVitePlugin()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    test: {
        include: ['tests/**/*.test.ts'],
        environment: 'node',
        // Suppress the logger's file transport during tests so the suite
        // doesn't litter cwd with logs/lavenderluma-*.log files. Tests that
        // explicitly cover file output set their own LAVENDERLUMA_LOG_FILE='1'
        // + LAVENDERLUMA_LOG_DIR=<tmp>.
        //
        // Run at debug level so tests asserting on debug-level log entries
        // (e.g. action dispatch entry lines) actually see them via the
        // ring buffer / subscribers, which sit behind the console-level gate.
        env: {
            LAVENDERLUMA_LOG_FILE: '0',
            LAVENDERLUMA_LOG_LEVEL: 'debug',
        },
    },
});
