import { BoardState } from './types';
import { Match } from './Match';
import { ModalityId } from './modalities';

export interface MatchRecap {
    success: number;
    failed: number;
}

export type Matches = Partial<Record<ModalityId, MatchRecap>>;

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
    private readonly modalities: ModalityId[];

    constructor(modalities: ModalityId[]) {
        this.modalities = modalities;
        this.boardStates = [];
        this.playerChoices = [];
        this.matches = createEmptyMatches(modalities);
    }

    public addState(boardState: BoardState) {
        this.boardStates.push(boardState);
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

    public reset() {
        this.boardStates = [];
        this.playerChoices = [];
        this.matches = createEmptyMatches(this.modalities);
    }

    public get activeModalities(): ModalityId[] {
        return this.modalities;
    }
}
