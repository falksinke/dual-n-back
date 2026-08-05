import { create } from 'zustand';
import { ButtonState } from '../model/enums/buttonState';
import { Speech } from '../model/Speech';
import { GameResult } from '../model/GameResult';
import {
    ANSWER_GRACE_DEFAULT_MS,
    clampAnswerGraceMs,
    clampIsiMs,
    FREE_PLAY_DEFAULT_ISI_MAX_MS,
    FREE_PLAY_DEFAULT_ISI_MIN_MS,
} from '../model/isi';
import { ModalityId, ModeId, getModalitiesForMode } from '../model/modalities';
import { AudioPackId } from '../model/audioPacks';
import { ColorId } from '../model/colorSet';
import { ImageId } from '../model/imageSet';
import {
    demoteCurriculumStage,
    enterTeachRamp,
    promoteCurriculumStage,
    settingsFromCurriculum,
    teachSoftWarnDecideThreshold,
} from '../model/adaptiveCurriculum';
import {
    clampLevelIndex,
    maxLevelIndex,
    settingsFromLevel,
} from '../model/adaptiveLevels';
import {
    createDefaultCyclicLadderByMode,
    loadAdaptiveLadder,
    loadCyclicLadder,
    saveAdaptiveLadder as persistAdaptiveLadder,
    saveCyclicLadder as persistCyclicLadder,
    type AdaptiveLadderStorageV2,
    type CurriculumModeLadderSnapshot,
    type CyclicLadderStorageV3,
    type MatchLadderSnapshot,
} from '../model/ladderPersistence';
import {
    loadSettings,
    persistableSettingsFromStoreSettings,
    saveSettings,
} from '../model/settingsPersistence';
import { recordBlockCompleted } from '../model/uiPreferences';
import { ensureAudioReady } from '../audio/unlockAudio';
import { LureStageId } from '../model/lureStages';
import { noteLocalProgressChanged } from '../sync/noteLocal';
import {
    AdaptiveSessionState,
    BlockConfig,
    BlockRole,
    blockRoleFromPhase,
    createInitialAdaptiveSession,
    nextCyclicBlockConfig,
    nextMatchBlockConfig,
    playingPhaseForBlockRole,
    processCyclicBlockEnd,
    processMatchBlockEnd,
    type LadderControllerAction,
} from './adaptiveSession';
import {
    VARIABLE_N_HOLD_OPTIONS,
    type VariableNHoldTrials,
} from '../model/variableN';
import type { PositionGrid } from '../model/positionGrid';
import { GameSession } from './GameSession';

export type TeachOpStep = 'COMPARE' | 'REPLACE' | 'NEXT';

export type PlayMode = 'free' | 'adaptive' | 'cyclic';

export function isLadderPlayMode(playMode: PlayMode): playMode is 'adaptive' | 'cyclic' {
    return playMode === 'adaptive' || playMode === 'cyclic';
}

/** BW-style interference fractions: 0, 1/8 … 1, default 1/8. */
export const INTERFERENCE_OPTIONS = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1] as const;

export type InterferenceChance = (typeof INTERFERENCE_OPTIONS)[number];

export { VARIABLE_N_HOLD_OPTIONS, type VariableNHoldTrials };

export interface FreePlaySettingsSnapshot {
    level: number;
    isiMin: number;
    isiMax: number;
    variableN: boolean;
    variableNHoldTrials: VariableNHoldTrials;
    interferenceChance: InterferenceChance;
}

/** Pre-round flash countdown (3 → 2 → 1). */
export const COUNTDOWN_START = 3;
export const COUNTDOWN_TICK_MS = 1000;

export interface GameStoreState {
    results: {
        all: GameResult[];
        last: GameResult | null;
    };
    speech: Speech;
    btns: Partial<Record<ModalityId, `${ButtonState}`>>;
    activeModalities: ModalityId[];
    /** Seconds remaining in start countdown; null when idle or in-session. */
    countdown: number | null;
    game: GameSession | null;
    /** Classic Match% Adaptive ladder per mode. */
    ladder: Record<ModeId, MatchLadderSnapshot>;
    /** Cyclic curriculum ladder per mode. */
    cyclicLadder: Record<ModeId, CurriculumModeLadderSnapshot>;
    boardState: {
        positionIndex: number;
        audioToken: string | null;
        colorId: ColorId | null;
        imageId: ImageId | null;
        currentTrials: number;
        nForTrial: number;
        /** Increments on each stimulus onset so same-cell trials remount/animate. */
        stimulusEpoch: number;
    };
    settings: {
        level: number;
        trials: number;
        isiMin: number;
        isiMax: number;
        activeFeedback: boolean;
        displayTrials: boolean;
        displayTarget: boolean;
        allowCenterStimulus: boolean;
        /** Free-play spatial board (`2x2` = 4 squares). Ladder modes ignore this. */
        positionGrid: PositionGrid;
        /** Current Variable N lag in the center square (requires center cell off). */
        displayVariableNCenter: boolean;
        /** Extra claim time (ms) beyond the ISI scoring window. */
        answerGraceMs: number;
        useFullScreen: boolean;
        mode: ModeId;
        audioPack: AudioPackId;
        interferenceChance: InterferenceChance;
        variableN: boolean;
        /** Mean stretch (trials) before Variable N randomly resamples the lag. */
        variableNHoldTrials: VariableNHoldTrials;
        playMode: PlayMode;
        /** When set (Cyclic), Game uses lure-stage generation instead of interferenceChance. */
        lureStage?: LureStageId;
        /** Cross-modal match/lure quotas (Adaptive/Cyclic; default off). */
        useBlockQuotas: boolean;
        /**
         * Jaeggi-style fixed match counts in free-play (default on).
         * Skipped automatically when Variable N or Cyclic lure stages are active.
         */
        useJaeggiQuotas: boolean;
    };
    /** Multi-block ladder session FSM; null in free-play or when idle. */
    adaptiveSession: AdaptiveSessionState | null;
    lastBlockRole: BlockRole | null;
    lastControllerAction: LadderControllerAction | null;
    /** Subset modalities for remediation blocks; null uses full mode preset. */
    blockModalities: ModalityId[] | null;
    /** Free-play settings saved when entering Adaptive or Cyclic. */
    freePlaySettingsSnapshot: FreePlaySettingsSnapshot | null;
    /** Cyclic teach_walkthrough intro dismissed for this N. */
    teachIntroDismissed: boolean;
    /** Soft-warn dialog before early I’ve got it opt-out. */
    teachOptOutWarnShown: boolean;
    /** Completed decide-phase trials in the current block. */
    teachDecideTrialCount: number;
    /** Learner-paced micro-step during reveal-first teach. */
    teachOpStep: TeachOpStep | null;
    /** Bumps when teachOpStep advances (animation key). */
    teachOpEpoch: number;
    /** Position index revealed during teach (active slot memory). */
    teachRevealPositionIndex: number | null;
    /** Letter/audio token revealed during teach. */
    teachRevealLetter: string | null;
}

export interface GameStoreActions {
    startGame: () => void;
    cancelGame: () => void;
    selectModality: (modality: ModalityId) => void;
    setBoardPosition: (positionIndex: number) => void;
    setBoardTrials: (currentTrials: number) => void;
    setButtonState: (type: ModalityId, state: `${ButtonState}`) => void;
    resetButtons: () => void;
    pushGameResult: (result: GameResult) => void;
    clearLastResult: () => void;
    resetBoard: () => void;
    clearGame: () => void;
    decreaseLevel: () => void;
    increaseLevel: () => void;
    decreaseLadderStep: () => void;
    increaseLadderStep: () => void;
    /** Reset all modes’ Cyclic ladder to teach walkthrough and clear teach UI flags. */
    resetCyclicLearningProgress: () => void;
    /** Dismiss walkthrough intro without advancing curriculum stage. */
    acknowledgeStrategyInstruction: () => void;
    requestTeachOptOut: () => void;
    confirmTeachOptOut: () => void;
    dismissTeachOptOutWarn: () => void;
    advanceTeachOp: () => void;
    /** Step back COMPARE ← REPLACE ← NEXT while the teach trial is still paused. */
    retreatTeachOp: () => void;
    decreaseTrials: () => void;
    increaseTrials: () => void;
    setIsiMin: (ms: number) => void;
    setIsiMax: (ms: number) => void;
    /** Set both ISI bounds to the same value (linked dual-thumb drag). */
    setIsiBoth: (ms: number) => void;
    setAnswerGraceMs: (ms: number) => void;
    setAllowCenterStimulus: (allow: boolean) => void;
    setPositionGrid: (grid: PositionGrid) => void;
    setDisplayVariableNCenter: (enabled: boolean) => void;
    setMode: (mode: ModeId) => void;
    setAudioPack: (pack: AudioPackId) => void;
    cycleInterferenceChance: () => void;
    setVariableN: (enabled: boolean) => void;
    cycleVariableNHoldTrials: () => void;
    setPlayMode: (playMode: PlayMode) => void;
    setUseBlockQuotas: (enabled: boolean) => void;
    setUseJaeggiQuotas: (enabled: boolean) => void;
    setActiveFeedback: (enabled: boolean) => void;
    saveLadder: () => void;
    saveCyclicLadder: () => void;
}

export type GameStore = GameStoreState & GameStoreActions;

const defaultBoardState = {
    positionIndex: -1,
    audioToken: null as string | null,
    colorId: null as ColorId | null,
    imageId: null as ImageId | null,
    currentTrials: -1,
    nForTrial: -1,
    stimulusEpoch: 0,
};

function createEmptyButtons(modalities: ModalityId[]): Partial<Record<ModalityId, `${ButtonState}`>> {
    const btns: Partial<Record<ModalityId, `${ButtonState}`>> = {};
    for (const modality of modalities) {
        btns[modality] = ButtonState.None;
    }
    return btns;
}

let countdownTimer: ReturnType<typeof setTimeout> | null = null;
let countdownDeadlineMs: number | null = null;
let countdownPausedRemainingMs: number | null = null;
/** Value passed to the in-flight countdown tick callback when paused. */
let countdownPausedTickValue: number | null = null;

const clearCountdownTimer = () => {
    if (countdownTimer !== null) {
        clearTimeout(countdownTimer);
        countdownTimer = null;
    }
    countdownDeadlineMs = null;
};

const resetCountdownBackgroundPause = () => {
    countdownPausedRemainingMs = null;
    countdownPausedTickValue = null;
};

/** Pause pre-round countdown while the app is backgrounded. */
export const pauseCountdownForBackground = (): void => {
    if (countdownTimer === null || countdownPausedTickValue === null) return;
    const remaining =
        countdownDeadlineMs != null
            ? Math.max(0, countdownDeadlineMs - Date.now())
            : COUNTDOWN_TICK_MS;
    countdownPausedRemainingMs = remaining;
    clearCountdownTimer();
};

/** Resume a countdown frozen by {@link pauseCountdownForBackground}. */
export const resumeCountdownForBackground = (get: StoreGet, set: StoreSet): void => {
    if (countdownPausedRemainingMs == null || countdownPausedTickValue == null) {
        countdownPausedRemainingMs = null;
        countdownPausedTickValue = null;
        return;
    }
    if (get().countdown === null) {
        countdownPausedRemainingMs = null;
        countdownPausedTickValue = null;
        return;
    }
    const remaining = countdownPausedRemainingMs;
    const tickValue = countdownPausedTickValue;
    countdownPausedRemainingMs = null;
    scheduleCountdownTick(tickValue, get, set, remaining);
};

type StoreGet = () => GameStore;
type StoreSet = (
    partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)
) => void;

const launchSession = (get: StoreGet, set: StoreSet) => {
    const state = get();
    const settings = state.settings;
    const modalities = state.blockModalities ?? getModalitiesForMode(settings.mode);
    const session = new GameSession(get, set);
    set({
        game: session,
        countdown: null,
        activeModalities: modalities,
        btns: createEmptyButtons(modalities),
        boardState: {
            ...defaultBoardState,
            currentTrials: settings.trials,
            nForTrial: settings.level,
        },
    });
    session.begin();
};

function applyBlockConfigToStore(
    settings: GameStoreState['settings'],
    block: BlockConfig
): {
    settings: GameStoreState['settings'];
    blockModalities: ModalityId[] | null;
} {
    return {
        settings: applyBlockConfigToSettings(settings, block),
        blockModalities: null,
    };
}

function asInterferenceChance(value: number): InterferenceChance {
    const match = INTERFERENCE_OPTIONS.find((option) => option === value);
    return match ?? 0.125;
}

function applyMatchLadderToSettings<
    T extends GameStoreState['settings'],
>(settings: T, modeLadder: MatchLadderSnapshot): T {
    const level = settingsFromLevel(modeLadder.levelIndex);
    const { lureStage: _drop, ...rest } = settings;
    return {
        ...rest,
        level: level.n,
        variableN: level.variableN,
        interferenceChance: asInterferenceChance(level.interferenceChance),
        isiMin: level.isiMin,
        isiMax: level.isiMax,
    } as T;
}

function applyCyclicLadderToSettings<
    T extends GameStoreState['settings'],
>(settings: T, modeLadder: CurriculumModeLadderSnapshot): T {
    const level = settingsFromCurriculum(modeLadder);
    return {
        ...settings,
        level: level.n,
        variableN: level.variableN,
        interferenceChance: asInterferenceChance(level.interferenceChance),
        isiMin: level.isiMin,
        isiMax: level.isiMax,
        lureStage: level.lureStage,
    };
}

function resetTeachUiFlags(): Pick<
    GameStoreState,
    | 'teachIntroDismissed'
    | 'teachOptOutWarnShown'
    | 'teachDecideTrialCount'
    | 'teachOpStep'
    | 'teachOpEpoch'
    | 'teachRevealPositionIndex'
    | 'teachRevealLetter'
> {
    return {
        teachIntroDismissed: false,
        teachOptOutWarnShown: false,
        teachDecideTrialCount: 0,
        teachOpStep: null,
        teachOpEpoch: 0,
        teachRevealPositionIndex: null,
        teachRevealLetter: null,
    };
}

function enterTeachRampInStore(
    get: StoreGet,
    set: StoreSet,
    mode: ModeId,
    current: CurriculumModeLadderSnapshot
): void {
    const nextModeLadder = enterTeachRamp(current);
    const nextLadder = { ...get().cyclicLadder, [mode]: nextModeLadder };
    const settings = applyCyclicLadderToSettings(get().settings, nextModeLadder);
    set({
        cyclicLadder: nextLadder,
        settings,
        teachOptOutWarnShown: false,
        teachDecideTrialCount: 0,
        teachOpStep: null,
    });
    get().saveCyclicLadder();
    persistSettingsSnapshot(settings);
}

function applyBlockConfigToSettings<
    T extends GameStoreState['settings'],
>(settings: T, block: BlockConfig): T {
    const next: T = {
        ...settings,
        level: block.n,
        trials: block.trials,
        variableN: block.variableN,
        interferenceChance: asInterferenceChance(block.interferenceChance),
        isiMin: block.isiMin,
        isiMax: block.isiMax,
    };
    if (block.lureStage != null) {
        return { ...next, lureStage: block.lureStage };
    }
    const { lureStage: _removed, ...rest } = next;
    return rest as T;
}

function beginCountdown(get: StoreGet, set: StoreSet, clearLastResult: boolean) {
    clearCountdownTimer();
    resetCountdownBackgroundPause();
    set((state) => ({
        countdown: COUNTDOWN_START,
        results: clearLastResult
            ? { ...state.results, last: null }
            : state.results,
    }));
    scheduleCountdownTick(COUNTDOWN_START, get, set);
}

function finalizeGameEnd(
    get: StoreGet,
    set: StoreSet,
    result: GameResult
) {
    const state = get();
    const modalities = getModalitiesForMode(state.settings.mode);
    const playMode = state.settings.playMode;

    if (!isLadderPlayMode(playMode) || state.adaptiveSession == null) {
        set({
            results: {
                all: [...state.results.all, result],
                last: result,
            },
            game: null,
            activeModalities: modalities,
            btns: createEmptyButtons(modalities),
            boardState: { ...defaultBoardState },
            lastBlockRole: playMode === 'free' ? 'free' : null,
            lastControllerAction: null,
        });
        recordBlockCompleted();
        return;
    }

    if (blockRoleFromPhase(state.adaptiveSession.phase) == null) {
        throw new Error('Ladder block ended outside a playing phase');
    }

    const mode = state.settings.mode;

    if (playMode === 'adaptive') {
        const endResult = processMatchBlockEnd(
            state.adaptiveSession,
            state.ladder[mode],
            result.generalMatchPercentage
        );
        const nextLadderByMode = {
            ...state.ladder,
            [mode]: endResult.ladder,
        };
        set({
            results: {
                all: [...state.results.all, result],
                last: result,
            },
            game: null,
            activeModalities: modalities,
            btns: createEmptyButtons(modalities),
            boardState: { ...defaultBoardState },
            ladder: nextLadderByMode,
            adaptiveSession: endResult.session,
            lastBlockRole: endResult.blockRole,
            lastControllerAction: endResult.action,
            settings: applyMatchLadderToSettings(state.settings, endResult.ladder),
        });
        get().saveLadder();
        recordBlockCompleted();
        return;
    }

    const endResult = processCyclicBlockEnd(
        state.adaptiveSession,
        state.cyclicLadder[mode],
        result.sdt,
        result.generalMatchPercentage
    );
    const nextCyclicByMode = {
        ...state.cyclicLadder,
        [mode]: endResult.ladder,
    };
    const teachReset =
        endResult.ladder.stage === 'teach_decide'
            ? { teachDecideTrialCount: 0, teachOptOutWarnShown: false, teachOpStep: null }
            : endResult.ladder.stage === 'teach_walkthrough'
              ? { ...resetTeachUiFlags(), teachIntroDismissed: false }
              : {};
    set({
        results: {
            all: [...state.results.all, result],
            last: result,
        },
        game: null,
        activeModalities: modalities,
        btns: createEmptyButtons(modalities),
        boardState: { ...defaultBoardState },
        cyclicLadder: nextCyclicByMode,
        adaptiveSession: endResult.session,
        lastBlockRole: endResult.blockRole,
        lastControllerAction: endResult.action,
        settings: applyCyclicLadderToSettings(state.settings, endResult.ladder),
        ...teachReset,
    });
    get().saveCyclicLadder();
    recordBlockCompleted();
}

function matchLadderStorageFromState(
    ladder: Record<ModeId, MatchLadderSnapshot>
): AdaptiveLadderStorageV2 {
    return {
        version: 2,
        byMode: {
            dual: { ...ladder.dual },
            triple: { ...ladder.triple },
            quad: { ...ladder.quad },
        },
    };
}

function cyclicLadderStorageFromState(
    ladder: Record<ModeId, CurriculumModeLadderSnapshot>
): CyclicLadderStorageV3 {
    return {
        version: 4,
        byMode: {
            dual: { ...ladder.dual },
            triple: { ...ladder.triple },
            quad: { ...ladder.quad },
        },
    };
}

const initialAdaptiveLadderStorage = loadAdaptiveLadder();
const initialCyclicLadderStorage = loadCyclicLadder();
const initialPersistedSettings = loadSettings();

/** First-run free-play settings (also used when resetting fixture expectations in tests). */
export const createDefaultFreePlaySettings = (): GameStoreState['settings'] => ({
    level: 2,
    trials: 30,
    isiMin: FREE_PLAY_DEFAULT_ISI_MIN_MS,
    isiMax: FREE_PLAY_DEFAULT_ISI_MAX_MS,
    activeFeedback: false,
    displayTrials: true,
    displayTarget: true,
    allowCenterStimulus: false,
    positionGrid: '3x3',
    displayVariableNCenter: false,
    answerGraceMs: ANSWER_GRACE_DEFAULT_MS,
    useFullScreen: false,
    mode: 'dual',
    audioPack: 'letters',
    interferenceChance: 0.125,
    variableN: false,
    variableNHoldTrials: 1,
    playMode: 'free',
    useBlockQuotas: false,
    useJaeggiQuotas: true,
});

function settingsFromPersisted(): GameStoreState['settings'] {
    const s = initialPersistedSettings;
    return {
        level: s.level,
        trials: s.trials,
        isiMin: s.isiMin,
        isiMax: s.isiMax,
        activeFeedback: s.activeFeedback,
        displayTrials: s.displayTrials,
        displayTarget: s.displayTarget,
        allowCenterStimulus: s.allowCenterStimulus,
        positionGrid: s.positionGrid,
        displayVariableNCenter: s.displayVariableNCenter,
        answerGraceMs: s.answerGraceMs,
        useFullScreen: s.useFullScreen,
        mode: s.mode,
        audioPack: s.audioPack,
        interferenceChance: s.interferenceChance,
        variableN: s.variableN,
        variableNHoldTrials: s.variableNHoldTrials,
        playMode: s.playMode,
        useBlockQuotas: s.useBlockQuotas,
        useJaeggiQuotas: s.useJaeggiQuotas,
    };
}

function persistSettingsSnapshot(settings: GameStoreState['settings']): void {
    saveSettings(
        persistableSettingsFromStoreSettings(settings as unknown as Record<string, unknown>)
    );
    noteLocalProgressChanged();
}

const scheduleCountdownTick = (
    current: number,
    get: StoreGet,
    set: StoreSet,
    delayMs: number = COUNTDOWN_TICK_MS
) => {
    countdownPausedTickValue = current;
    countdownDeadlineMs = Date.now() + delayMs;
    countdownTimer = setTimeout(() => {
        countdownTimer = null;
        countdownDeadlineMs = null;
        countdownPausedTickValue = null;
        if (get().countdown === null) return;

        if (current <= 1) {
            launchSession(get, set);
            return;
        }

        const next = current - 1;
        set({ countdown: next });
        scheduleCountdownTick(next, get, set);
    }, delayMs);
};

export const useGameStore = create<GameStore>((set, get) => ({
    results: {
        all: [],
        last: null,
    },
    speech: new Speech(initialPersistedSettings.audioPack),
    btns: createEmptyButtons(getModalitiesForMode(initialPersistedSettings.mode)),
    activeModalities: getModalitiesForMode(initialPersistedSettings.mode),
    countdown: null,
    game: null,
    ladder: initialAdaptiveLadderStorage.byMode,
    cyclicLadder: initialCyclicLadderStorage.byMode,
    boardState: { ...defaultBoardState },
    settings: settingsFromPersisted(),
    adaptiveSession: null,
    lastBlockRole: null,
    lastControllerAction: null,
    blockModalities: null,
    freePlaySettingsSnapshot: null,
    ...resetTeachUiFlags(),
    startGame: () => {
        if (get().game !== null) {
            throw new Error('Game is already defined');
        }
        if (get().countdown !== null) {
            throw new Error('Countdown is already in progress');
        }

        // Start is a user gesture — force unmute/resume even after a stuck pagehide mute.
        void ensureAudioReady();

        const state = get();
        const { playMode, mode } = state.settings;

        if (state.adaptiveSession?.pendingContinue) {
            const session = {
                ...state.adaptiveSession,
                pendingContinue: false,
            };
            const block =
                playMode === 'adaptive'
                    ? nextMatchBlockConfig(state.ladder[mode], state.settings.trials)
                    : nextCyclicBlockConfig(
                          session,
                          state.cyclicLadder[mode],
                          mode,
                          state.settings.trials
                      );
            const applied = applyBlockConfigToStore(state.settings, block);
            set({
                adaptiveSession: {
                    ...session,
                    phase: playingPhaseForBlockRole(block.blockRole),
                },
                settings: applied.settings,
                blockModalities: applied.blockModalities,
            });
            beginCountdown(get, set, true);
            return;
        }

        if (isLadderPlayMode(playMode)) {
            const needsNewSession =
                state.adaptiveSession == null ||
                state.adaptiveSession.phase === 'summary';
            if (needsNewSession) {
                const session = createInitialAdaptiveSession();
                if (playMode === 'adaptive') {
                    const block = nextMatchBlockConfig(
                        state.ladder[mode],
                        state.settings.trials
                    );
                    const applied = applyBlockConfigToStore(
                        applyMatchLadderToSettings(state.settings, state.ladder[mode]),
                        block
                    );
                    set({
                        adaptiveSession: {
                            ...session,
                            phase: playingPhaseForBlockRole(block.blockRole),
                        },
                        lastBlockRole: null,
                        lastControllerAction: null,
                        settings: applied.settings,
                        blockModalities: applied.blockModalities,
                    });
                } else {
                    const block = nextCyclicBlockConfig(
                        session,
                        state.cyclicLadder[mode],
                        mode,
                        state.settings.trials
                    );
                    const applied = applyBlockConfigToStore(
                        applyCyclicLadderToSettings(
                            state.settings,
                            state.cyclicLadder[mode]
                        ),
                        block
                    );
                    set({
                        adaptiveSession: {
                            ...session,
                            phase: playingPhaseForBlockRole(block.blockRole),
                        },
                        lastBlockRole: null,
                        lastControllerAction: null,
                        settings: applied.settings,
                        blockModalities: applied.blockModalities,
                    });
                }
            }
        } else {
            set({
                adaptiveSession: null,
                lastBlockRole: null,
                lastControllerAction: null,
                blockModalities: null,
            });
        }

        beginCountdown(get, set, true);
    },
    cancelGame: () => {
        clearCountdownTimer();
        resetCountdownBackgroundPause();
        get().game?.cancel();
        const modalities = getModalitiesForMode(get().settings.mode);

        // Adaptive: Esc/Space abort the whole session (ladder deltas already saved stay).
        // Natural block ends use pendingContinue via finalizeGameEnd — not cancel.
        set({
            countdown: null,
            blockModalities: null,
            activeModalities: modalities,
            btns: createEmptyButtons(modalities),
            boardState: { ...defaultBoardState },
            adaptiveSession: null,
            lastBlockRole: null,
            lastControllerAction: null,
            ...resetTeachUiFlags(),
        });
    },
    selectModality: (modality) => {
        get().game?.selectModality(modality);
    },
    setBoardPosition: (positionIndex) =>
        set((state) => ({
            boardState: { ...state.boardState, positionIndex },
        })),
    setBoardTrials: (currentTrials) =>
        set((state) => ({
            boardState: { ...state.boardState, currentTrials },
        })),
    setButtonState: (type, buttonState) =>
        set((state) => ({
            btns: { ...state.btns, [type]: buttonState },
        })),
    resetButtons: () =>
        set((state) => ({
            btns: createEmptyButtons(state.activeModalities),
        })),
    pushGameResult: (result) => {
        finalizeGameEnd(get, set, result);
    },
    clearLastResult: () =>
        set((state) => ({
            results: { ...state.results, last: null },
        })),
    resetBoard: () => set({ boardState: { ...defaultBoardState } }),
    clearGame: () => set({ game: null }),
    decreaseLevel: () => {
        set((state) => ({
            settings: {
                ...state.settings,
                level: state.settings.level > 1 ? state.settings.level - 1 : state.settings.level,
            },
        }));
        persistSettingsSnapshot(get().settings);
    },
    increaseLevel: () => {
        set((state) => {
            const nextLevel = state.settings.level + 1;
            return {
                settings: {
                    ...state.settings,
                    level: nextLevel,
                    trials: Math.max(nextLevel * 2, state.settings.trials),
                },
            };
        });
        persistSettingsSnapshot(get().settings);
    },
    decreaseLadderStep: () => {
        const state = get();
        if (state.game !== null || state.countdown !== null) {
            return;
        }
        const mode = state.settings.mode;
        const playMode = state.settings.playMode;

        if (playMode === 'adaptive') {
            const current = state.ladder[mode];
            if (current.levelIndex <= 0 && current.failStreak === 0) {
                return;
            }
            const nextModeLadder: MatchLadderSnapshot = {
                levelIndex: clampLevelIndex(current.levelIndex - 1),
                failStreak: 0,
            };
            const nextLadder = { ...state.ladder, [mode]: nextModeLadder };
            set({
                ladder: nextLadder,
                settings: applyMatchLadderToSettings(state.settings, nextModeLadder),
            });
            get().saveLadder();
            persistSettingsSnapshot(get().settings);
            return;
        }

        if (playMode !== 'cyclic') {
            return;
        }

        const current = state.cyclicLadder[mode];
        const nextModeLadder = { ...demoteCurriculumStage(current), failStreak: 0 };
        if (
            nextModeLadder.stage === current.stage &&
            nextModeLadder.track === current.track &&
            nextModeLadder.n === current.n &&
            current.failStreak === 0
        ) {
            return;
        }
        const nextLadder = { ...state.cyclicLadder, [mode]: nextModeLadder };
        set({
            cyclicLadder: nextLadder,
            settings: applyCyclicLadderToSettings(state.settings, nextModeLadder),
        });
        get().saveCyclicLadder();
        persistSettingsSnapshot(get().settings);
    },
    increaseLadderStep: () => {
        const state = get();
        if (state.game !== null || state.countdown !== null) {
            return;
        }
        const mode = state.settings.mode;
        const playMode = state.settings.playMode;

        if (playMode === 'adaptive') {
            const current = state.ladder[mode];
            const ceiling = maxLevelIndex();
            if (current.levelIndex >= ceiling && current.failStreak === 0) {
                return;
            }
            const nextModeLadder: MatchLadderSnapshot = {
                levelIndex: clampLevelIndex(current.levelIndex + 1),
                failStreak: 0,
            };
            const nextLadder = { ...state.ladder, [mode]: nextModeLadder };
            set({
                ladder: nextLadder,
                settings: applyMatchLadderToSettings(state.settings, nextModeLadder),
            });
            get().saveLadder();
            persistSettingsSnapshot(get().settings);
            return;
        }

        if (playMode !== 'cyclic') {
            return;
        }

        const current = state.cyclicLadder[mode];
        const nextModeLadder = { ...promoteCurriculumStage(current), failStreak: 0 };
        if (
            nextModeLadder.stage === current.stage &&
            nextModeLadder.track === current.track &&
            nextModeLadder.n === current.n &&
            current.failStreak === 0
        ) {
            return;
        }
        const nextLadder = { ...state.cyclicLadder, [mode]: nextModeLadder };
        set({
            cyclicLadder: nextLadder,
            settings: applyCyclicLadderToSettings(state.settings, nextModeLadder),
        });
        get().saveCyclicLadder();
        persistSettingsSnapshot(get().settings);
    },
    resetCyclicLearningProgress: () => {
        const state = get();
        if (state.game !== null || state.countdown !== null) {
            return;
        }
        const byMode = createDefaultCyclicLadderByMode();
        const mode = state.settings.mode;
        const nextModeLadder = byMode[mode];
        const withMode = {
            ...state.settings,
            playMode: 'cyclic' as const,
        };
        set({
            cyclicLadder: byMode,
            settings: applyCyclicLadderToSettings(withMode, nextModeLadder),
            adaptiveSession: null,
            lastBlockRole: null,
            lastControllerAction: null,
            blockModalities: null,
            results: { ...state.results, last: null },
            ...resetTeachUiFlags(),
        });
        get().saveCyclicLadder();
        persistSettingsSnapshot(get().settings);
    },
    acknowledgeStrategyInstruction: () => {
        const state = get();
        if (state.game !== null || state.countdown !== null) {
            return;
        }
        if (state.settings.playMode !== 'cyclic') {
            return;
        }
        const mode = state.settings.mode;
        const current = state.cyclicLadder[mode];
        if (current.stage !== 'teach_walkthrough') {
            return;
        }
        set({ teachIntroDismissed: true });
    },
    requestTeachOptOut: () => {
        const state = get();
        if (state.settings.playMode !== 'cyclic') {
            return;
        }
        const mode = state.settings.mode;
        const current = state.cyclicLadder[mode];
        if (current.stage !== 'teach_decide' && current.stage !== 'teach_walkthrough') {
            return;
        }
        const threshold = teachSoftWarnDecideThreshold(current.n);
        if (
            current.stage === 'teach_decide' &&
            state.teachDecideTrialCount < threshold &&
            !state.teachOptOutWarnShown
        ) {
            set({ teachOptOutWarnShown: true });
            return;
        }
        enterTeachRampInStore(get, set, mode, current);
    },
    confirmTeachOptOut: () => {
        const state = get();
        if (state.settings.playMode !== 'cyclic') {
            return;
        }
        const mode = state.settings.mode;
        const current = state.cyclicLadder[mode];
        if (current.stage !== 'teach_decide' && current.stage !== 'teach_walkthrough') {
            return;
        }
        enterTeachRampInStore(get, set, mode, current);
    },
    dismissTeachOptOutWarn: () => {
        set({ teachOptOutWarnShown: false });
    },
    advanceTeachOp: () => {
        const state = get();
        const current = state.teachOpStep;
        if (current === null) return;
        let next: TeachOpStep | null;
        if (current === 'COMPARE') next = 'REPLACE';
        else if (current === 'REPLACE') next = 'NEXT';
        else next = null;
        set({
            teachOpStep: next,
            teachOpEpoch: state.teachOpEpoch + 1,
            ...(next === null
                ? {
                      boardState: {
                          ...state.boardState,
                          positionIndex: -1,
                          colorId: null,
                          imageId: null,
                      },
                      teachRevealPositionIndex: null,
                      teachRevealLetter: null,
                  }
                : {}),
        });
        if (next === null) {
            state.game?.resume();
        }
    },
    retreatTeachOp: () => {
        const state = get();
        const current = state.teachOpStep;
        if (current === null || current === 'COMPARE') return;
        const prev: TeachOpStep = current === 'NEXT' ? 'REPLACE' : 'COMPARE';
        set({
            teachOpStep: prev,
            teachOpEpoch: state.teachOpEpoch + 1,
        });
    },
    decreaseTrials: () => {
        set((state) => ({
            settings: {
                ...state.settings,
                trials:
                    state.settings.trials > state.settings.level * 2
                        ? state.settings.trials - 1
                        : state.settings.trials,
            },
        }));
        persistSettingsSnapshot(get().settings);
    },
    increaseTrials: () => {
        set((state) => ({
            settings: {
                ...state.settings,
                trials: state.settings.trials + 1,
            },
        }));
        persistSettingsSnapshot(get().settings);
    },
    setIsiMin: (ms) => {
        set((state) => {
            const isiMin = clampIsiMs(ms);
            return {
                settings: {
                    ...state.settings,
                    isiMin,
                    isiMax: Math.max(isiMin, state.settings.isiMax),
                },
            };
        });
        persistSettingsSnapshot(get().settings);
    },
    setIsiMax: (ms) => {
        set((state) => {
            const isiMax = clampIsiMs(ms);
            return {
                settings: {
                    ...state.settings,
                    isiMax,
                    isiMin: Math.min(isiMax, state.settings.isiMin),
                },
            };
        });
        persistSettingsSnapshot(get().settings);
    },
    setIsiBoth: (ms) => {
        const value = clampIsiMs(ms);
        set((state) => ({
            settings: {
                ...state.settings,
                isiMin: value,
                isiMax: value,
            },
        }));
        persistSettingsSnapshot(get().settings);
    },
    setAnswerGraceMs: (ms) => {
        set((state) => ({
            settings: {
                ...state.settings,
                answerGraceMs: clampAnswerGraceMs(ms),
            },
        }));
        persistSettingsSnapshot(get().settings);
    },
    setAllowCenterStimulus: (allow) => {
        set((state) => ({
            settings: {
                ...state.settings,
                allowCenterStimulus: allow,
                // Middle square can't host both a stimulus and the Variable N digit.
                displayVariableNCenter: allow ? false : state.settings.displayVariableNCenter,
            },
        }));
        persistSettingsSnapshot(get().settings);
    },
    setPositionGrid: (grid) => {
        set((state) => ({
            settings: {
                ...state.settings,
                positionGrid: grid,
                // 2×2 has no middle cell for center stimulus / N digit.
                displayVariableNCenter:
                    grid === '2x2' ? false : state.settings.displayVariableNCenter,
            },
        }));
        persistSettingsSnapshot(get().settings);
    },
    setDisplayVariableNCenter: (enabled) => {
        set((state) => {
            if (
                enabled &&
                (state.settings.allowCenterStimulus || state.settings.positionGrid === '2x2')
            ) {
                return state;
            }
            return {
                settings: {
                    ...state.settings,
                    displayVariableNCenter: enabled,
                },
            };
        });
        persistSettingsSnapshot(get().settings);
    },
    setMode: (mode) => {
        set((state) => {
            // Don't reshape live session chrome mid-run; snapshot applies on next start.
            if (state.game !== null) {
                return { settings: { ...state.settings, mode } };
            }
            const modalities = getModalitiesForMode(mode);
            let settings = { ...state.settings, mode };
            if (
                isLadderPlayMode(settings.playMode) &&
                state.countdown === null
            ) {
                settings =
                    settings.playMode === 'adaptive'
                        ? applyMatchLadderToSettings(settings, state.ladder[mode])
                        : applyCyclicLadderToSettings(settings, state.cyclicLadder[mode]);
            }
            return {
                settings,
                activeModalities: modalities,
                btns: createEmptyButtons(modalities),
                ...resetTeachUiFlags(),
            };
        });
        persistSettingsSnapshot(get().settings);
    },
    setAudioPack: (pack) => {
        set((state) => ({
            settings: { ...state.settings, audioPack: pack },
            speech: new Speech(pack),
        }));
        persistSettingsSnapshot(get().settings);
    },
    cycleInterferenceChance: () => {
        set((state) => {
            const current = state.settings.interferenceChance;
            const idx = INTERFERENCE_OPTIONS.indexOf(current);
            const next = INTERFERENCE_OPTIONS[(idx + 1) % INTERFERENCE_OPTIONS.length];
            return {
                settings: { ...state.settings, interferenceChance: next },
            };
        });
        persistSettingsSnapshot(get().settings);
    },
    setVariableN: (enabled) => {
        set((state) => ({
            settings: { ...state.settings, variableN: enabled },
        }));
        persistSettingsSnapshot(get().settings);
    },
    cycleVariableNHoldTrials: () => {
        set((state) => {
            const current = state.settings.variableNHoldTrials;
            const idx = VARIABLE_N_HOLD_OPTIONS.indexOf(current);
            const next =
                VARIABLE_N_HOLD_OPTIONS[(idx + 1) % VARIABLE_N_HOLD_OPTIONS.length];
            return {
                settings: { ...state.settings, variableNHoldTrials: next },
            };
        });
        persistSettingsSnapshot(get().settings);
    },
    setUseBlockQuotas: (enabled) => {
        set((state) => ({
            settings: { ...state.settings, useBlockQuotas: enabled },
        }));
        persistSettingsSnapshot(get().settings);
    },
    setUseJaeggiQuotas: (enabled) => {
        set((state) => ({
            settings: { ...state.settings, useJaeggiQuotas: enabled },
        }));
        persistSettingsSnapshot(get().settings);
    },
    setActiveFeedback: (enabled) => {
        set((state) => ({
            settings: { ...state.settings, activeFeedback: enabled },
        }));
        persistSettingsSnapshot(get().settings);
    },
    setPlayMode: (playMode) => {
        const state = get();
        if (state.game !== null || state.countdown !== null) {
            return;
        }
        set((current) => {
            if (isLadderPlayMode(playMode)) {
                const enteringFromFree = current.settings.playMode === 'free';
                const snapshot = enteringFromFree
                    ? {
                          level: current.settings.level,
                          isiMin: current.settings.isiMin,
                          isiMax: current.settings.isiMax,
                          variableN: current.settings.variableN,
                          variableNHoldTrials: current.settings.variableNHoldTrials,
                          interferenceChance: current.settings.interferenceChance,
                      }
                    : current.freePlaySettingsSnapshot;
                const withMode = { ...current.settings, playMode };
                const settings =
                    playMode === 'adaptive'
                        ? applyMatchLadderToSettings(
                              withMode,
                              current.ladder[current.settings.mode]
                          )
                        : applyCyclicLadderToSettings(
                              withMode,
                              current.cyclicLadder[current.settings.mode]
                          );
                const teachIntroPending =
                    playMode === 'cyclic' &&
                    current.cyclicLadder[current.settings.mode].stage === 'teach_walkthrough';
                return {
                    freePlaySettingsSnapshot: snapshot,
                    settings,
                    adaptiveSession: null,
                    lastBlockRole: null,
                    lastControllerAction: null,
                    blockModalities: null,
                    // Results panel was blocking the teach intro after a prior block.
                    ...(teachIntroPending
                        ? { results: { ...current.results, last: null } }
                        : {}),
                    ...resetTeachUiFlags(),
                };
            }

            const snapshot = current.freePlaySettingsSnapshot;
            const { lureStage: _removed, ...rest } = current.settings;
            let settings: GameStoreState['settings'] = { ...rest, playMode };
            if (snapshot != null) {
                settings = {
                    ...settings,
                    level: snapshot.level,
                    isiMin: snapshot.isiMin,
                    isiMax: snapshot.isiMax,
                    variableN: snapshot.variableN,
                    variableNHoldTrials:
                        snapshot.variableNHoldTrials ?? settings.variableNHoldTrials,
                    interferenceChance: snapshot.interferenceChance,
                };
            }

            return {
                settings,
                freePlaySettingsSnapshot: null,
                adaptiveSession: null,
                lastBlockRole: null,
                lastControllerAction: null,
                blockModalities: null,
                ...resetTeachUiFlags(),
            };
        });
        persistSettingsSnapshot(get().settings);
    },
    saveLadder: () => {
        persistAdaptiveLadder(matchLadderStorageFromState(get().ladder));
        noteLocalProgressChanged();
    },
    saveCyclicLadder: () => {
        persistCyclicLadder(cyclicLadderStorageFromState(get().cyclicLadder));
        noteLocalProgressChanged();
    },
}));
