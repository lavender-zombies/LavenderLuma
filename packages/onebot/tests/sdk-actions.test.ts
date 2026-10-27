import { describe, expect, it } from 'vitest';
import { LAVENDERLUMA_ACTIONS, isLavenderLumaAction } from '../../sdk/src/actions.js';
import { ACTION_REGISTRY } from '../src/actions';

describe('SDK action catalog compatibility', () => {
    it('covers every executable name, including aliases and raw actions, exactly once', () => {
        const registered = ACTION_REGISTRY.executableNames.map(({ name }) => name);
        expect([...LAVENDERLUMA_ACTIONS].sort()).toEqual(registered.sort());
        expect(new Set(LAVENDERLUMA_ACTIONS).size).toBe(LAVENDERLUMA_ACTIONS.length);

        for (const name of registered) {
            expect(isLavenderLumaAction(name), name).toBe(true);
        }
    });

    it.each(['', 'consumer_extension', 'SEND_GROUP_MSG', 'send_group_msg '])(
        'does not recognize unregistered name %j',
        (name) => {
            expect(isLavenderLumaAction(name)).toBe(false);
        },
    );
});
