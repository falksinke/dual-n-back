import { Game, ResultMatch, type TeachRevealPayload } from '../model/Game';
import { BoardState } from '../model/types';
import { GameResult } from '../model/GameResult';
import { ButtonState } from '../model/enums/buttonState';
import { ModalityId, resolveModalities } from '../model/modalities';
import { GameStore } from './gameStore';
import { clearStimulusTimers, presentBoardStimulus } from './stimulusPresentation';
import { settingsFromCurriculum } from '../model/adaptiveCurriculum';
import { playStimulusBleep } from '../audio/stimulusBleep';

type StoreGetter = () => GameStore;
type StoreSetter = (
    partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)
) => void;

let buttonTimeout: ReturnType<typeof setTimeout> | null = null;
/** Bumps on every onset/score so a late clear timeout cannot touch a newer trial. */
let feedbackEpoch = 0;
/** Last end-of-trial flash duration; used to carry colors across the next onset. */
let pendingScoreFeedbackMs = 0;

const clearButtonTimeout = () => {
    if (buttonTimeout !== null) {
        clearTimeout(buttonTimeout);
        buttonTimeout = null;
    }
};

const resetButtons = (
    setStore: StoreSetter,
    modalities: ModalityId[]
): void => {
    setStore({
        btns: Object.fromEntries(
            modalities.map((m) => [m, ButtonState.None])
        ) as Partial<Record<ModalityId, `${ButtonState}`>>,
    });
};

/**
 * Clear success/error after `feedbackMs` (trial-tied), not a floating constant.
 * Epoch guard drops stale timers if an onset already advanced the trial.
 */
const scheduleButtonClear = (
    getStore: StoreGetter,
    setStore: StoreSetter,
    feedbackMs: number
): void => {
    clearButtonTimeout();
    if (feedbackMs <= 0) return;
    const epoch = feedbackEpoch;
    buttonTimeout = setTimeout(() => {
        if (epoch !== feedbackEpoch) return;
        resetButtons(setStore, getStore().activeModalities);
        buttonTimeout = null;
    }, feedbackMs);
};

const defaultBoardReset = {
    positionIndex: -1,
    audioToken: null,
    colorId: null,
    imageId: null,
    currentTrials: -1,
    nForTrial: -1,
    stimulusEpoch: 0,
    positionRecency: [] as Array<number | null>,
};

type StepwiseFrame = {
    boardState: BoardState;
    positionRecency: Array<number | null>;
};

/**
 * Paced mode: freeze the trial clock at onset; stimulus/feedback visuals keep
 * their natural timing while claims stay open until Space/tap continues.
 */
const engageStepwisePause = (getStore: StoreGetter, setStore: StoreSetter): void => {
    getStore().game?.pause({ allowClaims: true });
    setStore({ stepwisePaused: true });
};

export class GameSession extends Game {
    private getStore: StoreGetter;
    private setStore: StoreSetter;
    private stepwiseFrames: StepwiseFrame[] = [];
    private stepwiseFrameIndex = -1;

    constructor(getStore: StoreGetter, setStore: StoreSetter) {
        const store = getStore();
        const settings = store.settings;
        super(
            settings.level,
            settings.trials,
            settings.isiMin,
            settings.isiMax,
            (boardState) => GameSession.onBoardStateChange(getStore, setStore, boardState),
            (match, feedbackMs) =>
                GameSession.onPlayerChoiceValidated(getStore, setStore, match, feedbackMs),
            (gameResult) => GameSession.onGameEnded(getStore, setStore, gameResult),
            {
                // Adaptive/Cyclic stay on the standard 3×3; 2×2 is free-play only.
                positionGrid:
                    settings.playMode === 'free' ? settings.positionGrid : '3x3',
                allowCenterStimulus: settings.allowCenterStimulus,
                mode: settings.mode,
                modalities:
                    store.blockModalities ??
                    resolveModalities(
                        settings.mode,
                        settings.tripleModalities,
                        settings.singleModality
                    ),
                interferenceChance:
                    settings.interferenceChance === 'easy' ? 0 : settings.interferenceChance,
                avoidAccidentalLures: settings.interferenceChance === 'easy',
                variableN: settings.variableN,
                variableNHoldTrials: settings.variableNHoldTrials,
                activeFeedback: settings.activeFeedback,
                answerGraceMs: settings.answerGraceMs,
                audioPack: settings.audioPack,
                imageDifficulty: settings.imageDifficulty,
                lureStage: settings.lureStage,
                useBlockQuotas:
                    settings.useBlockQuotas && settings.lureStage != null ? true : undefined,
                useJaeggiQuotas: settings.useJaeggiQuotas,
            }
        );
        this.getStore = getStore;
        this.setStore = setStore;
    }

    public begin(): void {
        if (this.getStore().settings.useFullScreen) {
            document.body.requestFullscreen?.().catch(() => undefined);
        }
        void this.start();
    }

    public pause(options?: { allowClaims?: boolean }): void {
        super.pause(options);
        // Teach Continue-gate: keep stimulus/feedback; only freeze the trial clock.
        if (options?.allowClaims) return;
        clearStimulusTimers();
        feedbackEpoch++;
        clearButtonTimeout();
    }

    public resume(): void {
        super.resume();
    }

    private playOnsetCue(): void {
        const { settings, activeModalities } = this.getStore();
        if (
            settings.mode === 'single' &&
            !activeModalities.includes('audio')
        ) {
            playStimulusBleep();
        }
    }

    private presentFrame(frame: StepwiseFrame): void {
        presentBoardStimulus(
            this.getStore,
            this.setStore,
            frame.boardState,
            frame.positionRecency
        );
        this.playOnsetCue();
    }

    private recordStepwiseFrame(
        boardState: BoardState,
        positionRecency: Array<number | null>
    ): void {
        this.stepwiseFrames.push({
            boardState: { ...boardState },
            positionRecency: [...positionRecency],
        });
        this.stepwiseFrameIndex = this.stepwiseFrames.length - 1;
    }

    public canStepBackward(): boolean {
        return this.isPaused && this.stepwiseFrameIndex > 0;
    }

    public isReviewingStepwiseHistory(): boolean {
        return this.stepwiseFrameIndex >= 0 && this.stepwiseFrameIndex < this.stepwiseFrames.length - 1;
    }

    /** The last N displayed positions, including the current/reviewed stimulus. */
    public getMemoryPositionIndices(): number[] {
        const frame = this.stepwiseFrames[this.stepwiseFrameIndex];
        if (!frame) return [];
        const positions = new Set([frame.boardState.positionIndex]);
        frame.positionRecency.forEach((lag, index) => {
            // Recency was captured before this stimulus entered the history.
            if (lag !== null && lag < frame.boardState.nForTrial) positions.add(index);
        });
        return [...positions];
    }

    public stepBackward(): void {
        if (!this.canStepBackward()) return;
        this.stepwiseFrameIndex -= 1;
        const frame = this.stepwiseFrames[this.stepwiseFrameIndex];
        if (frame) this.presentFrame(frame);
    }

    public stepForward(): void {
        if (this.isReviewingStepwiseHistory()) {
            this.stepwiseFrameIndex += 1;
            const frame = this.stepwiseFrames[this.stepwiseFrameIndex];
            if (frame) this.presentFrame(frame);
            return;
        }
        super.stepForward();
    }

    public cancel(): void {
        if (this.getStore().settings.useFullScreen && document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => undefined);
        }
        clearStimulusTimers();
        feedbackEpoch++;
        clearButtonTimeout();
        this.stop();
        this.setStore({
            game: null,
            memoryPreviewBoard: null,
            boardState: defaultBoardReset,
        });
    }

    public selectModality(modality: ModalityId): void {
        // A reviewed frame is visual history; claims still belong to the live trial.
        if (!this.isGameInProgress || this.isReviewingStepwiseHistory()) return;
        const accepted = this.addChoice(modality);
        if (!accepted) return;
        if (this.getStore().settings.activeFeedback) {
            const outcome = this.getClaimFeedback(modality);
            this.getStore().setButtonState(
                modality,
                outcome === 'success' ? ButtonState.Success : ButtonState.Error
            );
            return;
        }
        this.getStore().setButtonState(modality, ButtonState.Pressed);
    }

    public getTeachReveal(): TeachRevealPayload {
        return super.getTeachReveal();
    }

    private static onBoardStateChange = (
        getStore: StoreGetter,
        setStore: StoreSetter,
        boardState: BoardState
    ) => {
        const store = getStore();
        const holdMs = pendingScoreFeedbackMs;
        const holdingScoreFeedback =
            holdMs > 0 &&
            store.activeModalities.some((m) => {
                const b = store.btns[m];
                return b === ButtonState.Success || b === ButtonState.Error;
            });
        pendingScoreFeedbackMs = 0;

        feedbackEpoch++;
        clearButtonTimeout();
        if (holdingScoreFeedback) {
            // Short fixed ISI: score and next onset land in the same turn.
            // Keep success/error visible briefly instead of wiping immediately.
            scheduleButtonClear(getStore, setStore, holdMs);
        } else {
            resetButtons(setStore, store.activeModalities);
        }

        const teachUpdates: Partial<GameStore> = {};
        const { playMode, mode } = store.settings;
        const trialIndex = store.settings.trials - boardState.currentTrials;
        const effectiveN =
            boardState.nForTrial > 0 ? boardState.nForTrial : store.settings.level;
        // First N cues only fill slots — nothing to compare/replace yet.
        const teachScorable = trialIndex >= effectiveN;
        if (playMode === 'cyclic') {
            const ladder = store.cyclicLadder[mode];
            const curriculum = settingsFromCurriculum(ladder);
            if (ladder.stage === 'teach_decide') {
                if (trialIndex > 0) {
                    teachUpdates.teachDecideTrialCount = store.teachDecideTrialCount + 1;
                }
            }
            if (curriculum.teachPacedOps && teachScorable) {
                // Freeze only once there is a stored slot to compare/replace.
                teachUpdates.teachOpStep = 'COMPARE';
            } else {
                teachUpdates.teachOpStep = null;
            }
            if (curriculum.teachReveals && teachScorable) {
                const reveal = getStore().game?.getTeachReveal?.() ?? {
                    revealPositionIndex: null,
                    revealLetter: null,
                };
                teachUpdates.teachRevealPositionIndex = reveal.revealPositionIndex;
                teachUpdates.teachRevealLetter = reveal.revealLetter;
            } else {
                teachUpdates.teachRevealPositionIndex = null;
                teachUpdates.teachRevealLetter = null;
            }
        } else {
            teachUpdates.teachRevealPositionIndex = null;
            teachUpdates.teachRevealLetter = null;
            teachUpdates.teachOpStep = null;
        }
        if (Object.keys(teachUpdates).length > 0) {
            setStore(teachUpdates);
        }

        const positionRecency = getStore().game?.getPositionRecency() ?? [];
        getStore().game?.recordStepwiseFrame(boardState, positionRecency);
        presentBoardStimulus(getStore, setStore, boardState, positionRecency);
        getStore().game?.playOnsetCue();

        if (playMode === 'cyclic') {
            const ladder = store.cyclicLadder[mode];
            const curriculum = settingsFromCurriculum(ladder);
            if (curriculum.teachPacedOps && teachScorable) {
                // Hold stimulus on-screen; clock stays frozen until NEXT → Continue.
                clearStimulusTimers();
                getStore().game?.pause({ allowClaims: true });
            } else if (store.settings.stepwisePacing) {
                engageStepwisePause(getStore, setStore);
            }
        } else if (store.settings.stepwisePacing) {
            engageStepwisePause(getStore, setStore);
        }
    };

    private static onPlayerChoiceValidated = (
        getStore: StoreGetter,
        setStore: StoreSetter,
        match: ResultMatch,
        feedbackMs: number
    ) => {
        const modalities = getStore().activeModalities;
        const btns: Partial<Record<ModalityId, `${ButtonState}`>> = {};
        for (const modality of modalities) {
            const result = match[modality];
            btns[modality] = result
                ? result === 'success'
                    ? ButtonState.Success
                    : ButtonState.Error
                : ButtonState.None;
        }
        pendingScoreFeedbackMs = feedbackMs;
        setStore({ btns });
        scheduleButtonClear(getStore, setStore, feedbackMs);
    };

    private static onGameEnded = (
        getStore: StoreGetter,
        _setStore: StoreSetter,
        gameResult: GameResult
    ) => {
        if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => undefined);
        }
        clearStimulusTimers();
        feedbackEpoch++;
        clearButtonTimeout();
        getStore().pushGameResult(gameResult);
    };
}
