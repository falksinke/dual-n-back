import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    COUNTDOWN_START,
    COUNTDOWN_TICK_MS,
    createDefaultFreePlaySettings,
    useGameStore,
} from './gameStore';
import { ButtonState } from '../model/enums/buttonState';
import {
    FREE_PLAY_DEFAULT_ISI_MAX_MS,
    FREE_PLAY_DEFAULT_ISI_MIN_MS,
} from '../model/isi';
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
                stimulusEpoch: 0,
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
                displayVariableNCenter: false,
                answerGraceMs: 250,
                useFullScreen: false,
                mode: 'dual',
                audioPack: 'letters',
                interferenceChance: 0.125,
                variableN: false,
                variableNHoldTrials: 1,
                playMode: 'free',
                useBlockQuotas: false,
                useJaeggiQuotas: true,
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
        expect(useGameStore.getState().ladder.dual).toMatchObject({
            track: 'fixed',
            n: 2,
            stage: 'instruction',
            failStreak: 0,
        });
    });

    it('uses first-user free-play defaults for level, center cell, and ISI', () => {
        const defaults = createDefaultFreePlaySettings();
        expect(defaults.level).toBe(2);
        expect(defaults.allowCenterStimulus).toBe(false);
        expect(defaults.displayVariableNCenter).toBe(false);
        expect(defaults.isiMin).toBe(FREE_PLAY_DEFAULT_ISI_MIN_MS);
        expect(defaults.isiMax).toBe(FREE_PLAY_DEFAULT_ISI_MAX_MS);
        expect(defaults.useJaeggiQuotas).toBe(true);
        expect(FREE_PLAY_DEFAULT_ISI_MIN_MS).toBe(1000);
        expect(FREE_PLAY_DEFAULT_ISI_MAX_MS).toBe(1500);

        useGameStore.setState({ settings: defaults });
        useGameStore.getState().decreaseLevel();
        expect(useGameStore.getState().settings.level).toBe(1);
        useGameStore.getState().decreaseLevel();
        expect(useGameStore.getState().settings.level).toBe(1);
    });

    it('allows N-in-center only while center cell is off', () => {
        useGameStore.setState({
            settings: {
                ...createDefaultFreePlaySettings(),
                allowCenterStimulus: false,
                displayVariableNCenter: false,
            },
        });

        useGameStore.getState().setDisplayVariableNCenter(true);
        expect(useGameStore.getState().settings.displayVariableNCenter).toBe(true);

        useGameStore.getState().setAllowCenterStimulus(true);
        expect(useGameStore.getState().settings.allowCenterStimulus).toBe(true);
        expect(useGameStore.getState().settings.displayVariableNCenter).toBe(false);

        useGameStore.getState().setDisplayVariableNCenter(true);
        expect(useGameStore.getState().settings.displayVariableNCenter).toBe(false);
    });

    it('applies adaptive ladder to settings when switching playMode while idle', () => {
        useGameStore.setState((state) => ({
            ladder: {
                ...state.ladder,
                dual: {
                    track: 'flexible',
                    n: 2,
                    stage: 'flex_base',
                    lureStage: 'E',
                    isiTier: 0,
                    failStreak: 1,
                    promoteStreak: 0,
                },
            },
            settings: {
                ...state.settings,
                level: 5,
                variableN: false,
                interferenceChance: 0.5,
            },
        }));

        useGameStore.getState().setPlayMode('adaptive');

        const { settings } = useGameStore.getState();
        expect(settings.playMode).toBe('adaptive');
        expect(settings.level).toBe(2);
        expect(settings.lureStage).toBe('E');
        expect(settings.variableN).toBe(true);
        expect(settings.isiMin).toBe(2500);
        expect(settings.isiMax).toBe(2500);
        expect(settings.interferenceChance).toBe(0.125);
    });

    it('manually steps the adaptive ladder and clears fail streak', () => {
        useGameStore.setState((state) => ({
            ladder: {
                ...state.ladder,
                dual: {
                    track: 'fixed',
                    n: 2,
                    stage: 'guided',
                    lureStage: 'A',
                    isiTier: 0,
                    failStreak: 2,
                    promoteStreak: 0,
                },
            },
            settings: {
                ...state.settings,
                playMode: 'adaptive',
                mode: 'dual',
            },
            game: null,
            countdown: null,
        }));

        useGameStore.getState().increaseLadderStep();
        expect(useGameStore.getState().ladder.dual.stage).toBe('fade');
        expect(useGameStore.getState().ladder.dual.failStreak).toBe(0);
        expect(useGameStore.getState().settings.level).toBe(2);

        useGameStore.setState((state) => ({
            ladder: {
                ...state.ladder,
                dual: {
                    track: 'fixed',
                    n: 2,
                    stage: 'fixed_fast',
                    lureStage: 'E',
                    isiTier: 1,
                    failStreak: 2,
                    promoteStreak: 0,
                },
            },
        }));
        useGameStore.getState().decreaseLadderStep();
        expect(useGameStore.getState().ladder.dual.stage).toBe('fixed_lure_both');
        expect(useGameStore.getState().ladder.dual.failStreak).toBe(0);
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
                dual: {
                    track: 'fixed',
                    n: 2,
                    stage: 'fixed_clean',
                    lureStage: 'A',
                    isiTier: 0,
                    failStreak: 0,
                    promoteStreak: 0,
                },
                triple: {
                    track: 'fixed',
                    n: 3,
                    stage: 'instruction',
                    lureStage: 'A',
                    isiTier: 0,
                    failStreak: 0,
                    promoteStreak: 0,
                },
            },
            settings: { ...state.settings, playMode: 'adaptive', mode: 'dual', level: 2 },
        }));

        useGameStore.getState().setMode('triple');

        const { settings } = useGameStore.getState();
        expect(settings.mode).toBe('triple');
        expect(settings.level).toBe(3);
        expect(settings.isiMin).toBe(2500);
        expect(settings.isiMax).toBe(2500);
        expect(settings.interferenceChance).toBe(0);
        expect(settings.lureStage).toBe('A');
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
                quad: {
                    track: 'flexible',
                    n: 2,
                    stage: 'flex_base',
                    lureStage: 'E',
                    isiTier: 0,
                    failStreak: 2,
                    promoteStreak: 0,
                },
            },
        }));

        useGameStore.getState().saveLadder();

        const raw = storage.getItem(LADDER_STORAGE_KEY);
        expect(raw).not.toBeNull();
        const parsed = JSON.parse(raw!);
        expect(parsed.version).toBe(3);
        expect(parsed.byMode.quad).toMatchObject({
            track: 'flexible',
            stage: 'flex_base',
            failStreak: 2,
        });
        expect(parsed.byMode.dual.stage).toBe('instruction');

        vi.unstubAllGlobals();
    });

    it('starts adaptive session in playing after countdown', async () => {
        useGameStore.getState().setPlayMode('adaptive');
        useGameStore.getState().startGame();
        expect(useGameStore.getState().adaptiveSession?.phase).toBe('playing');

        await finishCountdown();
        expect(useGameStore.getState().adaptiveSession?.phase).toBe('playing');
        expect(useGameStore.getState().game).not.toBeNull();
        expect(useGameStore.getState().settings.variableN).toBe(false);
        expect(useGameStore.getState().settings.lureStage).toBe('A');
        expect(useGameStore.getState().settings.isiMin).toBe(2500);
        expect(useGameStore.getState().settings.interferenceChance).toBe(0);

        useGameStore.getState().cancelGame();
    });

    it('clears adaptive session when canceling mid adaptive run', async () => {
        useGameStore.getState().setPlayMode('adaptive');
        useGameStore.getState().startGame();
        await finishCountdown();
        expect(useGameStore.getState().adaptiveSession).not.toBeNull();

        useGameStore.getState().cancelGame();
        expect(useGameStore.getState().adaptiveSession).toBeNull();
        expect(useGameStore.getState().game).toBeNull();
        expect(useGameStore.getState().countdown).toBeNull();
    });

    it('aborts adaptive session when canceling during countdown', async () => {
        useGameStore.getState().setPlayMode('adaptive');
        useGameStore.getState().startGame();
        expect(useGameStore.getState().countdown).toBe(3);
        expect(useGameStore.getState().adaptiveSession?.phase).toBe('playing');

        useGameStore.getState().cancelGame();

        expect(useGameStore.getState().countdown).toBeNull();
        expect(useGameStore.getState().game).toBeNull();
        expect(useGameStore.getState().adaptiveSession).toBeNull();
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
            variableNHoldTrials: 1,
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

    it('advances acquisition after guided block then continues on next startGame', async () => {
        useGameStore.getState().setPlayMode('adaptive');
        useGameStore.getState().startGame();
        await finishCountdown();

        useGameStore.setState({
            adaptiveSession: {
                ...createInitialAdaptiveSession(),
                phase: 'playing',
            },
        });

        const result = new GameResult(
            {
                audio: { success: 8, failed: 0 },
                position: { success: 8, failed: 0 },
            },
            ['position', 'audio']
        );
        useGameStore.getState().pushGameResult(result);

        expect(useGameStore.getState().adaptiveSession?.phase).toBe('interstitial');
        expect(useGameStore.getState().adaptiveSession?.pendingContinue).toBe(true);
        expect(useGameStore.getState().ladder.dual.stage).toBe('fade');
        expect(useGameStore.getState().lastControllerAction?.action).toBe('advance_acquisition');
        expect(useGameStore.getState().lastBlockRole).toBe('guided');

        useGameStore.getState().startGame();
        expect(useGameStore.getState().countdown).toBe(3);
        expect(useGameStore.getState().adaptiveSession?.pendingContinue).toBe(false);
        useGameStore.getState().cancelGame();
    });

    it('holds assessed stage when SDT samples are sparse', async () => {
        useGameStore.setState((state) => ({
            ladder: {
                ...state.ladder,
                dual: {
                    track: 'fixed',
                    n: 2,
                    stage: 'fixed_fast',
                    lureStage: 'E',
                    isiTier: 1,
                    failStreak: 0,
                    promoteStreak: 0,
                },
            },
        }));
        useGameStore.getState().setPlayMode('adaptive');

        const fail = new GameResult(
            {
                audio: { success: 1, failed: 4 },
                position: { success: 1, failed: 4 },
            },
            ['position', 'audio'],
            null
        );

        useGameStore.setState({
            adaptiveSession: {
                ...createInitialAdaptiveSession(),
                phase: 'playing',
            },
            game: null,
            countdown: null,
        });
        useGameStore.getState().pushGameResult(fail);

        expect(useGameStore.getState().ladder.dual.stage).toBe('fixed_fast');
        expect(useGameStore.getState().lastControllerAction?.action).toBe('hold');
    });
});
