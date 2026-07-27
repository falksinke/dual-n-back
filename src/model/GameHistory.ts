import { BoardState } from './types';
import { Match } from './Match';
import { ModalityId } from './modalities';
import { SdtTrialEvent, TrialStratum } from './sdtMetrics';

export interface MatchRecap {
    success: number;
    failed: number;
}

export type Matches = Partial<Record<ModalityId, MatchRecap>>;

/** Per-trial non-target stratum tags (targets ignore this; default clean). */
export type ModalityStrata = Partial<Record<ModalityId, TrialStratum>>;

export function createEmptyMatches(modalities: ModalityId[]): Matches {
    const matches: Matches = {};
    for (const modality of modalities) {
        matches[modality] = { success: 0, failed: 0 };
    }
    return matches;
}

export class GameHistory {
    public boardStates: BoardState[];
    public playerChoices: Match[];
    public matches: Matches;
    /** Parallel to boardStates: intended non-target stratum per modality. */
    public modalityStrata: ModalityStrata[];
    public sdtEvents: SdtTrialEvent[];
    private readonly modalities: ModalityId[];

    constructor(modalities: ModalityId[]) {
        this.modalities = modalities;
        this.boardStates = [];
        this.playerChoices = [];
        this.matches = createEmptyMatches(modalities);
        this.modalityStrata = [];
        this.sdtEvents = [];
    }

    public addState(boardState: BoardState, strata: ModalityStrata = {}) {
        this.boardStates.push(boardState);
        this.modalityStrata.push(strata);
    }

    public addChoice(playerChoice: Match) {
        this.playerChoices.push(playerChoice);
    }

    public addMatch(type: ModalityId, result: keyof MatchRecap) {
        const recap = this.matches[type];
        if (recap) {
            recap[result]++;
        }
    }

    public addSdtEvent(event: SdtTrialEvent) {
        this.sdtEvents.push(event);
    }

    public reset() {
        this.boardStates = [];
        this.playerChoices = [];
        this.matches = createEmptyMatches(this.modalities);
        this.modalityStrata = [];
        this.sdtEvents = [];
    }

    public get activeModalities(): ModalityId[] {
        return this.modalities;
    }
}
