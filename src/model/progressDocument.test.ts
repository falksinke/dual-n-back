import { describe, expect, it } from 'vitest';
import { createDefaultLadderStorage } from './ladderPersistence';
import {
    createDefaultProgressDocument,
    normalizeProgressDocument,
    progressDocumentFromParts,
} from './progressDocument';
import { createDefaultPersistableSettings } from './settingsPersistence';
import { createDefaultUiPreferences } from './uiPreferences';

describe('progressDocument', () => {
    it('builds a v1 document from parts', () => {
        const doc = progressDocumentFromParts({
            ladder: createDefaultLadderStorage(),
            settings: createDefaultPersistableSettings(),
            uiPreferences: createDefaultUiPreferences(),
            updatedAt: '2026-07-31T10:00:00.000Z',
        });
        expect(doc.version).toBe(1);
        expect(doc.updatedAt).toBe('2026-07-31T10:00:00.000Z');
        expect(doc.ladder.byMode.dual.stage).toBe('instruction');
    });

    it('normalizes partial JSON without throwing', () => {
        const doc = normalizeProgressDocument({
            settings: { mode: 'triple', playMode: 'adaptive' },
            uiPreferences: {
                version: 2,
                visitCount: 3,
                hapticFeedbackEnabled: false,
            },
            ladder: createDefaultLadderStorage(),
            updatedAt: '2026-07-31T12:00:00.000Z',
        });
        expect(doc.settings.mode).toBe('triple');
        expect(doc.settings.playMode).toBe('adaptive');
        expect(doc.uiPreferences.visitCount).toBe(3);
        expect(doc.uiPreferences.hapticFeedbackEnabled).toBe(false);
        expect(doc.version).toBe(1);
    });

    it('falls back to defaults for garbage input', () => {
        const doc = normalizeProgressDocument(null);
        expect(doc).toMatchObject({
            version: 1,
            settings: createDefaultPersistableSettings(),
        });
        expect(createDefaultProgressDocument().ladder).toEqual(createDefaultLadderStorage());
    });
});
