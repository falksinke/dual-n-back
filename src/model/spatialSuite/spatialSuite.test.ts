import { describe, expect, it } from 'vitest';
import { blockLength, dPrime, initialDifficulty, planRoles, scoreBlock, stepDifficulty } from './engine';
import { driftTolerance, generateDrift } from './games/drift';
import { formDistance, generatePattern, type RelationStimulus, type ShapeStimulus } from './games/pattern';
import { generateRelay, moverAt, RELAY_TOLERANCE } from './games/relay';
import { drawDeck, generateShift, shiftMatches, type ShiftStimulus } from './games/shift';
import { generateWayfinder, wayfinderPositions } from './games/wayfinder';
import { seededRng } from './random';
import { drawSessionMix } from './session';
import { createState, holdoutDue, loadState, saveState, STORAGE_KEY } from './storage';
import { completeBlock, createBlock } from './suite';
import type { Difficulty, Trial } from './types';

const seeds = [1, 7, 42, 99, 1234];
const withN = (track: Parameters<typeof initialDifficulty>[0], n: number, patch: Partial<Difficulty> = {}): Difficulty =>
    ({ ...initialDifficulty(track), n, ...patch });
const targetShare = (trials: Trial<unknown>[], n: number) => trials.filter((t) => t.isTarget).length / (trials.length - n);

describe('shared n-back engine', () => {
    it('plans ~30% targets, the lure share and filler-only warm-up trials', () => {
        const roles = planRoles(blockLength(3), 3, 0.2, seededRng(5));
        expect(roles).toHaveLength(23);
        expect(roles.slice(0, 3)).toEqual(['filler', 'filler', 'filler']);
        expect(roles.filter((r) => r === 'target')).toHaveLength(6);
        expect(roles.filter((r) => r === 'lure')).toHaveLength(4);
    });

    it('scores accuracy without rewarding silence and keeps d′ finite', () => {
        const trials = [true, true, false, false].map((isTarget, index) => ({ index, stimulus: null, isTarget, isLure: false, lureType: null, rule: null }));
        const silent = scoreBlock(trials, trials.map(() => ({ responded: false, rtMs: null })));
        expect(silent.accuracy).toBe(0);
        const perfect = scoreBlock(trials, trials.map((t) => ({ responded: t.isTarget, rtMs: 400 })));
        expect(perfect).toMatchObject({ hits: 2, misses: 0, falseAlarms: 0, correctRejections: 2, accuracy: 1 });
        expect(Number.isFinite(perfect.dPrime)).toBe(true);
        expect(dPrime(10, 10, 0, 20)).toBeGreaterThan(dPrime(5, 10, 5, 20));
    });

    it('raises one dial at a time in rotation and undoes the latest raise on a poor block', () => {
        let difficulty = initialDifficulty('drift');
        const raised: string[] = [];
        for (let i = 0; i < 5; i++) {
            const step = stepDifficulty('drift', difficulty, 0.9);
            raised.push(step.change.dial!);
            difficulty = step.difficulty;
        }
        expect(raised).toEqual(['n', 'lure', 'isi', 'extra', 'n']);
        expect(difficulty).toMatchObject({ n: 3, lureRate: 0.15, isiMs: 2250, extra: 0.09 });

        const held = stepDifficulty('drift', difficulty, 0.75);
        expect(held.change.direction).toBe('hold');
        const lowered = stepDifficulty('drift', difficulty, 0.5);
        expect(lowered.change).toEqual({ direction: 'down', dial: 'n', from: 3, to: 2 });
        expect(stepDifficulty('drift', initialDifficulty('drift'), 0).change.direction).toBe('hold');
    });

    it('skips dials a game does not have and stops at every limit', () => {
        let difficulty = initialDifficulty('wayfinder');
        for (let i = 0; i < 60; i++) difficulty = stepDifficulty('wayfinder', difficulty, 1).difficulty;
        expect(difficulty).toMatchObject({ n: 9, lureRate: 0.3, isiMs: 1000, extra: 0 });
        expect(difficulty.raised).not.toContain('extra');
    });
});

describe('Drift', () => {
    it('marks targets by true distance and keeps lures outside tolerance', () => {
        for (const seed of seeds) {
            const difficulty = withN('drift', 2, { lureRate: 0.3 });
            const plan = generateDrift(difficulty, seededRng(seed));
            const r = driftTolerance(difficulty);
            plan.trials.forEach((trial, t) => {
                const { x, y } = trial.stimulus.p;
                expect(x).toBeGreaterThanOrEqual(0);
                expect(x).toBeLessThanOrEqual(1);
                expect(y).toBeGreaterThanOrEqual(0);
                if (t >= 2) {
                    const ref = plan.trials[t - 2].stimulus.p;
                    expect(trial.isTarget).toBe(Math.hypot(x - ref.x, y - ref.y) <= r);
                }
                if (trial.isLure) expect(trial.isTarget).toBe(false);
            });
            expect(targetShare(plan.trials, 2)).toBeGreaterThan(0.2);
        }
    });
});

describe('Wayfinder', () => {
    it('targets are exactly the returns to the position n moves ago', () => {
        for (const seed of seeds) {
            for (const n of [2, 3, 4]) {
                const plan = generateWayfinder(withN('wayfinder', n, { lureRate: 0.25 }), seededRng(seed));
                const positions = wayfinderPositions(plan.trials.map((t) => t.stimulus));
                plan.trials.forEach((trial, t) => {
                    const home = t >= n ? positions[t - n] : null;
                    const same = home !== null && home[0] === positions[t][0] && home[1] === positions[t][1];
                    expect(trial.isTarget).toBe(same);
                });
                expect(targetShare(plan.trials, n)).toBeGreaterThan(0.15);
            }
        }
    });

    it('never plays n = 1', () => {
        expect(generateWayfinder(withN('wayfinder', 1), seededRng(3)).difficulty.n).toBe(2);
    });
});

describe('Pattern', () => {
    it('shape targets reuse the form; mirror and displaced lures differ from it', () => {
        for (const seed of seeds) {
            const plan = generatePattern('shape', withN('pattern-shape', 2, { lureRate: 0.3, extra: 4 }), seededRng(seed));
            plan.trials.forEach((trial, t) => {
                const stimulus = trial.stimulus as ShapeStimulus;
                expect(stimulus.points).toHaveLength(4);
                if (t < 2) return;
                const ref = plan.trials[t - 2].stimulus as ShapeStimulus;
                if (trial.isTarget) expect(formDistance(stimulus.points, ref.points)).toBeLessThan(1e-6);
                if (trial.lureType === 'mirror' || trial.lureType === 'displaced') {
                    expect(formDistance(stimulus.points, ref.points)).toBeGreaterThan(0.1);
                }
            });
            expect(plan.trials.some((t) => t.lureType === 'mirror' || t.lureType === 'displaced')).toBe(true);
        }
    });

    it('relation targets match the relation, inverse lures flip it', () => {
        const plan = generatePattern('relation', withN('pattern-relation', 1, { lureRate: 0.3 }), seededRng(8));
        plan.trials.forEach((trial, t) => {
            const stimulus = trial.stimulus as RelationStimulus;
            const angle = (Math.atan2(stimulus.a.y - stimulus.b.y, stimulus.a.x - stimulus.b.x) * 180) / Math.PI + 90;
            const sector = Math.round(((angle % 360) + 360) % 360 / 45) % 8;
            expect(sector).toBe(stimulus.relation);
            if (t === 0) return;
            const ref = plan.trials[t - 1].stimulus as RelationStimulus;
            expect(trial.isTarget).toBe(ref.relation === stimulus.relation);
            if (trial.lureType === 'inverse') expect(stimulus.relation).toBe((ref.relation + 4) % 8);
        });
    });
});

describe('Shift', () => {
    it('scores every trial under its own rule and lures match a different one', () => {
        for (const seed of seeds) {
            const deck = ['object', 'angle', 'mirror'] as const;
            const plan = generateShift(withN('shift', 2, { lureRate: 0.3, extra: 0.3 }), [...deck], seededRng(seed));
            plan.trials.forEach((trial, t) => {
                const stimulus = trial.stimulus as ShiftStimulus;
                expect(deck).toContain(stimulus.rule);
                if (t < 2) return;
                const earlier = plan.trials[t - 2].stimulus as ShiftStimulus;
                expect(trial.isTarget).toBe(shiftMatches(stimulus.rule, earlier, stimulus));
                if (trial.isLure) expect(trial.isTarget).toBe(false);
            });
            expect(targetShare(plan.trials, 2)).toBeGreaterThan(0.2);
            expect(new Set(plan.trials.map((t) => t.rule)).size).toBeGreaterThan(1);
        }
    });

    it('draws decks without the holdout rule and changes the deck between sessions', () => {
        const rng = seededRng(4);
        let previous = drawDeck(rng, 'radius', null);
        for (let i = 0; i < 30; i++) {
            const deck = drawDeck(rng, 'radius', previous);
            expect(deck).not.toContain('radius');
            expect(deck.length).toBeGreaterThanOrEqual(2);
            expect([...deck].sort().join()).not.toBe([...previous].sort().join());
            previous = deck;
        }
    });
});

describe('Relay', () => {
    it('keeps movers inside the arena and targets inside tolerance', () => {
        for (const seed of seeds) {
            const plan = generateRelay(withN('relay', 2, { extra: 6 }), seededRng(seed));
            expect(plan.movers).toHaveLength(6);
            expect(plan.tracked).toHaveLength(2);
            for (let ms = 0; ms < 90000; ms += 777) {
                for (const mover of plan.movers) {
                    const p = moverAt(mover, ms);
                    expect(p.x).toBeGreaterThanOrEqual(0.07 - 1e-9);
                    expect(p.x).toBeLessThanOrEqual(0.93 + 1e-9);
                }
            }
            plan.trials.forEach((trial, t) => {
                const flash = moverAt(plan.movers[trial.stimulus.object], plan.onsets[t]);
                expect(flash.x).toBeCloseTo(trial.stimulus.p.x, 9);
                if (t > 0) expect(plan.onsets[t]).toBeGreaterThan(plan.onsets[t - 1] + 500);
                if (t >= 2) {
                    const ref = plan.trials[t - 2].stimulus.p;
                    const d = Math.hypot(ref.x - trial.stimulus.p.x, ref.y - trial.stimulus.p.y);
                    expect(trial.isTarget).toBe(d <= RELAY_TOLERANCE);
                }
            });
            expect(targetShare(plan.trials, 2)).toBeGreaterThan(0.12);
        }
    });
});

describe('session engine and persistence', () => {
    it('draws three different games and a new mix each session', () => {
        const rng = seededRng(11);
        let previous = drawSessionMix(rng, null);
        for (let i = 0; i < 40; i++) {
            const mix = drawSessionMix(rng, previous);
            expect(new Set(mix).size).toBe(3);
            expect([...mix].sort().join()).not.toBe([...previous].sort().join());
            previous = mix;
        }
    });

    it('logs trials and blocks and steps the right track', () => {
        const state = createState(seededRng(2));
        const plan = createBlock(state, { game: 'drift' }, seededRng(3));
        const responses = plan.trials.map((t) => ({ responded: t.isTarget, rtMs: t.isTarget ? 420 : null }));
        const { state: next, log } = completeBlock(state, plan, responses, { now: new Date('2026-09-23T10:00:00Z'), id: 'b1' });
        expect(log).toMatchObject({ game: 'drift', accuracy: 1, level: 2, change: { direction: 'up', dial: 'n' } });
        expect(next.tracks.drift.n).toBe(2);
        expect(next.trials).toHaveLength(plan.trials.length);
        expect(next.trials.every((t) => t.correct && t.blockId === 'b1')).toBe(true);
    });

    it('holdout blocks never change difficulty and reset the monthly clock', () => {
        const state = createState(seededRng(2));
        const plan = createBlock(state, { game: 'shift', holdout: true }, seededRng(3));
        expect(plan.rules).toEqual([state.holdoutRule]);
        const { state: next } = completeBlock(state, plan, plan.trials.map((t) => ({ responded: t.isTarget, rtMs: 300 })), { now: new Date('2026-09-23T10:00:00Z') });
        expect(next.tracks.shift).toEqual(state.tracks.shift);
        expect(holdoutDue(next, new Date('2026-10-01T10:00:00Z'))).toBe(false);
        expect(holdoutDue(next, new Date('2026-10-22T10:00:00Z'))).toBe(true);
    });

    it('round-trips through storage and survives corrupt data', () => {
        const store = new Map<string, string>();
        const storage = {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => void store.set(k, v),
        } as unknown as Storage;
        const state = { ...createState(), lastSessionMix: ['drift', 'shift', 'relay'] as const };
        saveState({ ...state, lastSessionMix: [...state.lastSessionMix] }, storage);
        expect(loadState(storage).lastSessionMix).toEqual(['drift', 'shift', 'relay']);
        store.set(STORAGE_KEY, '{not json');
        expect(loadState(storage).blocks).toEqual([]);
    });
});
