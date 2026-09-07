import { buildPalette } from '../../model/swapping';
import type { OperationCard, PaletteEntry, SwappingConfig, SwappingRound, SwappingScore, SwappingToken } from '../../model/swapping/types';
import type { AudioStatus, SwappingState } from './controller';

/** Each view receives only what its phase is allowed to present. */
export type SwappingProjection =
    | { phase: 'setup'; config: SwappingConfig; error: string | null }
    | { phase: 'paused' }
    | { phase: 'encode-visual'; config: SwappingConfig; tokens: readonly SwappingToken[] }
    | { phase: 'encode-audio'; config: SwappingConfig; status: AudioStatus; currentIndex: number; passes: number; error: string | null }
    | { phase: 'manipulate'; config: SwappingConfig; card: OperationCard; cardIndex: number; cardCount: number }
    | { phase: 'answer'; config: SwappingConfig; slots: readonly (SwappingToken | null)[]; activeIndex: number; palette: readonly PaletteEntry[] }
    | { phase: 'result'; round: SwappingRound; score: SwappingScore };

export function projectState(state: SwappingState): SwappingProjection {
    if (state.phase === 'paused') return { phase: 'paused' };
    if (state.phase === 'setup' || !state.round) return { phase: 'setup', config: state.config, error: state.error };
    switch (state.phase) {
        case 'encode':
            return state.config.content === 'audio'
                ? { phase: 'encode-audio', config: state.config, status: state.audioStatus, currentIndex: state.audioIndex, passes: state.encodingPasses, error: state.error }
                : { phase: 'encode-visual', config: state.config, tokens: state.round.initial };
        case 'manipulate':
            return { phase: 'manipulate', config: state.config, card: state.round.cards[state.cardIndex], cardIndex: state.cardIndex, cardCount: state.round.cards.length };
        case 'answer':
            return { phase: 'answer', config: state.config, slots: state.slots, activeIndex: state.activeSlot, palette: buildPalette(state.round.initial, state.slots) };
        case 'result':
            if (!state.score) throw new Error('A submitted Swapping round must have a score.');
            return { phase: 'result', round: state.round, score: state.score };
    }
}
