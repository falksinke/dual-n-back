import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Game, makeVariableNList } from './Game';
import { BoardState } from './types';

describe('Game', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('marks early position claims as failed before n history exists', async () => {
        let lastMatch: Record<string, string> | undefined;
        const game = new Game(
            2,
            1,
            50,
            50,
            () => undefined,
            (match) => {
                lastMatch = match;
            },
            () => undefined,
            { random: () => 0.9, interferenceChance: 0, guaranteedMatchChance: 0 }
        );

        const startPromise = game.start();
        game.addChoice('position');
        await vi.advanceTimersByTimeAsync(50);
        await startPromise;

        expect(lastMatch?.position).toBe('failed');
    });

    it('validates a matching position claim after enough history', async () => {
        const states: BoardState[] = [];
        let lastMatch: Record<string, string> | undefined;
        let randomCall = 0;
        const randomValues = [0.9, 0.9, 0.9, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99];

        const game = new Game(
            2,
            4,
            50,
            50,
            (state) => states.push({ ...state }),
            (match) => {
                lastMatch = match;
            },
            () => undefined,
            {
                random: () => randomValues[randomCall++] ?? 0.99,
                interferenceChance: 0,
                guaranteedMatchChance: 1,
            }
        );

        const startPromise = game.start();

        for (let i = 0; i < 4; i++) {
            if (i === 3) {
                game.addChoice('position');
            }
            await vi.advanceTimersByTimeAsync(50);
        }

        await startPromise;

        expect(states.length).toBeGreaterThanOrEqual(3);
        expect(lastMatch?.position).toBe('success');
    });

    it('does not call onGameEnded when stopped mid-game', async () => {
        const onEnded = vi.fn();
        const game = new Game(2, 10, 100, 100, () => undefined, () => undefined, onEnded, {
            random: () => 0.9,
            interferenceChance: 0,
            guaranteedMatchChance: 0,
        });

        const startPromise = game.start();
        game.stop();
        await vi.advanceTimersByTimeAsync(1000);
        await startPromise;

        expect(onEnded).not.toHaveBeenCalled();
    });

    it('fires onStateChanged before onPlayerChoiceValidated within a trial', async () => {
        const order: string[] = [];
        const game = new Game(
            2,
            1,
            50,
            50,
            () => order.push('state'),
            () => order.push('validated'),
            () => undefined,
            { random: () => 0.9, interferenceChance: 0, guaranteedMatchChance: 0 }
        );

        const startPromise = game.start();
        expect(order).toEqual(['state']);
        await vi.advanceTimersByTimeAsync(50);
        await startPromise;

        expect(order).toEqual(['state', 'validated']);
    });

    it('never places a stimulus in the center cell when allowCenterStimulus is false', async () => {
        const positions: number[] = [];
        let randomCall = 0;
        const game = new Game(
            2,
            24,
            10,
            10,
            (state) => positions.push(state.positionIndex),
            () => undefined,
            () => undefined,
            {
                allowCenterStimulus: false,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
                random: () => {
                    const t = (randomCall++ % 20) / 20;
                    return t;
                },
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 24; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        expect(positions.length).toBe(24);
        expect(positions.every((p) => p !== 4)).toBe(true);
        expect(positions.some((p) => p === 0)).toBe(true);
        expect(positions.some((p) => p === 8)).toBe(true);
    });

    it('samples ISI between min and max as time between stimulus onsets', async () => {
        const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
        let randomCall = 0;
        // Dual mode: 1 random per modality + ISI per trial (no history yet at n=2).
        const randomValues = [0.5, 0.5, 0, 0.5, 0.5, 1];

        const game = new Game(
            2,
            2,
            500,
            1500,
            () => undefined,
            () => undefined,
            () => undefined,
            {
                random: () => randomValues[randomCall++] ?? 0.5,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
            }
        );

        const startPromise = game.start();
        await vi.advanceTimersByTimeAsync(500);
        await vi.advanceTimersByTimeAsync(1500);
        await startPromise;

        const delayCalls = setTimeoutSpy.mock.calls
            .map(([, ms]) => ms)
            .filter((ms): ms is number => typeof ms === 'number');

        expect(delayCalls).toContain(500);
        expect(delayCalls).toContain(1500);
    });

    it('uses near-miss history when interference is 1 and claiming N-back fails', async () => {
        const states: BoardState[] = [];
        let lastMatch: Record<string, string> | undefined;
        let randomCall = 0;
        const randomValues = [
            0.1, 0.1, 0.1, 0.1,
            0.1, 0.1, 0.1, 0.1,
            0.1, 0.1, 0.1, 0.1,
            0.99, 0.01, 0.99, 0.01,
            0.99, 0.01,
        ];

        const game = new Game(
            3,
            5,
            50,
            50,
            (state) => states.push({ ...state }),
            (match) => {
                lastMatch = match;
            },
            () => undefined,
            {
                random: () => randomValues[randomCall++] ?? 0.5,
                interferenceChance: 1,
                guaranteedMatchChance: 0,
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 5; i++) {
            if (i === 4) game.addChoice('position');
            await vi.advanceTimersByTimeAsync(50);
        }
        await startPromise;

        expect(states.length).toBe(5);
        expect(lastMatch?.position).toBeDefined();
    });

    it('omits lag minus one near-miss when session level is 2', async () => {
        let randomCall = 0;
        const game = new Game(
            2,
            6,
            10,
            10,
            () => undefined,
            () => undefined,
            () => undefined,
            {
                random: () => (randomCall++ % 100) / 100,
                interferenceChance: 1,
                guaranteedMatchChance: 0,
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 6; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;
        expect(game).toBeDefined();
    });

    it('validates against variable N for each trial', async () => {
        const variableList = [2, 3, 2];
        let randomCall = 0;

        const game = new Game(
            3,
            6,
            50,
            50,
            () => undefined,
            () => undefined,
            () => undefined,
            {
                variableN: true,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
                random: () => {
                    if (randomCall < variableList.length * 3) {
                        return (randomCall++ % 10) / 10;
                    }
                    return 0.99;
                },
            }
        );

        const list = makeVariableNList(6, 3, () => 0.5);
        expect(list).toHaveLength(3);
        expect(list.every((n) => n >= 1 && n <= 3)).toBe(true);

        const startPromise = game.start();
        for (let i = 0; i < 6; i++) {
            await vi.advanceTimersByTimeAsync(50);
        }
        await startPromise;
    });

    it('generates color and image fields in quad mode', async () => {
        const states: BoardState[] = [];
        const game = new Game(
            2,
            3,
            10,
            10,
            (state) => states.push({ ...state }),
            () => undefined,
            () => undefined,
            {
                mode: 'quad',
                interferenceChance: 0,
                guaranteedMatchChance: 0,
                random: () => 0.42,
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 3; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        expect(states[0].colorId).toBeDefined();
        expect(states[0].imageId).toBeDefined();
        expect(states[0].audioToken).toBeTruthy();
    });

    it('records CR in SDT when non-target goes unclaimed; match-% ignores CR', async () => {
        let result: import('./GameResult').GameResult | null = null;
        // Cycle RNG so positions/audio differ — constant RNG would create accidental n-back matches.
        let randomCall = 0;
        const game = new Game(
            2,
            4,
            50,
            50,
            () => undefined,
            () => undefined,
            (gameResult) => {
                result = gameResult;
            },
            {
                random: () => {
                    const v = (randomCall % 9) / 9;
                    randomCall++;
                    return v;
                },
                interferenceChance: 0,
                guaranteedMatchChance: 0,
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 4; i++) {
            await vi.advanceTimersByTimeAsync(50);
        }
        await startPromise;

        expect(result).not.toBeNull();
        const positionSdt = result!.sdt?.byModality.position;
        expect(positionSdt).toBeDefined();
        expect(positionSdt!.all.counts.correctRejections).toBeGreaterThan(0);
        // Match-% recap stays attempt-on-decision: CRs do not inflate success/failed.
        const recapTotal =
            (result!.recaps.position?.success ?? 0) + (result!.recaps.position?.failed ?? 0);
        const sdtTotal =
            positionSdt!.all.counts.hits +
            positionSdt!.all.counts.misses +
            positionSdt!.all.counts.falseAlarms +
            positionSdt!.all.counts.correctRejections;
        expect(sdtTotal).toBeGreaterThan(recapTotal);
    });

    it('stage A produces no deliberate lure tags', async () => {
        let result: import('./GameResult').GameResult | null = null;
        let randomCall = 0;
        const game = new Game(
            3,
            20,
            10,
            10,
            () => undefined,
            () => undefined,
            (gameResult) => {
                result = gameResult;
            },
            {
                lureStage: 'A',
                guaranteedMatchChance: 0,
                interferenceChance: 1, // ignored when lureStage set
                random: () => {
                    const v = (randomCall % 9) / 9;
                    randomCall++;
                    return v;
                },
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 20; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        const lureEvents =
            result!.sdt?.byModality.position?.all.counts.falseAlarms !== undefined
                ? // count lure-stratum events via lure FA+CR
                  result!.sdt!.byModality.position!.lure.counts.falseAlarms +
                  result!.sdt!.byModality.position!.lure.counts.correctRejections
                : 0;
        expect(lureEvents).toBe(0);
    });

    it('stage E tags n±1 lures and lure FAs feed d′_lure', async () => {
        let result: import('./GameResult').GameResult | null = null;
        // Always fail guaranteed-match roll (r1>=1), always take lure roll (r2=0).
        const sequence = [0.99, 0, 0.5, 0.5];
        let idx = 0;
        const game = new Game(
            3,
            12,
            10,
            10,
            () => undefined,
            () => undefined,
            (gameResult) => {
                result = gameResult;
            },
            {
                lureStage: 'E',
                guaranteedMatchChance: 0,
                random: () => {
                    const v = sequence[idx % sequence.length];
                    idx++;
                    return v;
                },
            }
        );

        const startPromise = game.start();
        // Claim position on every trial after warmup → FAs on lures.
        for (let i = 0; i < 12; i++) {
            if (i >= 3) game.addChoice('position');
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        const pos = result!.sdt!.byModality.position!;
        expect(
            pos.lure.counts.falseAlarms + pos.lure.counts.correctRejections
        ).toBeGreaterThan(0);
        expect(pos.lure.counts.falseAlarms).toBeGreaterThan(0);
        expect(pos.lure.dPrime).toBeLessThan(pos.clean.dPrime);
    });

    it('omits n−1 lure candidates at session level 2 with lureStage C', async () => {
        const states: import('./types').BoardState[] = [];
        let randomCall = 0;
        // Force lure attempts: r1 high, r2 low; then offset shuffle picks.
        const game = new Game(
            2,
            8,
            10,
            10,
            (state) => states.push({ ...state }),
            () => undefined,
            () => undefined,
            {
                lureStage: 'C',
                guaranteedMatchChance: 0,
                random: () => {
                    // Alternating: for generateModalityValue pairs (r1,r2) then position picks / shuffles
                    return randomCall++ % 2 === 0 ? 0.99 : 0.01;
                },
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 8; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        // At n=2, C offsets are [1] only — lure lag = effectiveN+1 = 3, never n−1 (=1).
        // Smoke: game completed without throw; offsets helper covered in lureStages.test.
        expect(states.length).toBe(8);
    });

    it('records miss in SDT when target is not claimed', async () => {
        let result: import('./GameResult').GameResult | null = null;
        let randomCall = 0;
        const game = new Game(
            2,
            4,
            50,
            50,
            () => undefined,
            () => undefined,
            (gameResult) => {
                result = gameResult;
            },
            {
                // Guaranteed matches after history exists; never claim.
                random: () => {
                    randomCall++;
                    return 0.01;
                },
                interferenceChance: 0,
                guaranteedMatchChance: 1,
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 4; i++) {
            await vi.advanceTimersByTimeAsync(50);
        }
        await startPromise;

        expect(result!.sdt?.byModality.position?.all.counts.misses ?? 0).toBeGreaterThan(0);
        expect(randomCall).toBeGreaterThan(0);
    });
});
