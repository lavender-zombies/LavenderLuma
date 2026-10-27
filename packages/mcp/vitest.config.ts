// Vitest config — used only to RUN the catalog generator (scripts/gen-catalog.test.ts)
// in an environment where `@lavenderluma/onebot/action-docs` resolves. The proton
// plugin provides the same bare-specifier resolver @lavenderluma/onebot's own tests
// use, so importing the action specs works identically here.
import protobufVitePlugin from '@lavenderluma/proton/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [protobufVitePlugin()],
    test: {
        include: ['scripts/**/*.test.ts', 'tests/**/*.test.ts'],
        environment: 'node',
        env: {
            LAVENDERLUMA_LOG_FILE: '0',
        },
    },
});
