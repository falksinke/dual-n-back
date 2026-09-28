import type { Point, Rng } from './types';

/** Small seeded generator so tests can replay a block exactly. */
export function seededRng(seed: number): Rng {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const between = (rng: Rng, min: number, max: number): number => min + rng() * (max - min);

export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** A point at a random angle and a radius drawn from [minR, maxR] around `centre`. */
export function pointAround(rng: Rng, centre: Point, minR: number, maxR: number): Point {
    const angle = rng() * Math.PI * 2;
    const radius = between(rng, minR, maxR);
    return { x: centre.x + Math.cos(angle) * radius, y: centre.y + Math.sin(angle) * radius };
}

export const inBounds = (p: Point, margin: number): boolean =>
    p.x >= margin && p.x <= 1 - margin && p.y >= margin && p.y <= 1 - margin;

/** Try a sampler until the predicate holds; null when the budget runs out. */
export function sampleUntil<T>(sample: () => T, accept: (value: T) => boolean, attempts = 400): T | null {
    for (let i = 0; i < attempts; i++) {
        const value = sample();
        if (accept(value)) return value;
    }
    return null;
}
