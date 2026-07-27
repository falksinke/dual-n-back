import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { COUNTDOWN_START, COUNTDOWN_TICK_MS, useGameStore } from './gameStore';
import { ButtonState } from '../model/enums/buttonState';
import { DEFAULT_ISI_MAX_MS, DEFAULT_ISI_MIN_MS } from '../model/isi';
import { createDefaultLadderByMode, LADDER_STORAGE_KEY } from '../model/ladderPersistence';
import { GameResult } from '../model/GameResult';
import { createInitialAdaptiveSession } from './adaptiveSession';

async function finishCountdown() {
    await vi.advanceTimersByTimeAsync(COUNTDOWN_START * COUNTDOWN_TICK_MS);
}

describe('gameStore', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(useGameStore.getState().speech, 'play').mockImplementation(() => undefined);
        useGameStore.setState({
            game: null,
            countdown: null,
            activeModalities: ['position', 'audio'],
            results: { all: [], last: null },
            boardState: {
                positionIndex: -1,
                audioToken: null,
                colorId: null,
                imageId: null,
                currentTrials: -1,
                nForTrial: -1,
            },
            btns: { audio: ButtonState.None, position: ButtonState.None },
            ladder: createDefaultLadderByMode(),
            adaptiveSession: null,
            lastBlockRole: null,
            lastControllerAction: null,
            blockModalities: null,
            freePlaySettingsSnapshot: null,
            settings: {
                level: 2,
                trials: 1,
                isiMin: 5000,
                isiMax: 5000,
                activeFeedback: false,
                displayTrials: true,
                displayTarget: true,
                allowCenterStimulus: true,
                useFullScreen: false,
                mode: 'dual',
                audioPack: 'letters',
                interferenceChance: 0.125,
                variableN: false,
                playMode: 'free',
            },
        });
    });

    afterEach(() => {
        useGameStore.getState().cancelGame();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('runs a 3-2-1 countdown before launching the session', async () => {
        useGameStore.getState().startGame();
        expect(useGameStore.getState().countdown).toBe(3);
        expect(useGameStore.getState().game).toBeNull();

        await vi.advanceTimersByTimeAsync(COUNTDOWN_TICK_MS);
        expect(useGameStore.getState().countdown).toBe(2);

        await vi.advanceTimersByTimeAsync(COUNTDOWN_TICK_MS);
        expect(useGameStore.getState().countdown).toBe(1);

        await vi.advanceTimersByTimeAsync(COUNTDOWN_TICK_MS);
        expect(useGameStore.getState().countdown).toBeNull();
        expect(useGameStore.getState().game).not.toBeNull();
        expect(useGameStore.getState().boardState.positionIndex).toBeGreaterThanOrEqual(0);
    });

    it('starts a game and updates board state from callbacks', async () => {
        useGameStore.getState().startGame();
        await finishCountdown();
        expect(useGameStore.getState().game).not.toBeNull();
        expect(useGameStore.getState().boardState.positionIndex).toBeGreaterThanOrEqual(0);
    });

    it('clears highlight after stimulus duration', async () => {
        useGameStore.getState().startGame();
        await finishCountdown();
        expect(useGameStore.getState().boardState.positionIndex).toBeGreaterThanOrEqual(0);

        await vi.advanceTimersByTimeAsync(1000);
        expect(useGameStore.getState().boardState.positionIndex).toBe(-1);
    });

    it('cancel clears game without pushing results', async () => {
        useGameStore.getState().startGame();
        await finishCountdown();
        useGameStore.getState().cancelGame();

        expect(useGameStore.getState().game).toBeNull();
        expect(useGameStore.getState().results.last).toBeNull();
    });

    it('cancel during countdown aborts before session launch', async () => {
        useGameStore.getState().startGame();
        expect(useGameStore.getState().countdown).toBe(3);
        useGameStore.getState().cancelGame();

        await finishCountdown();
        expect(useGameStore.getState().countdown).toBeNull();
        expect(useGameStore.getState().game).toBeNull();
    });

    it('throws when starting while a game is active', async () => {
        useGameStore.getState().startGame();
        await finishCountdown();
        expect(() => useGameStore.getState().startGame()).toThrow('Game is already defined');
    });

    it('throws when starting while countdown is in progress', () => {
        useGameStore.getState().startGame();
        expect(() => useGameStore.getState().startGame()).toThrow('Countdown is already in progress');
    });

    it('starts triple mode with piano without throw and carries color id', async () => {
        useGameStore.setState((state) => ({
            settings: {
                ...state.settings,
                mode: 'triple',
                audioPack: 'piano',
                trials: 1,
                isiMin: 5000,
                isiMax: 5000,
            },
            speech: useGameStore.getState().speech,
        }));
        useGameStore.getState().setAudioPack('piano');

        expect(() => useGameStore.getState().startGame()).not.toThrow();
        await finishCountdown();
        expect(useGameStore.getState().activeModalities).toEqual(['position', 'color', 'audio']);
        expect(useGameStore.getState().boardState.colorId).not.toBeNull();

        useGameStore.getState().cancelGame();
    });

    it('snapshots mode and interference at session start', async () => {
        useGameStore.getState().startGame();
        await finishCountdown();
        const session = useGameStore.getState().game!;

        useGameStore.getState().setMode('quad');
        useGameStore.getState().cycleInterferenceChance();

        expect((session as unknown as { modalities: string[] }).modalities).toEqual([
            'position',
            'audio',
        ]);

        useGameStore.getState().cancelGame();
    });

    it('defaults playMode to free and keeps ladder separate from manual settings', () => {
        expect(useGameStore.getState().settings.playMode).toBe('free');
        expect(useGameStore.getState().ladder.dual).toEqual({
            n: 2,
            lureStage: 'A',
            isiTier: 0,
        });
        expect(useGameStore.getState().settings.level).toBe(2);
    });

    it('applies adaptive ladder to settings when switching playMode while idle', () => {
        useGameStore.setState((state) => ({
            ladder: {
                ...state.ladder,
                dual: { n: 4, lureStage: 'D', isiTier: 0 },
            },
            settings: {
                ...state.settings,
                level: 5,
                variableN: true,
                interferenceChance: 0.5,
            },
        }));

        useGameStore.getState().setPlayMode('adaptive');

        const { settings } = useGameStore.getState();
        expect(settings.playMode).toBe('adaptive');
        expect(settings.level).toBe(4);
        expect(settings.lureStage).toBe('D');
        expect(settings.variableN).toBe(false);
        expect(settings.isiMin).toBe(DEFAULT_ISI_MIN_MS);
        expect(settings.isiMax).toBe(DEFAULT_ISI_MAX_MS);
        // Free-play knobs remain in store but adaptive session uses ladder-driven fields.
        expect(settings.interferenceChance).toBe(0.5);
    });

    it('rejects playMode changes during countdown or active session', async () => {
        useGameStore.getState().startGame();
        expect(useGameStore.getState().countdown).toBe(3);
        useGameStore.getState().setPlayMode('adaptive');
        expect(useGameStore.getState().settings.playMode).toBe('free');

        await finishCountdown();
        useGameStore.getState().setPlayMode('adaptive');
        expect(useGameStore.getState().settings.playMode).toBe('free');

        useGameStore.getState().cancelGame();
    });

    it('applies mode ladder when switching mode in adaptive playMode while idle', () => {
        useGameStore.setState((state) => ({
            ladder: {
                ...state.ladder,
                dual: { n: 3, lureStage: 'B', isiTier: 0 },
                triple: { n: 5, lureStage: 'E', isiTier: 0 },
            },
            settings: { ...state.settings, playMode: 'adaptive', mode: 'dual', level: 3 },
        }));

        useGameStore.getState().setMode('triple');

        const { settings } = useGameStore.getState();
        expect(settings.mode).toBe('triple');
        expect(settings.level).toBe(5);
        expect(settings.lureStage).toBe('E');
    });

    it('persists ladder state via saveLadder', () => {
        const storage = {
            data: {} as Record<string, string>,
            getItem(key: string) {
                return this.data[key] ?? null;
            },
            setItem(key: string, value: string) {
                this.data[key] = value;
            },
        };
        vi.stubGlobal('localStorage', storage);

        useGameStore.setState((state) => ({
            ladder: {
                ...state.ladder,
                quad: { n: 6, lureStage: 'C', isiTier: 1 },
            },
        }));

        useGameStore.getState().saveLadder();

        const raw = storage.getItem(LADDER_STORAGE_KEY);
        expect(raw).not.toBeNull();
        expect(JSON.parse(raw!)).toEqual({
            version: 1,
            byMode: {
                dual: { n: 2, lureStage: 'A', isiTier: 0 },
                triple: { n: 2, lureStage: 'A', isiTier: 0 },
                quad: { n: 6, lureStage: 'C', isiTier: 1 },
            },
        });

        vi.unstubAllGlobals();
    });

    it('starts adaptive session in anchor-open after countdown', async () => {
        useGameStore.getState().setPlayMode('adaptive');
        useGameStore.getState().startGame();
        expect(useGameStore.getState().adaptiveSession?.phase).toBe('anchor-open');

        await finishCountdown();
        expect(useGameStore.getState().adaptiveSession?.phase).toBe('anchor-open');
        expect(useGameStore.getState().game).not.toBeNull();
        expect(useGameStore.getState().settings.variableN).toBe(false);
        expect(useGameStore.getState().settings.lureStage).toBe('A');

        useGameStore.getState().cancelGame();
    });

    it('clears adaptive session when canceling mid adaptive run', async () => {
        useGameStore.getState().setPlayMode('adaptive');
        useGameStore.getState().startGame();
        await finishCountdown();
        expect(useGameStore.getState().adaptiveSession).not.toBeNull();

        useGameStore.getState().cancelGame();
        expect(useGameStore.getState().adaptiveSession).not.toBeNull();
        expect(useGameStore.getState().adaptiveSession?.pendingContinue).toBe(true);
        expect(useGameStore.getState().adaptiveSession?.phase).toBe('interstitial');
    });

    it('preserves adaptive session when canceling during countdown', async () => {
        useGameStore.getState().setPlayMode('adaptive');
        useGameStore.getState().startGame();
        expect(useGameStore.getState().countdown).toBe(3);
        expect(useGameStore.getState().adaptiveSession?.phase).toBe('anchor-open');

        useGameStore.getState().cancelGame();

        expect(useGameStore.getState().countdown).toBeNull();
        expect(useGameStore.getState().game).toBeNull();
        expect(useGameStore.getState().adaptiveSession?.phase).toBe('anchor-open');
        expect(useGameStore.getState().adaptiveSession?.pendingContinue).toBe(false);
    });

    it('restores free-play settings when leaving adaptive mode', () => {
        useGameStore.setState((state) => ({
            settings: {
                ...state.settings,
                level: 7,
                isiMin: 4000,
                isiMax: 6000,
                variableN: true,
                interferenceChance: 0.5,
                playMode: 'free',
            },
        }));

        useGameStore.getState().setPlayMode('adaptive');
        expect(useGameStore.getState().settings.level).toBe(2);
        expect(useGameStore.getState().freePlaySettingsSnapshot).toEqual({
            level: 7,
            isiMin: 4000,
            isiMax: 6000,
            variableN: true,
            interferenceChance: 0.5,
        });

        useGameStore.getState().setPlayMode('free');

        const { settings } = useGameStore.getState();
        expect(settings.playMode).toBe('free');
        expect(settings.level).toBe(7);
        expect(settings.isiMin).toBe(4000);
        expect(settings.isiMax).toBe(6000);
        expect(settings.variableN).toBe(true);
        expect(settings.interferenceChance).toBe(0.5);
        expect(settings.lureStage).toBeUndefined();
        expect(useGameStore.getState().freePlaySettingsSnapshot).toBeNull();
        expect(useGameStore.getState().adaptiveSession).toBeNull();
    });

    it('keeps free-play as a single block without adaptive session state', async () => {
        expect(useGameStore.getState().settings.playMode).toBe('free');
        useGameStore.getState().startGame();
        await finishCountdown();

        const result = new GameResult(
            {
                audio: { success: 1, failed: 0 },
                position: { success: 1, failed: 0 },
            },
            ['position', 'audio']
        );
        useGameStore.getState().pushGameResult(result);

        expect(useGameStore.getState().adaptiveSession).toBeNull();
        expect(useGameStore.getState().lastBlockRole).toBe('free');
        expect(useGameStore.getState().results.last).toBe(result);
    });

    it('enters interstitial after adaptive block ends and continues on next startGame', async () => {
        useGameStore.getState().setPlayMode('adaptive');
        useGameStore.getState().startGame();
        await finishCountdown();

        useGameStore.setState({
            adaptiveSession: {
                ...createInitialAdaptiveSession({ adaptiveTarget: 3 }),
                phase: 'anchor-open',
            },
        });

        const result = new GameResult(
            {
                audio: { success: 1, failed: 0 },
                position: { success: 1, failed: 0 },
            },
            ['position', 'audio']
        );
        useGameStore.getState().pushGameResult(result);

        expect(useGameStore.getState().adaptiveSession?.phase).toBe('interstitial');
        expect(useGameStore.getState().adaptiveSession?.pendingContinue).toBe(true);
        expect(useGameStore.getState().adaptiveSession?.openAnchorsDone).toBe(1);
        expect(useGameStore.getState().lastBlockRole).toBe('anchor-open');

        useGameStore.getState().startGame();
        expect(useGameStore.getState().countdown).toBe(3);
        expect(useGameStore.getState().adaptiveSession?.pendingContinue).toBe(false);
        useGameStore.getState().cancelGame();
    });
});
