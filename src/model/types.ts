import { ColorId } from './colorSet';
import { ImageId } from './imageSet';
import { ModalityId, ModeId } from './modalities';
import { AudioPackId } from './audioPacks';

export interface BoardState {
    positionIndex: number;
    audioToken: string;
    colorId?: ColorId;
    imageId?: ImageId;
    currentTrials: number;
    /** Effective N for this trial (variable N or session level). */
    nForTrial: number;
}

export type GameDeps = {
    random?: () => number;
    /** When false, position stimuli never use the center cell (index 4). */
    allowCenterStimulus?: boolean;
    /** Active modalities for this session. Defaults to dual preset. */
    modalities?: ModalityId[];
    /** BW-style interference chance (default 0.125). */
    interferenceChance?: number;
    /** BW-style guaranteed true-match chance (default 0.125). */
    guaranteedMatchChance?: number;
    /** When true, per-trial N is sampled from a beta distribution. */
    variableN?: boolean;
    audioPack?: AudioPackId;
    mode?: ModeId;
};

export function getModalityValue(state: BoardState, modality: ModalityId): number | string {
    switch (modality) {
        case 'position':
            return state.positionIndex;
        case 'color':
            return state.colorId ?? -1;
        case 'image':
            return state.imageId ?? '';
        case 'audio':
            return state.audioToken;
    }
}
