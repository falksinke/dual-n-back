import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import StatisticsPanel from '.';
import { appendStatisticsRound, type StatisticsRound } from '../../model/statistics';

function round(overrides: Partial<StatisticsRound> = {}): StatisticsRound {
    return {
        id: 'dual-round',
        completedAt: '2026-08-19T10:00:00.000+02:00',
        durationMs: 60_000,
        playMode: 'free',
        blockRole: 'free',
        mode: 'dual',
        nBack: 2,
        scorePct: 75,
        modalityScores: { position: 80, audio: 70 },
        variableN: null,
        ...overrides,
    };
}

describe('StatisticsPanel', () => {
    beforeEach(() => {
        const storage = new Map<string, string>();
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
        });
        appendStatisticsRound(round());
        appendStatisticsRound(
            round({
                id: 'triple-round',
                completedAt: '2026-08-20T11:00:00.000+02:00',
                mode: 'triple',
                nBack: 3,
                scorePct: 90,
                modalityScores: { position: 90, color: 85, audio: 95 },
            })
        );
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('shows Brain Workshop-style progress, summaries, and recent rounds', () => {
        render(<StatisticsPanel open onClose={vi.fn()} />);

        expect(screen.getByRole('dialog', { name: 'Statistics' })).toBeTruthy();
        expect(screen.getByText('2', { selector: '.statistics-metric-value' })).toBeTruthy();
        expect(
            screen.getByText('82.5%', { selector: '.statistics-metric-value' })
        ).toBeTruthy();
        expect(
            screen.getByText('2.50', { selector: '.statistics-metric-value' })
        ).toBeTruthy();
        expect(screen.getByRole('img', { name: 'Daily N-back progress' })).toBeTruthy();
        expect(screen.getByText('Triple 3-back')).toBeTruthy();
        expect(screen.getByText('Dual 2-back')).toBeTruthy();
    });

    it('filters the full panel by mode', () => {
        render(<StatisticsPanel open onClose={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'Dual' }));

        expect(screen.getByText('1', { selector: '.statistics-metric-value' })).toBeTruthy();
        expect(
            screen.getByText('75%', { selector: '.statistics-metric-value' })
        ).toBeTruthy();
        expect(screen.queryByText('Triple 3-back')).toBeNull();
        expect(screen.getByText('Dual 2-back')).toBeTruthy();
    });

    it('explains why one training day has no trend graph', () => {
        render(<StatisticsPanel open onClose={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Dual' }));

        expect(screen.getByText('Two training days are needed for the progress graph.')).toBeTruthy();
        expect(screen.queryByRole('img', { name: 'Daily N-back progress' })).toBeNull();
    });

    it('closes through the visible close button', () => {
        const onClose = vi.fn();
        render(<StatisticsPanel open onClose={onClose} />);

        fireEvent.click(screen.getByRole('button', { name: 'Close statistics' }));
        expect(onClose).toHaveBeenCalledOnce();
    });
});
