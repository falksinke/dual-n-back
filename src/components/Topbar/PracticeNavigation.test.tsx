import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Topbar from './index';
import { useKeyboardControls } from '../../hooks/useKeyboardControls';

const startGame = vi.hoisted(() => vi.fn());
vi.mock('../../store/gameStore', () => ({
    useGameStore: { getState: () => ({
        game: null, countdown: null, activeModalities: [], adaptiveSession: null,
        settings: { playMode: 'manual' }, startGame,
    }) },
}));
vi.mock('../SettingsPanel', () => ({ default: () => null }));
vi.mock('../DailyProgressDots', () => ({ default: () => null }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

function Navigation({ onHome }: { onHome: () => void }) {
    useKeyboardControls();
    return <Topbar onHome={onHome} settingsOpen={false}
        onSettingsOpenChange={() => {}} statisticsOpen={false} onStatisticsOpenChange={() => {}} />;
}

describe('Trainer home entry keyboard ownership', () => {
    it('preserves native Space activation and the global non-control shortcut', () => {
        const onHome = vi.fn();
        render(<Navigation onHome={onHome} />);
        const button = screen.getByRole('button', { name: 'All exercises' });
        button.focus();
        const key = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
        fireEvent(button, key);
        expect(key.defaultPrevented).toBe(false);
        expect(startGame).not.toHaveBeenCalled();
        // jsdom does not synthesize a native click from keyboard events.
        fireEvent.click(button);
        expect(onHome).toHaveBeenCalledOnce();
        fireEvent.keyDown(document, { key: ' ' });
        expect(startGame).toHaveBeenCalledOnce();
    });
});
