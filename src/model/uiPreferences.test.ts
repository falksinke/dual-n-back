import { describe, expect, it } from 'vitest';
import {
    createDefaultUiPreferences,
    dismissInstallNudge,
    loadUiPreferences,
    parseUiPreferences,
    recordBlockCompleted,
    recordVisit,
    saveUiPreferences,
} from './uiPreferences';

function memoryStorage(initial: Record<string, string> = {}) {
    const map = new Map(Object.entries(initial));
    return {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => {
            map.set(key, value);
        },
    };
}

describe('uiPreferences', () => {
    it('defaults haptic feedback on and zero engagement', () => {
        expect(createDefaultUiPreferences()).toMatchObject({
            visitCount: 0,
            blocksCompleted: 0,
            installNudgeDismissedAt: null,
            hapticFeedbackEnabled: true,
            version: 2,
        });
    });

    it('enables haptics when migrating from schema v1', () => {
        const migrated = parseUiPreferences(
            JSON.stringify({
                version: 1,
                visitCount: 3,
                blocksCompleted: 1,
                installNudgeDismissedAt: null,
                hapticFeedbackEnabled: false,
            })
        );
        expect(migrated.version).toBe(2);
        expect(migrated.hapticFeedbackEnabled).toBe(true);
        expect(migrated.visitCount).toBe(3);
    });

    it('records visits and block completions', () => {
        const storage = memoryStorage();
        expect(recordVisit(storage).visitCount).toBe(1);
        expect(recordVisit(storage).visitCount).toBe(2);
        expect(recordBlockCompleted(storage).blocksCompleted).toBe(1);
        expect(loadUiPreferences(storage).visitCount).toBe(2);
    });

    it('persists dismiss timestamp', () => {
        const storage = memoryStorage();
        const next = dismissInstallNudge(1_700_000_000_000, storage);
        expect(next.installNudgeDismissedAt).toBe(1_700_000_000_000);
        expect(loadUiPreferences(storage).installNudgeDismissedAt).toBe(1_700_000_000_000);
    });

    it('round-trips through save/load', () => {
        const storage = memoryStorage();
        const data = {
            ...createDefaultUiPreferences(),
            visitCount: 3,
            blocksCompleted: 2,
        };
        saveUiPreferences(data, storage);
        expect(loadUiPreferences(storage)).toEqual(data);
    });

    it('falls back on corrupt JSON', () => {
        expect(parseUiPreferences('{')).toEqual(createDefaultUiPreferences());
    });
});
