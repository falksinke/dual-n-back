import { describe, expect, it } from 'vitest';
import { clampIsiMs, msToSecondsLabel } from './isi';

describe('isi helpers', () => {
    it('clamps and snaps ISI to 100ms steps within 0.5–5s', () => {
        expect(clampIsiMs(0)).toBe(500);
        expect(clampIsiMs(10_000)).toBe(5000);
        expect(clampIsiMs(1234)).toBe(1200);
    });

    it('formats seconds for labels', () => {
        expect(msToSecondsLabel(500)).toBe('0.5');
        expect(msToSecondsLabel(5000)).toBe('5');
    });
});
