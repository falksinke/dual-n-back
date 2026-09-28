import { ColorId } from './colorSet';
import type { ImageDifficulty, ImageId } from './imageSet';
import { ModalityId, ModeId } from './modalities';
import { AudioPackId } from './audioPacks';
import { LureStageId } from './lureStages';
import type { PositionGrid } from './positionGrid';

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
    /** Spatial board; `2x2` uses indices 0–3. Default `3x3`. */
    positionGrid?: PositionGrid;
    /** When false on 3×3, position stimuli never use the center cell (index 4). */
    allowCenterStimulus?: boolean;
    /** Active modalities for this session. Defaults to dual preset. */
    modalities?: ModalityId[];
    /** BW-style interference chance (default 0.125). Easy mode passes 0 here. */
    interferenceChance?: number;
    /**
     * When true (free-play Easy), non-match picks also avoid near-miss history
     * values so accidental lures are repaired away.
     */
    avoidAccidentalLures?: boolean;
    /** BW-style guaranteed true-match chance (default 0.125). */
    guaranteedMatchChance?: number;
    /** When true, per-trial N is sampled from a beta distribution. */
    variableN?: boolean;
    /** Consecutive trials that keep the same lag before resampling (default 1). */
    variableNHoldTrials?: number;
    /** When true, claims show their result immediately and need no end-of-trial feedback reserve. */
    activeFeedback?: boolean;
    /** Extra claim time (ms) beyond the ISI scoring window; extends onset gap. */
    answerGraceMs?: number;
    audioPack?: AudioPackId;
    /** Visual symbol bank used for Image trials. Defaults to Easy. */
    imageDifficulty?: ImageDifficulty;
    mode?: ModeId;
    /**
     * When set, Adaptive lure-stage generation replaces free-play interferenceChance.
     * Free-play leaves this undefined.
     */
    lureStage?: LureStageId;
    /**
     * When true with lureStage set, precompute cross-modal match/lure quotas (Adaptive only).
     */
    useBlockQuotas?: boolean;
    /**
     * When true in free-play (no lureStage, fixed N), precompute Jaeggi-style fixed match counts.
     * Default off at the GameDeps layer; store default is on.
     */
    useJaeggiQuotas?: boolean;
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
