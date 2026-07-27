import { GameHistory, ModalityStrata } from './GameHistory';
import { Match } from './Match';
import { GameResult } from './GameResult';
import { AudioPackId, getRandomAudioToken } from './audioPacks';
import { getRandomColorId } from './colorSet';
import { getRandomImageId } from './imageSet';
import { ModalityId, getModalitiesForMode, ModeId } from './modalities';
import { ModalityPlan, planBlockStimuli, TrialPlanEntry } from './blockQuotas';
import { getLureStagePolicy, lureOffsetsForStage, LureStageId } from './lureStages';
import { buildBlockSdtReport, classifySdtCell } from './sdtMetrics';
import { BoardState, GameDeps, getModalityValue } from './types';

export type ResultMatch = Partial<Record<ModalityId, 'success' | 'failed'>>;

const DEFAULT_GUARANTEED_MATCH_CHANCE = 0.125;
const DEFAULT_INTERFERENCE_CHANCE = 0.125;

/** BW-shaped variable N list: length trials - level, Beta(level/2, 1) samples. */
export function makeVariableNList(
    trials: number,
    level: number,
    random: () => number
): number[] {
    const length = Math.max(0, trials - level);
    const beta = level / 2;
    const list: number[] = [];
    for (let i = 0; i < length; i++) {
        const sample = Math.pow(random(), 1 / beta);
        const n = Math.max(1, Math.min(level, Math.round(sample * level)));
        list.push(n);
    }
    return list;
}

export class Game {
    private readonly sessionLevel: number;
    private readonly gameHistory: GameHistory;
    private readonly gameLength: number;
    private readonly isiMin: number;
    private readonly isiMax: number;
    private readonly random: () => number;
    private readonly allowCenterStimulus: boolean;
    private readonly activeModalities: ModalityId[];
    private readonly interferenceChance: number;
    private readonly guaranteedMatchChance: number;
    private readonly variableN: boolean;
    private readonly variableNList: number[];
    private readonly audioPack: AudioPackId;
    private readonly lureStage: LureStageId | null;
    private readonly useBlockQuotas: boolean;
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

    private onStateChanged: (boardState: BoardState) => void;
    private onPlayerChoiceValidated: (match: ResultMatch) => void;
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
    }

    get currentMatch(): ResultMatch | null {
        return this._currentMatch;
    }

    set currentMatch(match: ResultMatch | null) {
        if (match === null) return;
        this._currentMatch = match;
        this.onPlayerChoiceValidated(match);

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

    constructor(
        n: number,
        gameLength: number,
        isiMin: number,
        isiMax: number,
        onStateChanged: (boardState: BoardState) => void = () => undefined,
        onPlayerChoiceValidated: (match: ResultMatch) => void = () => undefined,
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
        this.allowCenterStimulus = deps.allowCenterStimulus ?? true;
        this.interferenceChance = deps.interferenceChance ?? DEFAULT_INTERFERENCE_CHANCE;
        this.guaranteedMatchChance = deps.guaranteedMatchChance ?? DEFAULT_GUARANTEED_MATCH_CHANCE;
        this.variableN = deps.variableN ?? false;
        this.audioPack = deps.audioPack ?? 'letters';
        this.lureStage = deps.lureStage ?? null;
        this.useBlockQuotas = deps.useBlockQuotas ?? false;
        this.trialPlan =
            this.useBlockQuotas && this.lureStage != null
                ? planBlockStimuli({
                      gameLength,
                      sessionN: n,
                      modalities: this.activeModalities,
                      lureStage: this.lureStage,
                      random: this.random,
                  }).trials
                : null;
        this.variableNList = this.variableN
            ? makeVariableNList(gameLength, n, this.random)
            : [];
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
    }

    public async start(): Promise<void> {
        this._isGameInProgress = true;
        this.resetChoice();
        this.gameHistory.reset();

        this._currentIteration = 0;
        while (this._currentIteration < this.gameLength && this._isGameInProgress) {
            this.generateState();
            await this.executeDelayed(this.sampleIsi(), this.processChoice.bind(this));
            this._currentIteration++;
        }

        if (this._isGameInProgress) {
            this._isGameInProgress = false;
            this.onGameEnded(this.getGameResult());
        }
    }

    public stop(): void {
        this._isGameInProgress = false;
    }

    public addChoice(modality: ModalityId) {
        if (
            !this._isGameInProgress ||
            !this.activeModalities.includes(modality) ||
            this.gameHistory.boardStates.length < 1 ||
            this.gameHistory.boardStates.length > this.gameLength
        ) {
            return;
        }

        if (this._playerChoice == null) {
            this._playerChoice = new Match(this.activeModalities);
        }

        if (this._claimRtMs[modality] == null && this._trialOnsetMs != null) {
            this._claimRtMs[modality] = Date.now() - this._trialOnsetMs;
        }

        this._playerChoice.claim(modality);
    }

    /** Uniform sample of inter-stimulus interval (stimulus onset → next onset). */
    private sampleIsi(): number {
        if (this.isiMax <= this.isiMin) {
            return this.isiMin;
        }
        return Math.round(this.isiMin + this.random() * (this.isiMax - this.isiMin));
    }

    private async executeDelayed(delayMs: number, fn: () => void) {
        await this.delay(delayMs).then(fn);
    }

    private delay(milliseconds: number): Promise<void> {
        return new Promise((resolve) =>
            setTimeout(() => {
                resolve();
            }, milliseconds)
        );
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
        return new GameResult(recaps, this.activeModalities, sdt);
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
            return this.getRandomModalityValue(modality);
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

        return this.getRandomModalityValue(modality);
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
        if (this.allowCenterStimulus) {
            return Math.floor(this.random() * 9);
        }
        const slot = Math.floor(this.random() * 8);
        return slot < 4 ? slot : slot + 1;
    }
}
