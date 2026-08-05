import { Game, ResultMatch, type TeachRevealPayload } from '../model/Game';
import { BoardState } from '../model/types';
import { GameResult } from '../model/GameResult';
import { ButtonState } from '../model/enums/buttonState';
import { ModalityId } from '../model/modalities';
import { GameStore } from './gameStore';
import { clearStimulusTimers, presentBoardStimulus } from './stimulusPresentation';
import { settingsFromCurriculum } from '../model/adaptiveCurriculum';

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
};

export class GameSession extends Game {
    private getStore: StoreGetter;
    private setStore: StoreSetter;

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
                modalities: store.blockModalities ?? undefined,
                interferenceChance: settings.interferenceChance,
                variableN: settings.variableN,
                variableNHoldTrials: settings.variableNHoldTrials,
                activeFeedback: settings.activeFeedback,
                answerGraceMs: settings.answerGraceMs,
                audioPack: settings.audioPack,
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
            boardState: defaultBoardReset,
        });
    }

    public selectModality(modality: ModalityId): void {
        if (!this.isGameInProgress) return;
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

        presentBoardStimulus(getStore, setStore, boardState);

        if (playMode === 'cyclic') {
            const ladder = store.cyclicLadder[mode];
            const curriculum = settingsFromCurriculum(ladder);
            if (curriculum.teachPacedOps && teachScorable) {
                // Hold stimulus on-screen; clock stays frozen until NEXT → Continue.
                clearStimulusTimers();
                getStore().game?.pause({ allowClaims: true });
            }
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
