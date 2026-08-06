import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import DailyProgressDots from './index';

describe('DailyProgressDots', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders all empty when nothing completed', () => {
        render(
            <DailyProgressDots completedCount={0} dailyRounds={20} dailySessions={4} />
        );
        const region = screen.getByLabelText('Daily progress: 0 of 20 rounds');
        const dots = region.querySelectorAll('.daily-progress-dots__dot');
        expect(dots).toHaveLength(20);
        expect(region.querySelectorAll('.is-filled')).toHaveLength(0);
    });

    it('exposes a single static accessible name without live region chatter', () => {
        render(
            <DailyProgressDots completedCount={0} dailyRounds={20} dailySessions={4} />
        );
        const regions = screen.getAllByLabelText('Daily progress: 0 of 20 rounds');
        expect(regions).toHaveLength(1);
        const region = regions[0];
        expect(region.getAttribute('role')).toBeNull();
        expect(region.getAttribute('aria-live')).toBeNull();
        expect(region.querySelector('.visually-hidden')).toBeNull();
    });

    it('marks first session filled with session-end on last of group', () => {
        render(
            <DailyProgressDots completedCount={5} dailyRounds={20} dailySessions={4} />
        );
        const region = screen.getByLabelText('Daily progress: 5 of 20 rounds');
        expect(region.querySelectorAll('.is-filled')).toHaveLength(5);
        const sessionEnds = region.querySelectorAll('.is-session-end');
        expect(sessionEnds).toHaveLength(1);
        // Index 4 is last of first group of 5
        const dots = [...region.querySelectorAll('.daily-progress-dots__dot')];
        expect(dots[4].classList.contains('is-session-end')).toBe(true);
    });

    it('hides when dailyRounds is 0', () => {
        const { container } = render(
            <DailyProgressDots completedCount={0} dailyRounds={0} dailySessions={4} />
        );
        expect(container.querySelector('.daily-progress-dots')).toBeNull();
    });

    it('exposes all dots even when wrapping layout would apply', () => {
        render(
            <DailyProgressDots completedCount={2} dailyRounds={20} dailySessions={4} />
        );
        expect(
            screen.getByLabelText('Daily progress: 2 of 20 rounds').querySelectorAll(
                '.daily-progress-dots__dot'
            )
        ).toHaveLength(20);
    });
});
