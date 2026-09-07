import { IMAGE_IDS } from '../imageSet';
import { LETTERS } from '../constants';
import type {
    SwappingContent,
    SwappingToken,
    TokenIdentity,
    TokenKind,
} from './types';

export const NUMBER_VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
export const LETTER_VALUES = LETTERS.map((letter) => letter.toUpperCase());

const NUMBER_TOKENS: readonly TokenIdentity[] = NUMBER_VALUES.map((value) => ({
    kind: 'number',
    value,
    label: value,
}));

const LETTER_TOKENS: readonly TokenIdentity[] = LETTER_VALUES.map((value) => ({
    kind: 'letter',
    value,
    label: value,
}));

const ICON_TOKENS: readonly TokenIdentity[] = IMAGE_IDS.map((value, index) => ({
    kind: 'icon',
    value,
    label: `Shape ${index + 1}`,
}));

const MIXED_TOKENS: readonly TokenIdentity[] = [...NUMBER_TOKENS, ...LETTER_TOKENS, ...ICON_TOKENS];

export function getContentPool(content: SwappingContent): readonly TokenIdentity[] {
    switch (content) {
        case 'numbers':
            return NUMBER_TOKENS;
        case 'letters':
        case 'audio':
            return LETTER_TOKENS;
        case 'icons':
            return ICON_TOKENS;
        case 'mixed':
            return MIXED_TOKENS;
    }
}

export function tokenIdentityKey(token: Pick<SwappingToken, 'kind' | 'value'>): string {
    return `${token.kind}:${token.value}`;
}

export function sameTokenIdentity(
    first: Pick<SwappingToken, 'kind' | 'value'>,
    second: Pick<SwappingToken, 'kind' | 'value'>
): boolean {
    return first.kind === second.kind && first.value === second.value;
}

export function createToken(identity: TokenIdentity, occurrence: number): SwappingToken {
    return {
        ...identity,
        id: `${tokenIdentityKey(identity)}:${occurrence}`,
    };
}

export function compareTokenIdentity(
    first: Pick<SwappingToken, 'kind' | 'value'>,
    second: Pick<SwappingToken, 'kind' | 'value'>
): number {
    const kindOrder: Record<TokenKind, number> = { number: 0, letter: 1, icon: 2 };
    const kindDifference = kindOrder[first.kind] - kindOrder[second.kind];
    if (kindDifference !== 0) return kindDifference;

    const pool: readonly string[] =
        first.kind === 'number'
            ? NUMBER_VALUES
            : first.kind === 'letter'
              ? LETTER_VALUES
              : IMAGE_IDS;
    return pool.indexOf(first.value) - pool.indexOf(second.value);
}

