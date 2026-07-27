import { describe, expect, it } from 'vitest';
import {
    blockRoleLabel,
    controllerActionHint,
    formatSdtMetric,
} from './adaptiveDisplay';

describe('adaptiveDisplay', () => {
    it('formats finite SDT metrics to two decimals', () => {
        expect(formatSdtMetric(1.234)).toBe('1.23');
        expect(formatSdtMetric(0)).toBe('0.00');
    });

    it('shows em dash for non-finite SDT metrics', () => {
        expect(formatSdtMetric(Number.NaN)).toBe('—');
        expect(formatSdtMetric(Number.POSITIVE_INFINITY)).toBe('—');
    });

    it('maps block roles to trainee-facing labels', () => {
        expect(blockRoleLabel('anchor-open')).toBe('Calibration');
        expect(blockRoleLabel('adaptive')).toBe('Adaptive block');
        expect(blockRoleLabel('free')).toBeNull();
    });

    it('builds controller action hints from reason text', () => {
        expect(
            controllerActionHint({ action: 'hold', reason: 'Need more evidence' })
        ).toBe('Hold: Need more evidence');
        expect(controllerActionHint({ action: 'lureUp', reason: 'Clean mastery' })).toBe(
            'Lure stage up: Clean mastery'
        );
    });
});
