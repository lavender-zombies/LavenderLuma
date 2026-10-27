import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, it } from 'vitest';

const sdkRoot = fileURLToPath(new URL('..', import.meta.url));
const compiler = createRequire(import.meta.url).resolve('typescript/bin/tsc');
const manifest = JSON.parse(readFileSync(path.join(sdkRoot, 'package.json'), 'utf8')) as {
    name: string;
    exports: Record<string, string | { import: string; types: string }>;
};
const entrypoints = Object.entries(manifest.exports)
    .filter(([, target]) => typeof target !== 'string')
    .map(([entry]) => `${manifest.name}${entry === '.' ? '' : entry.slice(1)}`);
let consumerRoot: string;

function node(args: string[]): void {
    const result = spawnSync(process.execPath, args, {
        cwd: consumerRoot,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 30_000,
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(
            `Node exited with status ${result.status} (signal ${result.signal}):\n${result.stdout}\n${result.stderr}`,
        );
    }
}

beforeAll(() => {
    consumerRoot = mkdtempSync(path.join(tmpdir(), 'lavenderluma-sdk-package-'));
    const installed = path.join(consumerRoot, 'node_modules', '@lavenderluma', 'sdk');
    mkdirSync(installed, { recursive: true });
    copyFileSync(path.join(sdkRoot, 'package.json'), path.join(installed, 'package.json'));
    copyFileSync(
        path.join(sdkRoot, 'tests', 'fixtures', 'action-types.mts'),
        path.join(consumerRoot, 'action-types.mts'),
    );
    copyFileSync(
        path.join(sdkRoot, 'tests', 'fixtures', 'action-contracts.ts'),
        path.join(consumerRoot, 'action-contracts.ts'),
    );
    copyFileSync(
        path.join(sdkRoot, 'tests', 'fixtures', 'messaging-types.mts'),
        path.join(consumerRoot, 'messaging-types.mts'),
    );

    // Compile fresh output outside the workspace so neither stale dist files nor
    // Vitest's source resolver can hide a broken published entry point.
    node([
        compiler,
        '--project',
        path.join(sdkRoot, 'tsconfig.json'),
        '--outDir',
        path.join(installed, 'dist'),
    ]);
    writeFileSync(
        path.join(consumerRoot, 'consumer.mts'),
        `import { LavenderLumaHttpClient, text, type LavenderLumaKnownAction as RootKnownAction } from '@lavenderluma/sdk';
import { LavenderLumaWebSocketClient, type LavenderLumaHttpClientOptions } from '@lavenderluma/sdk/client';
import { MessageChain } from '@lavenderluma/sdk/messages';
import { isMessageEvent, type EventMiddleware } from '@lavenderluma/sdk/events';
import { LavenderLumaApiError } from '@lavenderluma/sdk/errors';
import { LAVENDERLUMA_ACTIONS, isLavenderLumaAction, type LavenderLumaKnownAction } from '@lavenderluma/sdk/actions';
import type { ActionParams, StatusInfo } from '@lavenderluma/sdk/types';

const options: LavenderLumaHttpClientOptions = { baseUrl: 'http://127.0.0.1:3000/' };
const client = new LavenderLumaHttpClient(options);
const status: Promise<StatusInfo> = client.getStatus();
const message: MessageChain = text('hello').reply(-42);
const params: ActionParams<'send_group_msg'> = { group_id: 123, message: [] };
client.raw('send_group_msg', params);
client.raw('consumer_extension', { custom: true });
client.sendGroupMessage(123, message);
const middleware: EventMiddleware = async (event, context, next) => {
    if (isMessageEvent(event)) await context.reply(text('received'));
    await next();
};
new LavenderLumaWebSocketClient().use(middleware);
const action: RootKnownAction = LAVENDERLUMA_ACTIONS[0];
function known(value: string): LavenderLumaKnownAction | null {
    return isLavenderLumaAction(value) ? value : null;
}
const error = new LavenderLumaApiError({ status: 'failed', retcode: 1, data: null });
export { status, action, known, error };
`,
    );
}, 30_000);

afterAll(() => {
    if (consumerRoot) {
        rmSync(consumerRoot, { recursive: true, force: true });
    }
});

describe('SDK package entry points', () => {
    it.each(entrypoints)('loads %s in native Node without a bundler', (entrypoint) => {
        node(['--input-type=module', '--eval', `await import(${JSON.stringify(entrypoint)});`]);
    });

    it('preserves runtime identities across the root and subpath exports', () => {
        node([
            '--input-type=module',
            '--eval',
            `import assert from 'node:assert/strict';
import * as sdk from '@lavenderluma/sdk';
import * as client from '@lavenderluma/sdk/client';
import * as messages from '@lavenderluma/sdk/messages';
import * as events from '@lavenderluma/sdk/events';
import * as errors from '@lavenderluma/sdk/errors';
import * as actions from '@lavenderluma/sdk/actions';
assert.equal(sdk.LavenderLumaHttpClient, client.LavenderLumaHttpClient);
assert.equal(sdk.LavenderLumaWebSocketClient, client.LavenderLumaWebSocketClient);
assert.equal(sdk.MessageChain, messages.MessageChain);
assert.equal(sdk.quoteMessage, messages.quoteMessage);
assert.equal(sdk.isMessageEvent, events.isMessageEvent);
assert.equal(sdk.LavenderLumaApiError, errors.LavenderLumaApiError);
assert.equal(sdk.LavenderLumaMediaSendError, errors.LavenderLumaMediaSendError);
assert.equal(sdk.LAVENDERLUMA_ACTIONS, actions.LAVENDERLUMA_ACTIONS);
assert.equal(sdk.isLavenderLumaAction, actions.isLavenderLumaAction);
assert.ok(sdk.text('hello') instanceof messages.MessageChain);
assert.equal(actions.isLavenderLumaAction('send_group_msg'), true);
assert.equal(actions.isLavenderLumaAction('consumer_extension'), false);
`,
        ]);
    });

    it.each([
        ['NodeNext', 'NodeNext'],
        ['ESNext', 'Bundler'],
    ])(
        'typechecks a consumer using %s / %s',
        (module, resolution) => {
            node([
                compiler,
                '--noEmit',
                '--strict',
                '--target',
                'ES2022',
                '--lib',
                'ES2022,DOM',
                '--module',
                module,
                '--moduleResolution',
                resolution,
                path.join(consumerRoot, 'consumer.mts'),
                path.join(consumerRoot, 'action-types.mts'),
                path.join(consumerRoot, 'messaging-types.mts'),
            ]);
        },
        30_000,
    );
});
