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
import {
    ADAPTIVE_LADDER_STORAGE_KEY,
    CYCLIC_LADDER_STORAGE_KEY,
    createDefaultCyclicLadderByMode,
    createDefaultMatchLadderByMode,
} from '../model/ladderPersistence';
import { GameResult } from '../model/GameResult';
import { createInitialAdaptiveSession } from './adaptiveSession';
import {
    persistableSettingsFromStoreSettings,
} from '../model/settingsPersistence';
import {
    saveDailyProgress,
    trainingDayKey,
} from '../model/dailyProgress';
import { idleRestTimer } from '../model/restTimer';

async function finishCountdown() {
    await vi.advanceTimersByTimeAsync(COUNTDOWN_START * COUNTDOWN_TICK_MS);
}

function seedDailyProgress(completedCount: number) {
    const dayKey = trainingDayKey(new Date());
    const data = { version: 1 as const, dayKey, completedCount };
    saveDailyProgress(data);
    useGameStore.setState({ dailyProgress: data });
}

describe('gameStore', () => {
    let memoryStore: Map<string, string>;

    beforeEach(() => {
        vi.useFakeTimers();
        memoryStore = new Map();
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => (memoryStore.has(key) ? memoryStore.get(key)! : null),
            setItem: (key: string, value: string) => {
                memoryStore.set(key, value);
            },
            removeItem: (key: string) => {
                memoryStore.delete(key);
            },
            clear: () => memoryStore.clear(),
        });
        vi.spyOn(useGameStore.getState().speech, 'play').mockImplementation(() => undefined);
        seedDailyProgress(0);
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
            ladder: createDefaultMatchLadderByMode(),
            cyclicLadder: createDefaultCyclicLadderByMode(),
            adaptiveSession: null,
            lastBlockRole: null,
            lastControllerAction: null,
            blockModalities: null,
            freePlaySettingsSnapshot: null,
            restTimer: idleRestTimer(0),
            teachIntroDismissed: false,
            teachOptOutWarnShown: false,
            teachDecideTrialCount: 0,
            teachOpStep: null,
            teachOpEpoch: 0,
            teachRevealPositionIndex: null,
            teachRevealLetter: null,
            settings: {
                level: 2,
                trials: 1,
                isiMin: 5000,
                isiMax: 5000,
                activeFeedback: false,
                displayTrials: true,
                displayTarget: true,
                allowCenterStimulus: true,
                positionGrid: '3x3',
                displayVariableNCenter: false,
                answerGraceMs: 250,
                stepwisePacing: false,
                useFullScreen: false,
                mode: 'dual',
                tripleModalities: ['position', 'color', 'audio'],
                audioPack: 'letters',
                interferenceChance: 0.125,
                variableN: false,
                variableNHoldTrials: 1,
                playMode: 'free',
                useBlockQuotas: false,
                useJaeggiQuotas: true,
                dailyRounds: 20,
                dailySessions: 4,
                freePlayAutoProgress: false,
                freePlayPromotePct: 80,
                freePlayDemotePct: 80,
                freePlayFailsToDemote: 3,
                freePlayDemoteRequiresConsecutive: true,
                freePlayFailStreak: 0,
            },
            dailyProgress: {
                version: 1,
                dayKey: trainingDayKey(new Date()),
                completedCount: 0,
            },
        });
    });

    afterEach(() => {
        useGameStore.getState().cancelGame();
        vi.useRealTimers();
        vi.unstubAllGlobals();
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

    it('shows unclaimed targets as errors before the next onset with instant feedback', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        useGameStore.setState((state) => ({
            settings: {
                ...state.settings,
                level: 1,
                trials: 3,
                isiMin: 1000,
                isiMax: 1000,
                answerGraceMs: 250,
                activeFeedback: true,
                useJaeggiQuotas: true,
            },
        }));

        useGameStore.getState().startGame();
        await finishCountdown();

        // Warm-up trial: 1,050ms claim window + 200ms feedback reserve.
        await vi.advanceTimersByTimeAsync(1050);
        await vi.advanceTimersByTimeAsync(200);

        // Jaeggi planning puts the guaranteed target on the first scorable trial
        // for this deterministic RNG. Leaving it unclaimed must paint both buttons.
        await vi.advanceTimersByTimeAsync(1050);
        expect(useGameStore.getState().btns).toMatchObject({
            position: ButtonState.Error,
            audio: ButtonState.Error,
        });

        await vi.advanceTimersByTimeAsync(199);
        expect(useGameStore.getState().btns.position).toBe(ButtonState.Error);
        await vi.advanceTimersByTimeAsync(1);
        expect(useGameStore.getState().btns.position).toBe(ButtonState.None);
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

    it('updates idle chrome when Triple modalities change', () => {
        useGameStore.getState().setMode('triple');
        useGameStore.getState().setTripleModalities(['color', 'image', 'audio']);
        expect(useGameStore.getState().settings.tripleModalities).toEqual([
            'color',
            'image',
            'audio',
        ]);
        expect(useGameStore.getState().activeModalities).toEqual(['color', 'image', 'audio']);
        expect(useGameStore.getState().btns).toMatchObject({
            color: ButtonState.None,
            image: ButtonState.None,
            audio: ButtonState.None,
        });
        expect(useGameStore.getState().btns.position).toBeUndefined();
    });

    it('freezes Triple modality chrome mid-session', async () => {
        useGameStore.getState().setMode('triple');
        useGameStore.getState().startGame();
        await finishCountdown();
        expect(useGameStore.getState().activeModalities).toEqual(['position', 'color', 'audio']);

        useGameStore.getState().setTripleModalities(['color', 'image', 'audio']);
        expect(useGameStore.getState().settings.tripleModalities).toEqual([
            'color',
            'image',
            'audio',
        ]);
        expect(useGameStore.getState().activeModalities).toEqual(['position', 'color', 'audio']);

        useGameStore.getState().cancelGame();
        expect(useGameStore.getState().activeModalities).toEqual(['color', 'image', 'audio']);
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

    it('defaults playMode to free and keeps ladders separate from manual settings', () => {
        expect(useGameStore.getState().settings.playMode).toBe('free');
        expect(useGameStore.getState().ladder.dual).toEqual({ levelIndex: 0, failStreak: 0 });
        expect(useGameStore.getState().cyclicLadder.dual).toMatchObject({
            track: 'fixed',
            n: 2,
            stage: 'teach_walkthrough',
            failStreak: 0,
        });
    });

    it('uses first-user free-play defaults for level, center cell, and ISI', () => {
        const defaults = createDefaultFreePlaySettings();
        expect(defaults.level).toBe(2);
        expect(defaults.allowCenterStimulus).toBe(false);
        expect(defaults.positionGrid).toBe('3x3');
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

    it('switches free-play board to 2x2 and clears N-in-center', () => {
        useGameStore.setState({
            settings: {
                ...createDefaultFreePlaySettings(),
                displayVariableNCenter: true,
            },
        });

        useGameStore.getState().setPositionGrid('2x2');
        expect(useGameStore.getState().settings.positionGrid).toBe('2x2');
        expect(useGameStore.getState().settings.displayVariableNCenter).toBe(false);

        useGameStore.getState().setDisplayVariableNCenter(true);
        expect(useGameStore.getState().settings.displayVariableNCenter).toBe(false);
    });

    it('applies Match% adaptive ladder to settings when switching playMode while idle', () => {
        useGameStore.setState((state) => ({
            ladder: {
                ...state.ladder,
                dual: { levelIndex: 6, failStreak: 1 },
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
        expect(settings.lureStage).toBeUndefined();
        expect(settings.variableN).toBe(true);
        expect(settings.isiMin).toBe(2000);
        expect(settings.isiMax).toBe(2000);
        expect(settings.interferenceChance).toBe(0.125);
    });

    it('applies cyclic ladder to settings when switching to cyclic', () => {
        useGameStore.setState((state) => ({
            cyclicLadder: {
                ...state.cyclicLadder,
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

        useGameStore.getState().setPlayMode('cyclic');

        const { settings } = useGameStore.getState();
        expect(settings.playMode).toBe('cyclic');
        expect(settings.level).toBe(2);
        expect(settings.lureStage).toBe('E');
        expect(settings.variableN).toBe(true);
        expect(settings.isiMin).toBe(2500);
        expect(settings.isiMax).toBe(2500);
    });

    it('setIsiMax below isiMin pulls min down so the max thumb can leave the ceiling', () => {
        useGameStore.setState((state) => ({
            settings: { ...state.settings, playMode: 'free', isiMin: 5000, isiMax: 5000 },
        }));
        useGameStore.getState().setIsiMax(4000);
        const { isiMin, isiMax } = useGameStore.getState().settings;
        expect(isiMax).toBe(4000);
        expect(isiMin).toBe(4000);
    });

    it('setIsiBoth sets min and max to the same clamped value', () => {
        useGameStore.setState((state) => ({
            settings: { ...state.settings, playMode: 'free', isiMin: 1000, isiMax: 2000 },
        }));
        useGameStore.getState().setIsiBoth(3500);
        const { isiMin, isiMax } = useGameStore.getState().settings;
        expect(isiMin).toBe(3500);
        expect(isiMax).toBe(3500);
    });

    it('retreatTeachOp steps NEXT → REPLACE → COMPARE and stops', () => {
        useGameStore.setState({ teachOpStep: 'NEXT', teachOpEpoch: 0 });
        useGameStore.getState().retreatTeachOp();
        expect(useGameStore.getState().teachOpStep).toBe('REPLACE');
        useGameStore.getState().retreatTeachOp();
        expect(useGameStore.getState().teachOpStep).toBe('COMPARE');
        useGameStore.getState().retreatTeachOp();
        expect(useGameStore.getState().teachOpStep).toBe('COMPARE');
    });

    it('resetCyclicLearningProgress restores teach walkthrough for all modes', () => {
        useGameStore.setState((state) => ({
            settings: { ...state.settings, playMode: 'cyclic', mode: 'dual' },
            teachIntroDismissed: true,
            cyclicLadder: {
                ...state.cyclicLadder,
                dual: {
                    track: 'fixed',
                    n: 4,
                    stage: 'fixed_fast',
                    lureStage: 'E',
                    isiTier: 2,
                    failStreak: 2,
                    promoteStreak: 1,
                },
                triple: {
                    track: 'flexible',
                    n: 3,
                    stage: 'flex_base',
                    lureStage: 'E',
                    isiTier: 0,
                    failStreak: 0,
                    promoteStreak: 0,
                },
            },
            results: {
                all: state.results.all,
                last: { generalMatchPercentage: 40 } as never,
            },
        }));

        useGameStore.getState().resetCyclicLearningProgress();

        const next = useGameStore.getState();
        expect(next.settings.playMode).toBe('cyclic');
        expect(next.cyclicLadder.dual).toMatchObject({
            track: 'fixed',
            n: 2,
            stage: 'teach_walkthrough',
            failStreak: 0,
        });
        expect(next.cyclicLadder.triple.stage).toBe('teach_walkthrough');
        expect(next.teachIntroDismissed).toBe(false);
        expect(next.results.last).toBeNull();
        expect(next.settings.level).toBe(2);
    });

    it('clears last result and resets teach intro when entering cyclic walkthrough', () => {
        useGameStore.setState((state) => ({
            cyclicLadder: {
                ...state.cyclicLadder,
                dual: {
                    track: 'fixed',
                    n: 2,
                    stage: 'teach_walkthrough',
                    lureStage: 'A',
                    isiTier: 0,
                    failStreak: 0,
                    promoteStreak: 0,
                },
            },
            settings: { ...state.settings, playMode: 'free', mode: 'dual' },
            teachIntroDismissed: true,
            results: {
                all: state.results.all,
                last: { generalMatchPercentage: 50 } as never,
            },
        }));

        useGameStore.getState().setPlayMode('cyclic');

        const next = useGameStore.getState();
        expect(next.settings.playMode).toBe('cyclic');
        expect(next.teachIntroDismissed).toBe(false);
        expect(next.results.last).toBeNull();
    });

    it('acknowledges walkthrough intro without advancing stage on cyclic', () => {
        useGameStore.setState((state) => ({
            cyclicLadder: {
                ...state.cyclicLadder,
                dual: {
                    track: 'fixed',
                    n: 2,
                    stage: 'teach_walkthrough',
                    lureStage: 'A',
                    isiTier: 0,
                    failStreak: 0,
                    promoteStreak: 0,
                },
            },
            settings: {
                ...state.settings,
                playMode: 'cyclic',
                mode: 'dual',
            },
            game: null,
            countdown: null,
            teachIntroDismissed: false,
        }));

        useGameStore.getState().acknowledgeStrategyInstruction();

        expect(useGameStore.getState().cyclicLadder.dual.stage).toBe('teach_walkthrough');
        expect(useGameStore.getState().teachIntroDismissed).toBe(true);
        expect(useGameStore.getState().settings.level).toBe(2);
        expect(useGameStore.getState().settings.variableN).toBe(false);
    });

    it('manually steps Match% and cyclic ladders and clears fail streak', () => {
        useGameStore.setState((state) => ({
            ladder: {
                ...state.ladder,
                dual: { levelIndex: 2, failStreak: 2 },
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
        expect(useGameStore.getState().ladder.dual.levelIndex).toBe(3);
        expect(useGameStore.getState().ladder.dual.failStreak).toBe(0);

        useGameStore.setState((state) => ({
            cyclicLadder: {
                ...state.cyclicLadder,
                dual: {
                    track: 'fixed',
                    n: 2,
                    stage: 'teach_decide',
                    lureStage: 'A',
                    isiTier: 0,
                    failStreak: 2,
                    promoteStreak: 0,
                },
            },
            settings: { ...state.settings, playMode: 'cyclic' },
        }));
        useGameStore.getState().increaseLadderStep();
        expect(useGameStore.getState().cyclicLadder.dual.stage).toBe('teach_ramp');
        expect(useGameStore.getState().cyclicLadder.dual.failStreak).toBe(0);

        useGameStore.setState((state) => ({
            cyclicLadder: {
                ...state.cyclicLadder,
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
        expect(useGameStore.getState().cyclicLadder.dual.stage).toBe('fixed_lure_both');
        expect(useGameStore.getState().cyclicLadder.dual.failStreak).toBe(0);
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

    it('applies mode ladder when switching mode in Match% adaptive while idle', () => {
        useGameStore.setState((state) => ({
            ladder: {
                ...state.ladder,
                dual: { levelIndex: 0, failStreak: 0 },
                triple: { levelIndex: 10, failStreak: 0 },
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
        expect(settings.lureStage).toBeUndefined();
    });

    it('persists Match% and cyclic ladders separately', () => {
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
                quad: { levelIndex: 4, failStreak: 2 },
            },
            cyclicLadder: {
                ...state.cyclicLadder,
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
        useGameStore.getState().saveCyclicLadder();

        const adaptiveRaw = storage.getItem(ADAPTIVE_LADDER_STORAGE_KEY);
        expect(adaptiveRaw).not.toBeNull();
        const adaptiveParsed = JSON.parse(adaptiveRaw!);
        expect(adaptiveParsed.version).toBe(2);
        expect(adaptiveParsed.byMode.quad).toEqual({ levelIndex: 4, failStreak: 2 });

        const cyclicRaw = storage.getItem(CYCLIC_LADDER_STORAGE_KEY);
        expect(cyclicRaw).not.toBeNull();
        const cyclicParsed = JSON.parse(cyclicRaw!);
        expect(cyclicParsed.version).toBe(4);
        expect(cyclicParsed.byMode.quad).toMatchObject({
            track: 'flexible',
            stage: 'flex_base',
            failStreak: 2,
        });

        vi.unstubAllGlobals();
    });

    it('starts Match% adaptive session without lureStage after countdown', async () => {
        useGameStore.getState().setPlayMode('adaptive');
        useGameStore.getState().startGame();
        expect(useGameStore.getState().adaptiveSession?.phase).toBe('playing');

        await finishCountdown();
        expect(useGameStore.getState().adaptiveSession?.phase).toBe('playing');
        expect(useGameStore.getState().game).not.toBeNull();
        expect(useGameStore.getState().settings.variableN).toBe(false);
        expect(useGameStore.getState().settings.lureStage).toBeUndefined();
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

    it('blocks continue until the selected post-round rest ends', () => {
        useGameStore.setState({ restTimer: idleRestTimer(1) });
        useGameStore.getState().pushGameResult(
            new GameResult(
                {
                    audio: { success: 1, failed: 0 },
                    position: { success: 1, failed: 0 },
                },
                ['position', 'audio']
            )
        );

        expect(useGameStore.getState().restTimer.endsAtMs).toBe(Date.now() + 60_000);
        useGameStore.getState().startGame();
        expect(useGameStore.getState().countdown).toBeNull();

        vi.advanceTimersByTime(60_000);
        useGameStore.getState().startGame();
        expect(useGameStore.getState().countdown).toBe(COUNTDOWN_START);
    });

    it('advances cyclic acquisition after walkthrough block then continues on next startGame', async () => {
        useGameStore.getState().setPlayMode('cyclic');
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
        expect(useGameStore.getState().cyclicLadder.dual.stage).toBe('teach_decide');
        expect(useGameStore.getState().lastControllerAction?.action).toBe('advance_acquisition');
        expect(useGameStore.getState().lastBlockRole).toBe('teach_walkthrough');

        useGameStore.getState().startGame();
        expect(useGameStore.getState().countdown).toBe(3);
        expect(useGameStore.getState().adaptiveSession?.pendingContinue).toBe(false);
        useGameStore.getState().cancelGame();
    });

    it('promotes Match% adaptive on high Match% after a block', async () => {
        useGameStore.setState((state) => ({
            ladder: {
                ...state.ladder,
                dual: { levelIndex: 2, failStreak: 1 },
            },
        }));
        useGameStore.getState().setPlayMode('adaptive');

        const ok = new GameResult(
            {
                audio: { success: 8, failed: 0 },
                position: { success: 8, failed: 0 },
            },
            ['position', 'audio']
        );

        useGameStore.setState({
            adaptiveSession: {
                ...createInitialAdaptiveSession(),
                phase: 'playing',
            },
            game: null,
            countdown: null,
        });
        useGameStore.getState().pushGameResult(ok);

        expect(useGameStore.getState().ladder.dual.levelIndex).toBe(3);
        expect(useGameStore.getState().ladder.dual.failStreak).toBe(0);
        expect(useGameStore.getState().lastControllerAction?.action).toBe('promote');
        expect(useGameStore.getState().lastBlockRole).toBe('match');
    });

    it('holds cyclic assessed stage when SDT samples are sparse', async () => {
        useGameStore.setState((state) => ({
            cyclicLadder: {
                ...state.cyclicLadder,
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
        useGameStore.getState().setPlayMode('cyclic');

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

        expect(useGameStore.getState().cyclicLadder.dual.stage).toBe('fixed_fast');
        expect(useGameStore.getState().lastControllerAction?.action).toBe('hold');
    });

    it('increments daily progress on free-play block end', () => {
        seedDailyProgress(2);
        useGameStore.setState({
            settings: {
                ...useGameStore.getState().settings,
                dailyRounds: 20,
                freePlayAutoProgress: false,
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
        expect(useGameStore.getState().dailyProgress.completedCount).toBe(3);
        expect(useGameStore.getState().lastControllerAction).toBeNull();
    });

    it('promotes free-play level with auto progress without changing trials', () => {
        seedDailyProgress(0);
        useGameStore.setState({
            settings: {
                ...useGameStore.getState().settings,
                level: 3,
                trials: 30,
                isiMin: 1000,
                isiMax: 1500,
                interferenceChance: 0.125,
                freePlayAutoProgress: true,
                freePlayPromotePct: 80,
                freePlayFailsToDemote: 3,
                freePlayFailStreak: 1,
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
        const { settings, lastControllerAction, dailyProgress } = useGameStore.getState();
        expect(settings.level).toBe(4);
        expect(settings.trials).toBe(30);
        expect(settings.isiMin).toBe(1000);
        expect(settings.isiMax).toBe(1500);
        expect(settings.interferenceChance).toBe(0.125);
        expect(settings.freePlayFailStreak).toBe(0);
        expect(lastControllerAction?.action).toBe('promote');
        expect(dailyProgress.completedCount).toBe(1);
    });

    it('keeps low trial counts after auto-promote persist/reload', () => {
        seedDailyProgress(0);
        useGameStore.setState({
            settings: {
                ...useGameStore.getState().settings,
                level: 3,
                trials: 6,
                freePlayAutoProgress: true,
                freePlayPromotePct: 80,
                freePlayFailsToDemote: 3,
                freePlayFailStreak: 0,
            },
        });
        useGameStore.getState().pushGameResult(
            new GameResult(
                {
                    audio: { success: 8, failed: 0 },
                    position: { success: 8, failed: 0 },
                },
                ['position', 'audio']
            )
        );
        expect(useGameStore.getState().settings.level).toBe(4);
        expect(useGameStore.getState().settings.trials).toBe(6);
        const snap = persistableSettingsFromStoreSettings(
            useGameStore.getState().settings as unknown as Record<string, unknown>
        );
        expect(snap.level).toBe(4);
        expect(snap.trials).toBe(6);
    });

    it('demotes free-play after failsToDemote consecutive low Match%', () => {
        useGameStore.setState({
            settings: {
                ...useGameStore.getState().settings,
                level: 3,
                trials: 24,
                freePlayAutoProgress: true,
                freePlayPromotePct: 80,
                freePlayFailsToDemote: 2,
                freePlayFailStreak: 1,
            },
        });
        const fail = new GameResult(
            {
                audio: { success: 1, failed: 4 },
                position: { success: 1, failed: 4 },
            },
            ['position', 'audio']
        );
        useGameStore.getState().pushGameResult(fail);
        expect(useGameStore.getState().settings.level).toBe(2);
        expect(useGameStore.getState().settings.trials).toBe(24);
        expect(useGameStore.getState().lastControllerAction?.action).toBe('demote');
    });

    it('does not count cancel toward daily progress', () => {
        seedDailyProgress(4);
        useGameStore.setState({
            game: { cancel: vi.fn() } as never,
        });
        useGameStore.getState().cancelGame();
        expect(useGameStore.getState().dailyProgress.completedCount).toBe(4);
    });

    it('counts adaptive block ends toward daily progress', () => {
        seedDailyProgress(1);
        useGameStore.setState({
            settings: {
                ...useGameStore.getState().settings,
                freePlayAutoProgress: true,
            },
            ladder: {
                ...useGameStore.getState().ladder,
                dual: { levelIndex: 2, failStreak: 0 },
            },
        });
        useGameStore.getState().setPlayMode('adaptive');
        useGameStore.setState({
            adaptiveSession: {
                ...createInitialAdaptiveSession(),
                phase: 'playing',
            },
        });
        const ok = new GameResult(
            {
                audio: { success: 8, failed: 0 },
                position: { success: 8, failed: 0 },
            },
            ['position', 'audio']
        );
        useGameStore.getState().pushGameResult(ok);
        expect(useGameStore.getState().dailyProgress.completedCount).toBe(2);
        expect(useGameStore.getState().lastControllerAction?.action).toBe('promote');
        expect(useGameStore.getState().lastBlockRole).toBe('match');
    });

    it('resets freePlayFailStreak on manual level change', () => {
        useGameStore.setState({
            settings: {
                ...useGameStore.getState().settings,
                freePlayFailStreak: 2,
            },
        });
        useGameStore.getState().increaseLevel();
        expect(useGameStore.getState().settings.freePlayFailStreak).toBe(0);
    });

    it('does not increment daily progress at cap', () => {
        seedDailyProgress(20);
        useGameStore.setState({
            settings: {
                ...useGameStore.getState().settings,
                dailyRounds: 20,
            },
        });
        useGameStore.getState().pushGameResult(
            new GameResult(
                {
                    audio: { success: 1, failed: 0 },
                    position: { success: 1, failed: 0 },
                },
                ['position', 'audio']
            )
        );
        expect(useGameStore.getState().dailyProgress.completedCount).toBe(20);
    });

    it('holds each trial in paced mode and continues on demand', async () => {
        useGameStore.setState((state) => ({
            settings: {
                ...state.settings,
                level: 1,
                trials: 2,
                isiMin: 1000,
                isiMax: 1000,
                answerGraceMs: 0,
                stepwisePacing: true,
            },
        }));

        useGameStore.getState().startGame();
        await finishCountdown();

        // First onset freezes the trial clock and opens the continue gate.
        expect(useGameStore.getState().stepwisePaused).toBe(true);
        const session = useGameStore.getState().game!;
        expect(session.isPaused).toBe(true);

        // Claims stay open while held.
        expect(session.addChoice('position')).toBe(true);

        // A long wait does not advance to the next stimulus.
        await vi.advanceTimersByTimeAsync(5000);
        expect(useGameStore.getState().boardState.currentTrials).toBe(2);

        useGameStore.getState().continueStepwise();
        expect(useGameStore.getState().stepwisePaused).toBe(false);
        expect(session.isPaused).toBe(false);

        // Scoring + feedback reserve, then the second onset re-arms the gate.
        await vi.advanceTimersByTimeAsync(400);
        expect(useGameStore.getState().boardState.currentTrials).toBe(1);
        expect(useGameStore.getState().stepwisePaused).toBe(true);

        // Final continue completes the block and clears the flag.
        useGameStore.getState().continueStepwise();
        await vi.advanceTimersByTimeAsync(400);
        expect(useGameStore.getState().game).toBeNull();
        expect(useGameStore.getState().results.last).not.toBeNull();
        expect(useGameStore.getState().stepwisePaused).toBe(false);
    });

    it('continueStepwise is a no-op when no gate is held', async () => {
        useGameStore.getState().continueStepwise();
        expect(useGameStore.getState().game).toBeNull();
        expect(useGameStore.getState().stepwisePaused).toBe(false);
    });
});
