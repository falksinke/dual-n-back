import { getAvailableToken, scoreRound } from '../../model/swapping';
import type { SwappingConfig, SwappingRound, SwappingScore, SwappingToken } from '../../model/swapping/types';

export type ActivePhase = 'encode' | 'manipulate' | 'answer';
export type Phase = 'setup' | ActivePhase | 'paused' | 'result';
export type AudioStatus = 'pending' | 'playing' | 'complete' | 'error';

export interface SwappingState {
    phase: Phase;
    config: SwappingConfig;
    round: SwappingRound | null;
    cardIndex: number;
    slots: readonly (SwappingToken | null)[];
    activeSlot: number;
    score: SwappingScore | null;
    pausedFrom: ActivePhase | null;
    generation: number;
    audioStatus: AudioStatus;
    audioIndex: number;
    encodingPasses: number;
    error: string | null;
}

export type SwappingAction =
    | { type: 'configure'; config: SwappingConfig }
    | { type: 'start'; round: SwappingRound }
    | { type: 'setup'; error?: string }
    | { type: 'ready' | 'clear' | 'submit' | 'pause' | 'resume' | 'audio-start' }
    | { type: 'next'; cardIndex: number }
    | { type: 'select'; index: number }
    | { type: 'place'; key: string; activeIndex: number }
    | { type: 'audio-token'; generation: number; index: number }
    | { type: 'audio-complete'; generation: number }
    | { type: 'audio-error'; generation: number; message: string };

export function initialState(config: SwappingConfig): SwappingState {
    return {
        phase: 'setup', config, round: null, cardIndex: 0, slots: [], activeSlot: 0,
        score: null, pausedFrom: null, generation: 0, audioStatus: 'pending',
        audioIndex: -1, encodingPasses: 0, error: null,
    };
}

export function nextEmptySlot(slots: readonly (SwappingToken | null)[], current: number): number {
    for (let offset = 1; offset <= slots.length; offset++) {
        const index = (current + offset) % slots.length;
        if (slots[index] === null) return index;
    }
    return current;
}

export function swappingReducer(state: SwappingState, action: SwappingAction): SwappingState {
    switch (action.type) {
        case 'configure':
            return state.phase === 'setup' ? { ...state, config: action.config, error: null } : state;
        case 'setup':
            return { ...initialState(state.config), generation: state.generation + 1, error: action.error ?? null };
        case 'start':
            return {
                ...initialState(action.round.config), phase: 'encode', round: action.round,
                slots: action.round.initial.map(() => null), generation: state.generation + 1,
            };
        case 'ready':
            if (state.phase !== 'encode' || !state.round) return state;
            if (state.config.content === 'audio' && state.audioStatus !== 'complete') return state;
            return { ...state, phase: 'manipulate', generation: state.generation + 1 };
        case 'next':
            if (state.phase !== 'manipulate' || !state.round || action.cardIndex !== state.cardIndex) return state;
            return state.cardIndex + 1 < state.round.cards.length
                ? { ...state, cardIndex: state.cardIndex + 1 }
                : { ...state, phase: 'answer' };
        case 'select':
            return state.phase === 'answer' && action.index !== state.activeSlot && Number.isInteger(action.index) && action.index >= 0 && action.index < state.slots.length
                ? { ...state, activeSlot: action.index } : state;
        case 'place': {
            if (state.phase !== 'answer' || !state.round || action.activeIndex !== state.activeSlot) return state;
            const token = getAvailableToken(state.round.initial, state.slots, action.key);
            if (!token) return state;
            const slots = [...state.slots];
            slots[action.activeIndex] = token;
            return { ...state, slots, activeSlot: nextEmptySlot(slots, action.activeIndex) };
        }
        case 'clear': {
            if (state.phase !== 'answer' || state.slots[state.activeSlot] === null) return state;
            const slots = [...state.slots];
            slots[state.activeSlot] = null;
            return { ...state, slots };
        }
        case 'submit': {
            if (state.phase !== 'answer' || !state.round || state.slots.some((token) => token === null)) return state;
            const submitted = state.slots.filter((token): token is SwappingToken => token !== null);
            return { ...state, phase: 'result', score: scoreRound(state.round.final, submitted) };
        }
        case 'pause':
            if (state.phase !== 'encode' && state.phase !== 'manipulate' && state.phase !== 'answer') return state;
            return {
                ...state, phase: 'paused', pausedFrom: state.phase, generation: state.generation + 1,
                audioStatus: state.audioStatus === 'playing' ? 'pending' : state.audioStatus,
            };
        case 'resume':
            return state.phase === 'paused' && state.pausedFrom
                ? { ...state, phase: state.pausedFrom, pausedFrom: null } : state;
        case 'audio-start':
            if (state.phase !== 'encode' || state.config.content !== 'audio' || state.audioStatus === 'playing') return state;
            return {
                ...state, generation: state.generation + 1, audioStatus: 'playing', audioIndex: -1,
                encodingPasses: state.encodingPasses + 1, error: null,
            };
        case 'audio-token':
        case 'audio-complete':
        case 'audio-error':
            if (state.phase !== 'encode' || state.audioStatus !== 'playing' || action.generation !== state.generation) return state;
            if (action.type === 'audio-token') return { ...state, audioIndex: action.index };
            if (action.type === 'audio-complete') return { ...state, audioStatus: 'complete' };
            return { ...state, audioStatus: 'error', error: action.message };
    }
}
