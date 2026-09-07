import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const model = vi.hoisted(() => ({
    startGame: vi.fn(), ensureDailyProgressCurrent: vi.fn(),
    state: {
        game: null, countdown: null, results: { last: null, all: [] },
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
vi.mock('./components/SpatialPractice', () => ({ default: ({ onExit }: { onExit: () => void }) => <section aria-label="Spatial Practice mode"><button onClick={onExit}>Exit practice</button></section> }));
vi.mock('./components/Swapping', () => ({ default: ({ onExit }: { onExit: () => void }) => <section aria-label="Swapping mode"><button onClick={onExit}>Exit swapping</button></section> }));
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

describe('working memory trainer navigation', () => {
    it('mounts N-back keyboard controls only inside N-back', () => {
        render(<App />);
        fireEvent.keyDown(document, { key: ' ' });
        expect(model.startGame).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'N-back' }));
        fireEvent.keyDown(document, { key: ' ' });
        expect(model.startGame).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'All exercises' }));
        fireEvent.click(screen.getByRole('button', { name: 'Swapping' }));
        expect(screen.getByRole('region', { name: 'Swapping mode' })).toBeTruthy();
        fireEvent.keyDown(document, { key: ' ' });
        expect(model.startGame).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'Exit swapping' }));
        expect(screen.getByRole('heading', { name: 'Choose your practice' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'N-back' }));
        fireEvent.keyDown(document, { key: ' ' });
        expect(model.startGame).toHaveBeenCalledTimes(2);
    });

    it('opens spatial practice and returns to the shared home', () => {
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: 'Spatial sequence' }));
        expect(screen.getByRole('region', { name: 'Spatial Practice mode' })).toBeTruthy();
        expect(screen.queryByRole('region', { name: 'Swapping mode' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Exit practice' }));
        expect(screen.getByRole('button', { name: 'Swapping' })).toBeTruthy();
    });
});
