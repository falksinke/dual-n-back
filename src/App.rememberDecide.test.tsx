import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const model = vi.hoisted(() => ({
    startGame: vi.fn(), ensureDailyProgressCurrent: vi.fn(),
    state: {
        game: null, countdown: null, results: { last: null, all: [{ id: 'saved-nback-result' }] },
        settings: { playMode: 'manual', level: 1, mode: 'dual', variableN: false, trials: 20, dailyRounds: 0 },
        boardState: { currentTrials: 0, nForTrial: 0 },
        ladder: { dual: { levelIndex: 0, failStreak: 0 } },
        cyclicLadder: { dual: { track: 'default', n: 1, stage: 'play' } },
        adaptiveSession: null, activeModalities: [], teachIntroDismissed: true,
        teachOptOutWarnShown: false,
    },
}));

vi.mock('./store/gameStore', () => {
    const state = { ...model.state, startGame: model.startGame, ensureDailyProgressCurrent: model.ensureDailyProgressCurrent };
    return {
        useGameStore: Object.assign(<T,>(select: (value: typeof state) => T) => select(state), { getState: () => state }),
        isLadderPlayMode: () => false,
    };
});
vi.mock('./components/Topbar', () => ({ default: ({ onHome }: { onHome: () => void }) => <button onClick={onHome}>All exercises</button> }));
vi.mock('./components/SpatialPractice', () => ({ default: ({ onExit }: { onExit: () => void }) => <section aria-label="Spatial Practice mode"><button onClick={onExit}>Exit spatial</button></section> }));
vi.mock('./components/Swapping', () => ({ default: ({ onExit }: { onExit: () => void }) => <section aria-label="Swapping mode"><button onClick={onExit}>Exit swapping</button></section> }));
vi.mock('./components/RememberDecide', () => ({ default: ({ onExit }: { onExit: () => void }) => <section aria-label="Remember and Decide"><label>Local answer<input aria-label="Local answer" /></label><button onClick={onExit}>Exit remember and decide</button></section> }));
vi.mock('./hooks/useThemeVariables', () => ({ useThemeVariables: () => {} }));
vi.mock('./haptics/useHaptics', () => ({ useHaptics: () => {} }));
vi.mock('./model/uiPreferences', () => ({ loadUiPreferences: () => ({ hapticFeedbackEnabled: false }) }));
vi.mock('./pwa/registerSW', () => ({ applyPendingUpdate: () => {}, subscribeUpdateReady: () => () => {} }));
vi.mock('./components/Board', () => ({ default: () => null }));
vi.mock('./components/Footer', () => ({ default: () => null }));
vi.mock('./components/utils/UserMatchNotice', () => ({ default: () => null }));
vi.mock('./components/CountdownFlash', () => ({ default: () => null }));
vi.mock('./components/AdaptiveProgressHud', () => ({ default: () => null }));
vi.mock('./components/VariableNHud', () => ({ default: () => null }));
vi.mock('./components/StrategyInstruction', () => ({ default: () => null }));
vi.mock('./components/TeachOptOutWarn', () => ({ default: () => null }));
vi.mock('./components/InstallNudge', () => ({ default: () => null }));
vi.mock('./components/SessionExitButton', () => ({ default: () => null }));
vi.mock('./components/StatisticsPanel', () => ({ default: () => null }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('Remember & Decide navigation', () => {
    it('opens as a peer mode, exits home, and leaves the other entries routed explicitly', () => {
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: 'The Moth Keeper' }));
        expect(screen.getByRole('region', { name: 'Remember and Decide' })).toBeTruthy();
        expect(screen.queryByRole('region', { name: 'Swapping mode' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Exit remember and decide' }));

        fireEvent.click(screen.getByRole('button', { name: 'Firefly Post' }));
        expect(screen.getByRole('region', { name: 'Spatial Practice mode' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Exit spatial' }));
        fireEvent.click(screen.getByRole('button', { name: 'Midnight Shunting' }));
        expect(screen.getByRole('region', { name: 'Swapping mode' })).toBeTruthy();
    });

    it('mounts N-back keyboard controls only when N-back is selected', () => {
        render(<App />);
        fireEvent.keyDown(document, { key: ' ' });
        expect(model.startGame).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'The Moth Keeper' }));
        fireEvent.keyDown(document, { key: ' ' });
        expect(model.startGame).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Exit remember and decide' }));
        fireEvent.click(screen.getByRole('button', { name: 'N-back' }));
        fireEvent.keyDown(document, { key: ' ' });
        expect(model.startGame).toHaveBeenCalledTimes(1);
    });

    it('resets local mode state when reopened without changing N-back history', () => {
        const savedHistory = model.state.results.all;
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: 'The Moth Keeper' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Local answer' }), { target: { value: 'in progress' } });
        fireEvent.click(screen.getByRole('button', { name: 'Exit remember and decide' }));
        fireEvent.click(screen.getByRole('button', { name: 'The Moth Keeper' }));
        expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Local answer' }).value).toBe('');
        expect(model.state.results.all).toBe(savedHistory);
    });
});
