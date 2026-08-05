import { describe, expect, it } from 'vitest';
import {
    createDefaultAdaptiveLadderStorage,
    createDefaultCyclicLadderStorage,
} from './ladderPersistence';
import {
    createDefaultProgressDocument,
    normalizeProgressDocument,
    progressDocumentFromParts,
} from './progressDocument';
import { createDefaultPersistableSettings } from './settingsPersistence';
import { createDefaultUiPreferences } from './uiPreferences';
import { createDefaultCurriculumLadder } from './adaptiveCurriculum';

describe('progressDocument', () => {
    it('builds a v1 document from parts', () => {
        const doc = progressDocumentFromParts({
            ladder: createDefaultAdaptiveLadderStorage(),
            cyclicLadder: createDefaultCyclicLadderStorage(),
            settings: createDefaultPersistableSettings(),
            uiPreferences: createDefaultUiPreferences(),
            updatedAt: '2026-07-31T10:00:00.000Z',
        });
        expect(doc.version).toBe(1);
        expect(doc.updatedAt).toBe('2026-07-31T10:00:00.000Z');
        expect(doc.ladder.byMode.dual.levelIndex).toBe(0);
        expect(doc.cyclicLadder.byMode.dual.stage).toBe('teach_walkthrough');
    });

    it('normalizes partial JSON without throwing', () => {
        const doc = normalizeProgressDocument({
            settings: { mode: 'triple', playMode: 'cyclic' },
            uiPreferences: {
                version: 2,
                visitCount: 3,
                hapticFeedbackEnabled: false,
            },
            ladder: createDefaultAdaptiveLadderStorage(),
            cyclicLadder: createDefaultCyclicLadderStorage(),
            updatedAt: '2026-07-31T12:00:00.000Z',
        });
        expect(doc.settings.mode).toBe('triple');
        expect(doc.settings.playMode).toBe('cyclic');
        expect(doc.uiPreferences.visitCount).toBe(3);
        expect(doc.uiPreferences.hapticFeedbackEnabled).toBe(false);
        expect(doc.version).toBe(1);
    });

    it('migrates a legacy v3-only ladder field into cyclicLadder', () => {
        const cyclic = createDefaultCyclicLadderStorage();
        cyclic.byMode.dual = {
            ...createDefaultCurriculumLadder(),
            stage: 'fixed_clean',
        };
        const doc = normalizeProgressDocument({
            ladder: cyclic,
            settings: { playMode: 'adaptive' },
        });
        expect(doc.ladder.byMode.dual.levelIndex).toBe(0);
        expect(doc.cyclicLadder.byMode.dual.stage).toBe('fixed_clean');
    });

    it('falls back to defaults for garbage input', () => {
        const doc = normalizeProgressDocument(null);
        expect(doc).toMatchObject({
            version: 1,
            settings: createDefaultPersistableSettings(),
        });
        expect(createDefaultProgressDocument().ladder).toEqual(
            createDefaultAdaptiveLadderStorage()
        );
        expect(createDefaultProgressDocument().cyclicLadder).toEqual(
            createDefaultCyclicLadderStorage()
        );
    });
});
