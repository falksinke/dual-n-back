import { describe, expect, it } from 'vitest';
import { initialState, swappingReducer } from './controller';
import type { SwappingAction, SwappingState } from './controller';
import { projectState } from './projection';
import type { SwappingRound, SwappingToken } from '../../model/swapping/types';

const tokens: SwappingToken[] = ['7', '2', '9', '4'].map((value, index) => ({ id: String(index), kind: 'number', value, label: value }));
const final = [tokens[2], tokens[3], tokens[0], tokens[1]];
const round: SwappingRound = {
    config: { content: 'numbers', layout: 'sequence', length: 4, pattern: 'unique', tier: 'group', operationCount: 2 },
    initial: tokens, final,
    cards: [{ operations: [{ type: 'swap', first: 0, second: 2 }] }, { operations: [{ type: 'reverse-span', start: 1, end: 3 }] }],
    states: [tokens, [tokens[2], tokens[1], tokens[0], tokens[3]], final],
};
function step(state: SwappingState, ...actions: SwappingAction[]) {
    return actions.reduce(swappingReducer, state);
}
function answerState() {
    return step(initialState(round.config), { type: 'start', round }, { type: 'ready' }, { type: 'next', cardIndex: 0 }, { type: 'next', cardIndex: 1 });
}

describe('Swapping controller and presentation boundaries', () => {
    it('hides identities after Ready and exposes only the current card', () => {
        const state = step(initialState(round.config), { type: 'start', round }, { type: 'ready' });
        expect(projectState(state)).toEqual({ phase: 'manipulate', config: round.config, card: round.cards[0], cardIndex: 0, cardCount: 2 });
        expect(projectState(swappingReducer(state, { type: 'pause' }))).toEqual({ phase: 'paused' });
    });

    it('fills, replaces and clears slots without changing the multiset', () => {
        let state = step(answerState(), { type: 'place', key: 'number:7', activeIndex: 0 }, { type: 'select', index: 0 }, { type: 'place', key: 'number:2', activeIndex: 0 });
        expect(state.slots[0]?.value).toBe('2');
        const view = projectState(state);
        expect(view.phase === 'answer' && view.palette.find((entry) => entry.key === 'number:7')?.remaining).toBe(1);
        state = step(state, { type: 'select', index: 0 }, { type: 'clear' });
        expect(state.slots.every((token) => token === null)).toBe(true);
    });

    it('scores AE1 only on a complete submission and ignores repeated submission', () => {
        let state = answerState();
        expect(swappingReducer(state, { type: 'submit' })).toBe(state);
        for (const token of final) state = swappingReducer(state, { type: 'place', key: `number:${token.value}`, activeIndex: state.activeSlot });
        state = swappingReducer(state, { type: 'submit' });
        expect(state.score).toMatchObject({ exact: true, correctlyPlaced: 4, total: 4 });
        expect(swappingReducer(state, { type: 'submit' })).toBe(state);
    });

    it('preserves partial answers and active slot across pause without projecting them', () => {
        const state = step(answerState(), { type: 'place', key: 'number:7', activeIndex: 0 }, { type: 'select', index: 3 });
        const paused = swappingReducer(state, { type: 'pause' });
        expect(projectState(paused)).toEqual({ phase: 'paused' });
        const resumed = swappingReducer(paused, { type: 'resume' });
        expect(resumed.slots).toEqual(state.slots);
        expect(resumed.activeSlot).toBe(3);
    });

    it('gates audio Ready and rejects callbacks from interrupted passes', () => {
        const audioRound = { ...round, config: { ...round.config, content: 'audio' as const } };
        let state = step(initialState(audioRound.config), { type: 'start', round: audioRound }, { type: 'audio-start' });
        const oldGeneration = state.generation;
        expect(swappingReducer(state, { type: 'ready' })).toBe(state);
        expect(projectState(state)).not.toHaveProperty('tokens');
        state = step(state, { type: 'pause' }, { type: 'resume' }, { type: 'audio-start' });
        expect(state.encodingPasses).toBe(2);
        expect(swappingReducer(state, { type: 'audio-complete', generation: oldGeneration })).toBe(state);
        state = step(state, { type: 'audio-complete', generation: state.generation }, { type: 'ready' });
        expect(state.phase).toBe('manipulate');
    });

    it('ignores a repeated action from the previously rendered instruction card', () => {
        const firstCardDone: SwappingAction = { type: 'next', cardIndex: 0 };
        const firstCard = step(initialState(round.config), { type: 'start', round }, { type: 'ready' });
        const secondCard = swappingReducer(firstCard, firstCardDone);

        expect(secondCard.cardIndex).toBe(1);
        expect(swappingReducer(secondCard, firstCardDone)).toBe(secondCard);
        expect(swappingReducer(secondCard, { type: 'next', cardIndex: 1 }).phase).toBe('answer');
    });

    it('ignores a repeated palette action from the previously rendered active slot', () => {
        const repeatedTokens = [
            tokens[0],
            { ...tokens[0], id: 'repeat-7' },
            tokens[2],
            tokens[3],
        ];
        const repeatedRound: SwappingRound = {
            ...round,
            config: { ...round.config, pattern: 'repeated' },
            initial: repeatedTokens,
            final: repeatedTokens,
        };
        const state = step(
            initialState(repeatedRound.config),
            { type: 'start', round: repeatedRound },
            { type: 'ready' },
            { type: 'next', cardIndex: 0 },
            { type: 'next', cardIndex: 1 },
        );
        const firstSlotPlace: SwappingAction = { type: 'place', key: 'number:7', activeIndex: 0 };
        const advanced = swappingReducer(state, firstSlotPlace);

        expect(advanced.activeSlot).toBe(1);
        expect(swappingReducer(advanced, firstSlotPlace)).toBe(advanced);
        expect(advanced.slots[1]).toBeNull();
        expect(swappingReducer(advanced, { ...firstSlotPlace, activeIndex: 1 }).slots[1]?.value).toBe('7');
    });
});
