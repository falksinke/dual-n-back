import { GameHistory, ModalityStrata } from './GameHistory';
import { Match } from './Match';
import { buildNBackDistribution, GameResult } from './GameResult';
import { AudioPackId, getRandomAudioToken } from './audioPacks';
import { getRandomColorId } from './colorSet';
import { getRandomImageId } from './imageSet';
import { ModalityId, getModalitiesForMode, ModeId } from './modalities';
import { ModalityPlan, planBlockStimuli, TrialPlanEntry } from './blockQuotas';
import { planJaeggiStimuli } from './jaeggiQuotas';
import { getLureStagePolicy, lureOffsetsForStage, LureStageId } from './lureStages';
import { buildBlockSdtReport, classifySdtCell } from './sdtMetrics';
import {
    BUTTON_FEEDBACK_MS,
    BUTTON_FEEDBACK_RESERVE_MS,
    clampAnswerGraceMs,
    MIN_CLAIM_MS_FOR_FEEDBACK_RESERVE,
} from './isi';
import { BoardState, GameDeps, getModalityValue } from './types';
import { clampVariableNHoldTrials, makeVariableNList } from './variableN';
import { buildEffectiveNs, planVariableNStimuli } from './variableNQuotas';

export type ResultMatch = Partial<Record<ModalityId, 'success' | 'failed'>>;

export type TeachRevealPayload = {
    revealPositionIndex: number | null;
    revealLetter: string | null;
};
export {
    VARIABLE_N_HOLD_OPTIONS,
    clampVariableNHoldTrials,
    makeVariableNList,
    type VariableNHoldTrials,
} from './variableN';

const DEFAULT_GUARANTEED_MATCH_CHANCE = 0.125;
const DEFAULT_INTERFERENCE_CHANCE = 0.125;

export class Game {
    private readonly sessionLevel: number;
    private readonly gameHistory: GameHistory;
    private readonly gameLength: number;
    private readonly isiMin: number;
    private readonly isiMax: number;
    private readonly random: () => number;
    private readonly positionGrid: '3x3' | '2x2';
    private readonly allowCenterStimulus: boolean;
    private readonly activeModalities: ModalityId[];
    private readonly interferenceChance: number;
    private readonly guaranteedMatchChance: number;
    private readonly variableN: boolean;
    private readonly activeFeedback: boolean;
    private readonly answerGraceMs: number;
    private readonly variableNList: number[];
    private readonly audioPack: AudioPackId;
    private readonly lureStage: LureStageId | null;
    private readonly useBlockQuotas: boolean;
    private readonly useJaeggiQuotas: boolean;
    private readonly trialPlan: TrialPlanEntry[] | null;

    private _isGameInProgress: boolean;
    private _playerChoice: Match | null;
    private _currentState: BoardState | null;
    private _currentMatch: ResultMatch | null;
    private _currentIteration: number;
    private _pendingStrata: ModalityStrata;
    private _pendingLureLags: Partial<Record<ModalityId, number>>;
    private _trialOnsetMs: number | null;
    private _claimRtMs: Partial<Record<ModalityId, number>>;
    /** False after scoring until the next onset — blocks late claims from attaching to the next trial. */
    private _claimsOpen: boolean;
    private _feedbackMs: number;

    private onStateChanged: (boardState: BoardState) => void;
    private onPlayerChoiceValidated: (match: ResultMatch, feedbackMs: number) => void;
    private onGameEnded: (gameResult: GameResult) => void;

    get currentState(): BoardState | null {
        return this._currentState;
    }

    set currentState(newState: BoardState | null) {
        if (newState === null) return;
        this._currentState = newState;
        this.onStateChanged(newState);
        this.gameHistory.addState(newState, this._pendingStrata, this._pendingLureLags);
        this._pendingStrata = {};
        this._pendingLureLags = {};
        this._trialOnsetMs = Date.now();
        this._claimRtMs = {};
        this._claimsOpen = true;
    }

    get currentMatch(): ResultMatch | null {
        return this._currentMatch;
    }

    set currentMatch(match: ResultMatch | null) {
        if (match === null) return;
        this._currentMatch = match;
        this.onPlayerChoiceValidated(match, this._feedbackMs);

        for (const modality of this.activeModalities) {
            const result = match[modality];
            if (result) {
                this.gameHistory.addMatch(modality, result);
            }
        }
    }

    get isGameInProgress(): boolean {
        return this._isGameInProgress;
    }

    get modalities(): ModalityId[] {
        return this.activeModalities;
    }

    /** Stored slot values for reveal-first teach (n-back target at trial onset). */
    getTeachRevealForTrial(trialIndex: number): TeachRevealPayload {
        const effectiveN = this.getEffectiveN(trialIndex);
        if (trialIndex < effectiveN) {
            return { revealPositionIndex: null, revealLetter: null };
        }
        const prior = this.gameHistory.boardStates[trialIndex - effectiveN];
        if (prior == null) {
            return { revealPositionIndex: null, revealLetter: null };
        }
        return {
            revealPositionIndex: this.activeModalities.includes('position')
                ? prior.positionIndex
                : null,
            revealLetter: this.activeModalities.includes('audio') ? prior.audioToken : null,
        };
    }

    getTeachReveal(): TeachRevealPayload {
        return this.getTeachRevealForTrial(this.gameHistory.boardStates.length);
    }

    constructor(
        n: number,
        gameLength: number,
        isiMin: number,
        isiMax: number,
        onStateChanged: (boardState: BoardState) => void = () => undefined,
        onPlayerChoiceValidated: (
            match: ResultMatch,
            _feedbackMs?: number
        ) => void = () => undefined,
        onGameEnded: (gameResult: GameResult) => void = () => undefined,
        deps: GameDeps = {}
    ) {
        this.sessionLevel = n;
        const mode: ModeId = deps.mode ?? 'dual';
        this.activeModalities = deps.modalities ?? getModalitiesForMode(mode);
        this.gameHistory = new GameHistory(this.activeModalities);
        this.gameLength = gameLength;
        this.isiMin = Math.min(isiMin, isiMax);
        this.isiMax = Math.max(isiMin, isiMax);
        this.random = deps.random ?? Math.random;
        this.positionGrid = deps.positionGrid === '2x2' ? '2x2' : '3x3';
        this.allowCenterStimulus = deps.allowCenterStimulus ?? false;
        this.interferenceChance = deps.interferenceChance ?? DEFAULT_INTERFERENCE_CHANCE;
        this.guaranteedMatchChance = deps.guaranteedMatchChance ?? DEFAULT_GUARANTEED_MATCH_CHANCE;
        this.variableN = deps.variableN ?? false;
        this.activeFeedback = deps.activeFeedback ?? false;
        // Default 0 so unit tests keep tight timers; GameSession passes settings.
        this.answerGraceMs = clampAnswerGraceMs(deps.answerGraceMs ?? 0);
        this.audioPack = deps.audioPack ?? 'letters';
        this.lureStage = deps.lureStage ?? null;
        this.useBlockQuotas = deps.useBlockQuotas ?? false;
        this.useJaeggiQuotas = deps.useJaeggiQuotas ?? false;
        // N schedule first so targets/lures can respect per-trial effective N.
        this.variableNList = this.variableN
            ? makeVariableNList(
                  gameLength,
                  n,
                  this.random,
                  clampVariableNHoldTrials(deps.variableNHoldTrials ?? 1)
              )
            : [];
        this.trialPlan = (() => {
            if (this.variableN) {
                const effectiveNs = buildEffectiveNs(gameLength, n, this.variableNList);
                return planVariableNStimuli({
                    gameLength,
                    sessionN: n,
                    effectiveNs,
                    modalities: this.activeModalities,
                    interferenceChance: this.interferenceChance,
                    random: this.random,
                }).trials;
            }
            if (this.useBlockQuotas && this.lureStage != null) {
                return planBlockStimuli({
                    gameLength,
                    sessionN: n,
                    modalities: this.activeModalities,
                    lureStage: this.lureStage,
                    random: this.random,
                }).trials;
            }
            // Jaeggi fixed counts: free-play / Adaptive fixed-N (no lure stage).
            if (this.useJaeggiQuotas && this.lureStage == null) {
                return planJaeggiStimuli({
                    gameLength,
                    sessionN: n,
                    modalities: this.activeModalities,
                    random: this.random,
                }).trials;
            }
            return null;
        })();
        this.onStateChanged = onStateChanged;
        this.onPlayerChoiceValidated = onPlayerChoiceValidated;
        this.onGameEnded = onGameEnded;

        this._isGameInProgress = false;
        this._playerChoice = null;
        this._currentState = null;
        this._currentMatch = null;
        this._currentIteration = 0;
        this._pendingStrata = {};
        this._pendingLureLags = {};
        this._trialOnsetMs = null;
        this._claimRtMs = {};
        this._claimsOpen = false;
        this._feedbackMs = 0;
        this.delayTimeout = null;
        this.delayResolve = null;
    }

    private delayTimeout: ReturnType<typeof setTimeout> | null = null;
    private delayResolve: (() => void) | null = null;
    private delayDeadlineMs: number | null = null;
    private delayRemainingMs: number | null = null;
    private _paused = false;
    /** When true, {@link pause} also blocks {@link addChoice} (default). */
    private _pauseBlocksClaims = true;

    public async start(): Promise<void> {
        this._isGameInProgress = true;
        this._paused = false;
        this._pauseBlocksClaims = true;
        this.resetChoice();
        this.gameHistory.reset();

        this._currentIteration = 0;
        while (this._currentIteration < this.gameLength && this._isGameInProgress) {
            this.generateState();
            if (!this._isGameInProgress) break;

            const isi = this.sampleIsi();
            // Prefer scoring at isiMin; onset-to-onset still uses sampled ISI.
            let responseMs = Math.min(this.isiMin, isi);
            let remainder = isi - responseMs;

            // Extra press time (settings slider) — extends this trial’s onset gap.
            if (this.answerGraceMs > 0) {
                responseMs += this.answerGraceMs;
            }

            // Single/fixed ISI leaves no gap after score — carve a short feedback
            // slice from the answer window so the next onset does not wipe colors
            // in the same turn. Total onset spacing = responseMs + remainder.
            // Never shrink the claim window below MIN_CLAIM_MS_FOR_FEEDBACK_RESERVE
            // (fixed 1.0s must stay fully pressable).
            if (
                remainder === 0 &&
                !this.activeFeedback &&
                responseMs - BUTTON_FEEDBACK_RESERVE_MS >= MIN_CLAIM_MS_FOR_FEEDBACK_RESERVE
            ) {
                responseMs -= BUTTON_FEEDBACK_RESERVE_MS;
                remainder = BUTTON_FEEDBACK_RESERVE_MS;
            }

            await this.delay(responseMs);
            if (!this._isGameInProgress) break;

            // End-of-trial colors need a non-zero flash. When there is a remainder
            // gap, show during that gap. When carve was skipped (short fixed ISI),
            // still request a reserve flash — GameSession carries it across onset
            // so claim time stays full and pacing stays ISI (no extra delay).
            this._feedbackMs = !this.activeFeedback
                ? remainder > 0
                    ? Math.min(BUTTON_FEEDBACK_MS, remainder)
                    : BUTTON_FEEDBACK_RESERVE_MS
                : 0;
            this._claimsOpen = false;
            this.processChoice();

            if (remainder > 0) {
                await this.delay(remainder);
                if (!this._isGameInProgress) break;
            }

            this._currentIteration++;
        }

        if (this._isGameInProgress) {
            this._isGameInProgress = false;
            this.onGameEnded(this.getGameResult());
        }
    }

    public stop(): void {
        this._isGameInProgress = false;
        this._paused = false;
        this._pauseBlocksClaims = true;
        this.clearDelay(true);
    }

    /**
     * Freeze the trial clock (e.g. app backgrounded, or teach Continue gate).
     * Does not end the session.
     * @param options.allowClaims - if true, match claims stay open while paused (teach).
     */
    public pause(options?: { allowClaims?: boolean }): void {
        if (!this._isGameInProgress || this._paused) return;
        this._paused = true;
        this._pauseBlocksClaims = options?.allowClaims !== true;
        if (this.delayTimeout !== null && this.delayDeadlineMs != null) {
            this.delayRemainingMs = Math.max(0, this.delayDeadlineMs - Date.now());
            clearTimeout(this.delayTimeout);
            this.delayTimeout = null;
            this.delayDeadlineMs = null;
        }
    }

    /** Continue after {@link pause}. */
    public resume(): void {
        if (!this._paused || !this._isGameInProgress) return;
        this._paused = false;
        this._pauseBlocksClaims = true;
        if (this.delayResolve != null) {
            this.armCurrentDelay();
        }
    }

    get isPaused(): boolean {
        return this._paused;
    }

    public addChoice(modality: ModalityId): boolean {
        if (
            !this._isGameInProgress ||
            (this._paused && this._pauseBlocksClaims) ||
            !this._claimsOpen ||
            !this.activeModalities.includes(modality) ||
            this.gameHistory.boardStates.length < 1 ||
            this.gameHistory.boardStates.length > this.gameLength
        ) {
            return false;
        }

        if (this._playerChoice == null) {
            this._playerChoice = new Match(this.activeModalities);
        }

        if (this._claimRtMs[modality] == null && this._trialOnsetMs != null) {
            this._claimRtMs[modality] = Date.now() - this._trialOnsetMs;
        }

        this._playerChoice.claim(modality);
        return true;
    }

    /**
     * Live match outcome for a claim on the current trial (for instant button feedback).
     * Does not record SDT or Match-% — scoring still happens at the response window close.
     */
    public getClaimFeedback(modality: ModalityId): 'success' | 'failed' {
        const trialIndex = this.gameHistory.boardStates.length - 1;
        if (trialIndex < 0) return 'failed';
        const effectiveN = this.getEffectiveN(trialIndex);
        if (trialIndex < effectiveN) return 'failed';
        return this.isModalityMatch(modality, effectiveN) ? 'success' : 'failed';
    }

    /** Uniform sample of inter-stimulus interval (stimulus onset → next onset). */
    private sampleIsi(): number {
        if (this.isiMax <= this.isiMin) {
            return this.isiMin;
        }
        return Math.round(this.isiMin + this.random() * (this.isiMax - this.isiMin));
    }

    private clearDelay(resolvePending = true): void {
        if (this.delayTimeout !== null) {
            clearTimeout(this.delayTimeout);
            this.delayTimeout = null;
        }
        this.delayDeadlineMs = null;
        if (resolvePending && this.delayResolve != null) {
            const resolve = this.delayResolve;
            this.delayResolve = null;
            this.delayRemainingMs = null;
            resolve();
        }
    }

    private armCurrentDelay(): void {
        const ms = this.delayRemainingMs ?? 0;
        this.delayDeadlineMs = Date.now() + ms;
        this.delayTimeout = setTimeout(() => {
            this.delayTimeout = null;
            this.delayDeadlineMs = null;
            this.delayRemainingMs = null;
            const resolve = this.delayResolve;
            this.delayResolve = null;
            resolve?.();
        }, ms);
    }

    private delay(milliseconds: number): Promise<void> {
        return new Promise((resolve) => {
            this.clearDelay(true);
            this.delayResolve = resolve;
            this.delayRemainingMs = milliseconds;
            if (this._paused) return;
            this.armCurrentDelay();
        });
    }

    private processChoice(): void {
        if (this._playerChoice == null) {
            this._playerChoice = new Match(this.activeModalities);
        }
        this.gameHistory.addChoice(this._playerChoice);
        this.validateChoice();
        this.resetChoice();
    }

    private getEffectiveN(trialIndex: number): number {
        if (!this.variableN) {
            return this.sessionLevel;
        }
        if (trialIndex < this.sessionLevel) {
            return this.sessionLevel;
        }
        const listIndex = trialIndex - this.sessionLevel;
        return this.variableNList[listIndex] ?? this.sessionLevel;
    }

    private isModalityMatch(modality: ModalityId, effectiveN: number): boolean {
        const currentIndex = this.gameHistory.boardStates.length - 1;
        const current = getModalityValue(this.gameHistory.boardStates[currentIndex], modality);
        const previous = getModalityValue(
            this.gameHistory.boardStates[currentIndex - effectiveN],
            modality
        );
        return current === previous;
    }

    private validateChoice(): void {
        if (this._playerChoice === null) return;

        const match: ResultMatch = {};
        const trialIndex = this.gameHistory.boardStates.length - 1;
        const effectiveN = this.getEffectiveN(trialIndex);
        const strata = this.gameHistory.modalityStrata[trialIndex] ?? {};
        const lureLags = this.gameHistory.modalityLureLags[trialIndex] ?? {};

        for (const modality of this.activeModalities) {
            const claimed = this._playerChoice.isClaimed(modality);

            if (trialIndex < effectiveN) {
                if (claimed) match[modality] = 'failed';
                continue;
            }

            const matched = this.isModalityMatch(modality, effectiveN);
            const cell = classifySdtCell(matched, claimed);
            const stratum = matched ? 'clean' : (strata[modality] ?? 'clean');
            this.gameHistory.addSdtEvent({
                modality,
                cell,
                stratum,
                lureLag: !matched && stratum === 'lure' ? lureLags[modality] : undefined,
                responseTimeMs: claimed ? this._claimRtMs[modality] : undefined,
            });

            // Match-% recap stays attempt-on-decision only (matched || claimed); SDT is additive.
            if (matched || claimed) {
                match[modality] = matched === claimed ? 'success' : 'failed';
            }
        }

        this.currentMatch = match;
    }

    private getGameResult(): GameResult {
        const recaps = {} as Record<ModalityId, { success: number; failed: number }>;
        for (const modality of this.activeModalities) {
            recaps[modality] = this.gameHistory.matches[modality] ?? { success: 0, failed: 0 };
        }
        const sdt = buildBlockSdtReport(this.gameHistory.sdtEvents, this.activeModalities);
        const nBackDistribution = this.variableN
            ? buildNBackDistribution(
                  this.gameHistory.boardStates.map((state) => state.nForTrial)
              )
            : null;
        return new GameResult(recaps, this.activeModalities, sdt, nBackDistribution);
    }

    private resetChoice() {
        this._playerChoice = null;
    }

    private generateState(): void {
        const trialIndex = this._currentIteration;
        const effectiveN = this.getEffectiveN(trialIndex);
        const state: BoardState = {
            positionIndex: 0,
            audioToken: '',
            currentTrials: this.gameLength - this._currentIteration,
            nForTrial: effectiveN,
        };

        this._pendingStrata = {};
        this._pendingLureLags = {};

        for (const modality of this.activeModalities) {
            const value = this.generateModalityValue(modality, effectiveN);
            this.applyModalityValue(state, modality, value);
        }

        this.currentState = state;
    }

    private applyModalityValue(
        state: BoardState,
        modality: ModalityId,
        value: number | string
    ): void {
        switch (modality) {
            case 'position':
                state.positionIndex = value as number;
                break;
            case 'color':
                state.colorId = value as BoardState['colorId'];
                break;
            case 'image':
                state.imageId = value as BoardState['imageId'];
                break;
            case 'audio':
                state.audioToken = value as string;
                break;
        }
    }

    private generateModalityValue(modality: ModalityId, effectiveN: number): number | string {
        const historyLen = this.gameHistory.boardStates.length;
        const canUseHistory = historyLen >= effectiveN;

        if (!canUseHistory) {
            return this.getRandomModalityValue(modality);
        }

        const trueMatchValue = getModalityValue(
            this.gameHistory.boardStates[historyLen - effectiveN],
            modality
        );

        if (this.trialPlan != null) {
            const plan = this.trialPlan[historyLen]?.byModality[modality];
            if (plan && plan.role !== 'random') {
                return this.generateFromPlan(modality, effectiveN, trueMatchValue, plan);
            }
        }

        const r1 = this.random();
        const r2 = this.random();

        if (r1 < this.guaranteedMatchChance) {
            return trueMatchValue;
        }

        if (this.lureStage != null) {
            const policy = getLureStagePolicy(this.lureStage);
            if (r2 < policy.lureRate && this.sessionLevel > 1) {
                const lure = this.tryLure(
                    modality,
                    effectiveN,
                    trueMatchValue,
                    lureOffsetsForStage(this.lureStage, this.sessionLevel)
                );
                if (lure !== null) {
                    this._pendingStrata[modality] = 'lure';
                    this._pendingLureLags[modality] = lure.lag;
                    return lure.value;
                }
            }
            return this.getRandomNonMatch(modality, trueMatchValue);
        }

        if (r2 < this.interferenceChance && this.sessionLevel > 1) {
            const offsets =
                this.sessionLevel < 3 ? [1, this.sessionLevel] : [-1, 1, this.sessionLevel];
            const nearMiss = this.tryLure(modality, effectiveN, trueMatchValue, offsets);
            if (nearMiss !== null) {
                this._pendingStrata[modality] = 'lure';
                this._pendingLureLags[modality] = nearMiss.lag;
                return nearMiss.value;
            }
        }

        return this.getRandomNonMatch(modality, trueMatchValue);
    }

    private generateFromPlan(
        modality: ModalityId,
        effectiveN: number,
        trueMatchValue: number | string,
        plan: ModalityPlan
    ): number | string {
        switch (plan.role) {
            case 'target':
                return trueMatchValue;
            case 'lure': {
                const offsets =
                    plan.lureOffset != null
                        ? [plan.lureOffset]
                        : lureOffsetsForStage(this.lureStage!, this.sessionLevel);
                const lure = this.tryLure(modality, effectiveN, trueMatchValue, offsets);
                if (lure !== null) {
                    this._pendingStrata[modality] = 'lure';
                    this._pendingLureLags[modality] = lure.lag;
                    return lure.value;
                }
                return this.getRandomNonMatch(modality, trueMatchValue);
            }
            case 'clean':
                return this.getRandomNonMatch(modality, trueMatchValue);
            default:
                return this.getRandomModalityValue(modality);
        }
    }

    /** Pick a value that does not equal the n-back reference (repair accidental matches). */
    private getRandomNonMatch(
        modality: ModalityId,
        trueMatchValue: number | string
    ): number | string {
        for (let attempt = 0; attempt < 24; attempt++) {
            const value = this.getRandomModalityValue(modality);
            if (value !== trueMatchValue) return value;
        }
        return this.getRandomModalityValue(modality);
    }

    private tryLure(
        modality: ModalityId,
        effectiveN: number,
        trueMatchValue: number | string | null,
        offsets: number[]
    ): { value: number | string; lag: number } | null {
        const historyLen = this.gameHistory.boardStates.length;
        const shuffled = [...offsets].sort(() => this.random() - 0.5);

        for (const offset of shuffled) {
            const lag = effectiveN + offset;
            if (lag < 1 || lag >= historyLen) continue;

            const candidate = getModalityValue(
                this.gameHistory.boardStates[historyLen - lag],
                modality
            );
            if (candidate !== trueMatchValue) {
                return { value: candidate, lag };
            }
        }

        return null;
    }

    private getRandomModalityValue(modality: ModalityId): number | string {
        switch (modality) {
            case 'position':
                return this.getRandomPosition();
            case 'color':
                return getRandomColorId(this.random);
            case 'image':
                return getRandomImageId(this.random);
            case 'audio':
                return getRandomAudioToken(this.audioPack, this.random);
        }
    }

    private getRandomPosition(): number {
        if (this.positionGrid === '2x2') {
            return Math.floor(this.random() * 4);
        }
        if (this.allowCenterStimulus) {
            return Math.floor(this.random() * 9);
        }
        const slot = Math.floor(this.random() * 8);
        return slot < 4 ? slot : slot + 1;
    }
}
