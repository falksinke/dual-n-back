import { describe, expect, it } from 'vitest';
import { scoreRound } from './scoring';
import type { DecisionResponse, RememberDecideRound } from './types';

function round(truths: readonly boolean[]): RememberDecideRound {
    return {
        config: { sequenceLength: truths.length, symmetryDifficulty: 'more', judgementDeadlineMs: 5000 },
        items: truths.map((isSymmetric, index) => ({
            index,
            location: { row: 0, column: index % 4 },
            pattern: { cells: [] },
            isSymmetric,
        })),
    };
}

function decisions(answers: readonly ('yes' | 'no' | null)[]): DecisionResponse[] {
    return answers.map((answer, itemIndex) => ({ itemIndex, answer, timedOut: answer == null }));
}

describe('Remember & Decide scoring', () => {
    it('scores recall by position rather than set membership', () => {
        const base = round([true, false, true]);
        const target: RememberDecideRound = {
            ...base,
            items: [base.items[0], base.items[1], { ...base.items[2], location: base.items[0].location }],
        };
        const score = scoreRound(target, [target.items[0].location, target.items[0].location, target.items[1].location], decisions(['yes', 'no', 'yes']));
        expect(score.correctlyRecalled).toBe(1);
        expect(score.exactSequence).toBe(false);
    });

    it('includes timeouts in the judgement denominator and blocks progression', () => {
        const target = round([true, false, true, false, true]);
        const score = scoreRound(target, target.items.map((item) => item.location), decisions(['yes', 'no', 'yes', null, null]));
        expect(score.correctJudgements).toBe(3);
        expect(score.judgementTotal).toBe(5);
        expect(score.timeoutCount).toBe(2);
        expect(score.requiredCorrectJudgements).toBe(4);
        expect(score.recommendation.reason).toBe('judgement-threshold');
    });

    it('uses ceiling 80 percent and requires correct answers from both truth classes', () => {
        const lengthThree = round([true, false, true]);
        const twoOfThree = scoreRound(lengthThree, lengthThree.items.map((item) => item.location), decisions(['yes', 'no', 'no']));
        const threeOfThree = scoreRound(lengthThree, lengthThree.items.map((item) => item.location), decisions(['yes', 'no', 'yes']));
        expect(twoOfThree.requiredCorrectJudgements).toBe(3);
        expect(twoOfThree.recommendation.reason).toBe('judgement-threshold');
        expect(threeOfThree.recommendation.reason).toBe('increase');

        const target = round([true, true, false, false, true]);
        const qualifying = scoreRound(target, target.items.map((item) => item.location), decisions(['yes', 'yes', 'no', 'yes', 'yes']));
        expect(qualifying.correctJudgements).toBe(4);
        expect(qualifying.recommendation).toEqual({ canIncrease: true, nextLength: 6, reason: 'increase' });

        const fixedAnswer = scoreRound(round([true, true, true, true, false]), target.items.map((item) => item.location), decisions(['yes', 'yes', 'yes', 'yes', 'yes']));
        expect(fixedAnswer.correctJudgements).toBe(4);
        expect(fixedAnswer.recommendation.reason).toBe('both-truth-classes-required');
        const oneClass = round([true, true, true]);
        expect(scoreRound(oneClass, oneClass.items.map((item) => item.location), decisions(['yes', 'yes', 'yes'])).recommendation.reason).toBe('both-truth-classes-required');
    });

    it('reports maximum completion without an impossible increase', () => {
        const target = round([true, false, true, false, true, false, true, false]);
        const score = scoreRound(target, target.items.map((item) => item.location), decisions(['yes', 'no', 'yes', 'no', 'yes', 'no', 'yes', 'no']));
        expect(score.recommendation).toEqual({ canIncrease: false, nextLength: null, reason: 'maximum-length' });
    });
});
