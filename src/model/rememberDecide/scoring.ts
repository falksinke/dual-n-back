import { MAX_SEQUENCE_LENGTH } from './generator';
import type {
    DecisionResponse,
    MemoryLocation,
    RecommendationReason,
    RememberDecideRound,
    RememberDecideScore,
} from './types';

function sameLocation(first: MemoryLocation, second: MemoryLocation): boolean {
    return first.row === second.row && first.column === second.column;
}

export function scoreRound(
    round: RememberDecideRound,
    recalled: readonly MemoryLocation[],
    decisions: readonly DecisionResponse[]
): RememberDecideScore {
    const responseByItem = new Map(decisions.map((response) => [response.itemIndex, response]));
    let correctlyRecalled = 0;
    let correctJudgements = 0;
    let timeoutCount = 0;
    let correctSymmetricJudgements = 0;
    let correctAsymmetricJudgements = 0;

    round.items.forEach((item, index) => {
        if (recalled[index] != null && sameLocation(item.location, recalled[index])) correctlyRecalled++;
        const response = responseByItem.get(item.index);
        if (response?.timedOut || response?.answer == null) timeoutCount++;
        const expected = item.isSymmetric ? 'yes' : 'no';
        if (!response?.timedOut && response?.answer === expected) {
            correctJudgements++;
            if (item.isSymmetric) correctSymmetricJudgements++;
            else correctAsymmetricJudgements++;
        }
    });

    const exactSequence = recalled.length === round.items.length && correctlyRecalled === round.items.length;
    const requiredCorrectJudgements = Math.ceil(round.items.length * 0.8);
    let reason: RecommendationReason = 'increase';
    if (!exactSequence) reason = 'recall-inexact';
    else if (correctJudgements < requiredCorrectJudgements) reason = 'judgement-threshold';
    else if (correctSymmetricJudgements === 0 || correctAsymmetricJudgements === 0) {
        reason = 'both-truth-classes-required';
    } else if (round.config.sequenceLength >= MAX_SEQUENCE_LENGTH) reason = 'maximum-length';

    const canIncrease = reason === 'increase';
    return {
        correctlyRecalled,
        recallTotal: round.items.length,
        exactSequence,
        correctJudgements,
        judgementTotal: round.items.length,
        timeoutCount,
        requiredCorrectJudgements,
        correctSymmetricJudgements,
        correctAsymmetricJudgements,
        recommendation: {
            canIncrease,
            nextLength: canIncrease ? round.config.sequenceLength + 1 : null,
            reason,
        },
        recalled: [...recalled],
        decisions: round.items.map((item) => responseByItem.get(item.index) ?? {
            itemIndex: item.index,
            answer: null,
            timedOut: true,
        }),
    };
}
