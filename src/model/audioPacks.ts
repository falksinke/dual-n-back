import { Letter, LETTERS } from './constants';

export type AudioPackId = 'letters' | 'piano';

/** C-scale style note tokens for the piano pack (8 notes). */
export const PIANO_TOKENS = ['c4', 'd4', 'e4', 'f4', 'g4', 'a4', 'b4', 'c5'] as const;

export type PianoToken = (typeof PIANO_TOKENS)[number];

export type AudioToken = Letter | PianoToken;

export function getTokensForPack(pack: AudioPackId): readonly string[] {
    return pack === 'letters' ? LETTERS : PIANO_TOKENS;
}

const base = import.meta.env.BASE_URL;

export function getSoundSrc(pack: AudioPackId, token: string): string[] {
    const folder = pack === 'letters' ? 'letters' : 'piano';
    const root = `${base}assets/sounds/${folder}/`;
    return [`${root}${token}.wav`, `${root}${token}.mp3`];
}

export function getRandomAudioToken(pack: AudioPackId, random: () => number): string {
    const tokens = getTokensForPack(pack);
    return tokens[Math.floor(random() * tokens.length)];
}
