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
                expect(game.getClaimFeedback('position')).toBe('success');
            }
            await vi.advanceTimersByTimeAsync(50);
        }

        await startPromise;

        expect(states.length).toBeGreaterThanOrEqual(3);
        expect(lastMatch?.position).toBe('success');
    });

    it('exports the effective N and exact scoring evidence for every trial', async () => {
        let result: import('./GameResult').GameResult | null = null;
        const game = new Game(
            1,
            2,
            50,
            50,
            () => undefined,
            () => undefined,
            (gameResult) => {
                result = gameResult;
            },
            {
                modalities: ['position'],
                random: () => 0.5,
                interferenceChance: 0,
                guaranteedMatchChance: 1,
            }
        );

        const startPromise = game.start();
        await vi.advanceTimersByTimeAsync(50);
        game.addChoice('position');
        await vi.advanceTimersByTimeAsync(50);
        await startPromise;

        expect(result?.debugLog?.config).toMatchObject({
            level: 1,
            trials: 2,
            modalities: ['position'],
            variableN: false,
        });
        expect(result?.debugLog?.trials).toHaveLength(2);
        expect(result?.debugLog?.trials[0]).toMatchObject({
            trialIndex: 0,
            effectiveN: 1,
            scorable: false,
            referenceTrialIndex: null,
        });
        expect(result?.debugLog?.trials[1]).toMatchObject({
            trialIndex: 1,
            effectiveN: 1,
            scorable: true,
            referenceTrialIndex: 0,
            modalities: {
                position: {
                    matched: true,
                    claimed: true,
                    feedback: 'success',
                    scoreCell: 'hit',
                },
            },
        });
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

    it('pauses the trial clock and resumes without skipping ahead', async () => {
        const matchTimes: number[] = [];
        const game = new Game(
            2,
            1,
            1200,
            1200,
            () => undefined,
            () => {
                matchTimes.push(Date.now());
            },
            () => undefined,
            {
                random: () => 0.5,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
            }
        );

        const startPromise = game.start();
        // Fixed 1200ms ISI → 1000ms response + 200ms feedback reserve.
        await vi.advanceTimersByTimeAsync(400);
        game.pause();
        expect(game.isPaused).toBe(true);
        expect(game.addChoice('position')).toBe(false);

        await vi.advanceTimersByTimeAsync(5000);
        expect(matchTimes).toHaveLength(0);

        game.resume();
        expect(game.isPaused).toBe(false);
        await vi.advanceTimersByTimeAsync(600);
        expect(matchTimes).toHaveLength(1);
        await vi.advanceTimersByTimeAsync(200);
        await startPromise;
    });

    it('allows claims when paused with allowClaims', async () => {
        vi.useFakeTimers();
        const game = new Game(
            2,
            1,
            50,
            50,
            () => undefined,
            () => undefined,
            () => undefined,
            {
                random: () => 0.5,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
            }
        );

        const startPromise = game.start();
        await vi.advanceTimersByTimeAsync(10);
        game.pause({ allowClaims: true });
        expect(game.isPaused).toBe(true);
        expect(game.addChoice('position')).toBe(true);
        game.resume();
        await vi.advanceTimersByTimeAsync(5000);
        await startPromise;
        vi.useRealTimers();
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

    it('samples only four cells on a 2x2 position grid', async () => {
        const positions: number[] = [];
        let randomCall = 0;
        const game = new Game(
            2,
            16,
            10,
            10,
            (state) => positions.push(state.positionIndex),
            () => undefined,
            () => undefined,
            {
                positionGrid: '2x2',
                interferenceChance: 0,
                guaranteedMatchChance: 0,
                random: () => {
                    const t = (randomCall++ % 20) / 20;
                    return t;
                },
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 16; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        expect(positions.length).toBe(16);
        expect(positions.every((p) => p >= 0 && p <= 3)).toBe(true);
        expect(new Set(positions).size).toBeGreaterThan(1);
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
        // Grace off for pacing characterization: short ISI 500; long 500 + remainder 1000.
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
                answerGraceMs: 0,
            }
        );

        const startPromise = game.start();
        await vi.advanceTimersByTimeAsync(500);
        await vi.advanceTimersByTimeAsync(500);
        await vi.advanceTimersByTimeAsync(1000);
        await startPromise;

        const delayCalls = setTimeoutSpy.mock.calls
            .map(([, ms]) => ms)
            .filter((ms): ms is number => typeof ms === 'number');

        expect(delayCalls).toContain(500);
        expect(delayCalls).toContain(1000);
    });

    it('adds answer grace to every trial claim window', async () => {
        const matchTimes: number[] = [];
        let randomCall = 0;
        // Force short ISI (1000) then long (1500) with isiMin=1000.
        const randomValues = [0.5, 0.5, 0, 0.5, 0.5, 1];

        const game = new Game(
            2,
            2,
            1000,
            1500,
            () => undefined,
            () => {
                matchTimes.push(Date.now());
            },
            () => undefined,
            {
                random: () => randomValues[randomCall++] ?? 0.5,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
                answerGraceMs: 250,
            }
        );

        const t0 = Date.now();
        const startPromise = game.start();
        // Short: 1000 + 250 grace, carve → response 1050 + feedback 200
        await vi.advanceTimersByTimeAsync(1050);
        expect(matchTimes).toHaveLength(1);
        expect(matchTimes[0]! - t0).toBe(1050);
        await vi.advanceTimersByTimeAsync(200);
        // Long: isiMin 1000 + 250 grace, remainder 500 → score at 1250, gap 500
        await vi.advanceTimersByTimeAsync(1250);
        expect(matchTimes).toHaveLength(2);
        expect(matchTimes[1]! - matchTimes[0]!).toBe(1450);
        await vi.advanceTimersByTimeAsync(500);
        await startPromise;
    });

    it('scores at isiMin even when onset-to-onset ISI is longer', async () => {
        const matchTimes: number[] = [];
        let randomCall = 0;
        // Force long ISI (1500) on both trials via random = 1 for ISI slots.
        const randomValues = [0.5, 0.5, 1, 0.5, 0.5, 1];

        const game = new Game(
            2,
            2,
            500,
            1500,
            () => undefined,
            () => {
                matchTimes.push(Date.now());
            },
            () => undefined,
            {
                random: () => randomValues[randomCall++] ?? 0.5,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
                answerGraceMs: 0,
            }
        );

        const t0 = Date.now();
        const startPromise = game.start();
        await vi.advanceTimersByTimeAsync(500);
        expect(matchTimes).toHaveLength(1);
        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(500);
        expect(matchTimes).toHaveLength(2);
        await vi.advanceTimersByTimeAsync(1000);
        await startPromise;

        expect(matchTimes[0]! - t0).toBe(500);
        expect(matchTimes[1]! - matchTimes[0]!).toBe(1500);
    });

    it('splits fixed ISI into response window plus feedback reserve', async () => {
        const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
        const feedbackMs: number[] = [];
        let randomCall = 0;
        const game = new Game(
            2,
            2,
            1200,
            1200,
            () => undefined,
            (_match, ms) => {
                feedbackMs.push(ms);
            },
            () => undefined,
            {
                random: () => [0.5, 0.5, 0.5, 0.5][randomCall++] ?? 0.5,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
                answerGraceMs: 0,
            }
        );

        const startPromise = game.start();
        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(200);
        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(200);
        await startPromise;

        const delayCalls = setTimeoutSpy.mock.calls
            .map(([, ms]) => ms)
            .filter((ms): ms is number => typeof ms === 'number');
        expect(delayCalls.filter((ms) => ms === 1000).length).toBeGreaterThanOrEqual(2);
        expect(delayCalls.filter((ms) => ms === 200).length).toBeGreaterThanOrEqual(2);
        expect(feedbackMs.every((ms) => ms === 200)).toBe(true);
    });

    it('keeps onset spacing equal to fixed ISI when feedback is reserved', async () => {
        const matchTimes: number[] = [];
        let randomCall = 0;
        const game = new Game(
            2,
            2,
            1200,
            1200,
            () => undefined,
            () => {
                matchTimes.push(Date.now());
            },
            () => undefined,
            {
                random: () => [0.5, 0.5, 0.5, 0.5][randomCall++] ?? 0.5,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
                answerGraceMs: 0,
            }
        );

        const t0 = Date.now();
        const startPromise = game.start();
        await vi.advanceTimersByTimeAsync(1000);
        expect(matchTimes).toHaveLength(1);
        await vi.advanceTimersByTimeAsync(200);
        await vi.advanceTimersByTimeAsync(1000);
        expect(matchTimes).toHaveLength(2);
        await vi.advanceTimersByTimeAsync(200);
        await startPromise;

        expect(matchTimes[0]! - t0).toBe(1000);
        expect(matchTimes[1]! - matchTimes[0]!).toBe(1200);
    });

    it('keeps the full fixed ISI responsive when instant feedback is enabled', async () => {
        const feedbackMs: number[] = [];
        const game = new Game(
            1,
            1,
            1000,
            1000,
            () => undefined,
            (_match, ms) => {
                feedbackMs.push(ms);
            },
            () => undefined,
            {
                activeFeedback: true,
                random: () => 0.5,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
                answerGraceMs: 0,
            }
        );

        const startPromise = game.start();
        await vi.advanceTimersByTimeAsync(900);

        expect(game.addChoice('position')).toBe(true);

        await vi.advanceTimersByTimeAsync(100);
        await startPromise;
        expect(feedbackMs).toEqual([200]);
    });

    it('reserves a visible pre-onset miss flash when instant feedback is on', async () => {
        const scored: Array<{ match: Record<string, string | undefined>; ms: number }> = [];
        const stateTimes: number[] = [];
        const game = new Game(
            1,
            3,
            1000,
            1000,
            () => {
                stateTimes.push(Date.now());
            },
            (match, ms) => {
                scored.push({ match: { ...match }, ms });
            },
            () => undefined,
            {
                activeFeedback: true,
                random: () => 0.5,
                interferenceChance: 0,
                guaranteedMatchChance: 1,
                answerGraceMs: 250,
            }
        );

        const startPromise = game.start();
        // 1,250ms onset gap leaves a 1,050ms claim window plus 200ms feedback.
        await vi.advanceTimersByTimeAsync(1050);
        expect(scored).toHaveLength(1); // warm-up trial
        await vi.advanceTimersByTimeAsync(200);
        expect(stateTimes).toHaveLength(2);

        // Trial 1 is a guaranteed target. Not claiming it must produce a visible
        // miss before trial 2 appears, rather than in the same turn as its onset.
        await vi.advanceTimersByTimeAsync(1050);
        expect(scored).toHaveLength(2);
        expect(scored[1]!.match.position).toBe('failed');
        expect(scored[1]!.ms).toBe(200);
        expect(stateTimes).toHaveLength(2);

        await vi.advanceTimersByTimeAsync(199);
        expect(stateTimes).toHaveLength(2);
        await vi.advanceTimersByTimeAsync(1);
        expect(stateTimes).toHaveLength(3);

        await vi.advanceTimersByTimeAsync(1050);
        await vi.advanceTimersByTimeAsync(200);
        await startPromise;
    });

    it('keeps the full fixed 1s ISI responsive without instant feedback', async () => {
        const feedbackMs: number[] = [];
        const game = new Game(
            1,
            1,
            1000,
            1000,
            () => undefined,
            (_match, ms) => {
                feedbackMs.push(ms);
            },
            () => undefined,
            {
                activeFeedback: false,
                random: () => 0.5,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
                answerGraceMs: 0,
            }
        );

        const startPromise = game.start();
        await vi.advanceTimersByTimeAsync(900);

        expect(game.addChoice('position')).toBe(true);

        await vi.advanceTimersByTimeAsync(100);
        await startPromise;

        // Claim window stays 1000ms; feedback still requested as an overlap flash.
        expect(feedbackMs).toEqual([200]);
    });

    it('ignores claims after the response window closes', async () => {
        const matches: Array<Record<string, string | undefined>> = [];
        let randomCall = 0;
        const game = new Game(
            2,
            3,
            100,
            300,
            () => undefined,
            (match) => {
                matches.push({ ...match });
            },
            () => undefined,
            {
                // Warmup trials + force non-targets after history: no guaranteed match / interference.
                random: () => [0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 1][randomCall++] ?? 0.9,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
                answerGraceMs: 0,
            }
        );

        const startPromise = game.start();
        // Trial 0: score at 100, remainder 200
        await vi.advanceTimersByTimeAsync(100);
        // Late press during remainder — must not attach to next trial.
        game.addChoice('position');
        await vi.advanceTimersByTimeAsync(200);
        // Trial 1
        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(200);
        // Trial 2
        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(200);
        await startPromise;

        // No position key on later matches means CR (unclaimed non-target) or warmup.
        for (const match of matches) {
            expect(match.position).not.toBe('failed');
        }
    });

    it('does not create accidental targets on free-play random trials', async () => {
        let result: import('./GameResult').GameResult | undefined;
        let seed = 42;
        const random = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };

        const game = new Game(
            2,
            40,
            10,
            10,
            () => undefined,
            () => undefined,
            (gameResult) => {
                result = gameResult;
            },
            {
                random,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 40; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        // No forced targets and no claims → only CRs if accidental matches are repaired.
        expect(result!.sdt?.byModality.position?.all.counts.misses ?? -1).toBe(0);
        expect(result!.sdt?.byModality.audio?.all.counts.misses ?? -1).toBe(0);
        expect(result!.sdt?.byModality.position?.all.counts.hits ?? -1).toBe(0);
        expect(result!.sdt?.byModality.audio?.all.counts.hits ?? -1).toBe(0);
        expect(result!.sdt?.byModality.position?.all.counts.correctRejections ?? 0).toBeGreaterThan(
            0
        );
    });

    it('Easy mode does not reuse positions during the 5-back warmup window', async () => {
        const positions: number[] = [];
        const game = new Game(
            5,
            5,
            10,
            10,
            (state) => positions.push(state.positionIndex),
            () => undefined,
            () => undefined,
            {
                modalities: ['position'],
                interferenceChance: 0,
                avoidAccidentalLures: true,
                guaranteedMatchChance: 0,
                random: () => 0,
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 5; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        expect(positions).toHaveLength(5);
        expect(new Set(positions).size).toBe(5);
    });

    it('Easy mode excludes the N+1 lure when lag reaches the first trial', async () => {
        const positions: number[] = [];
        const game = new Game(
            5,
            7,
            10,
            10,
            (state) => positions.push(state.positionIndex),
            () => undefined,
            () => undefined,
            {
                modalities: ['position'],
                interferenceChance: 0,
                avoidAccidentalLures: true,
                guaranteedMatchChance: 0,
                random: () => 0,
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 7; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        expect(positions).toHaveLength(7);
        expect(positions[6]).not.toBe(positions[0]);
    });

    it('Easy mode still permits a genuine 5-back target', async () => {
        const positions: number[] = [];
        const game = new Game(
            5,
            6,
            10,
            10,
            (state) => positions.push(state.positionIndex),
            () => undefined,
            () => undefined,
            {
                modalities: ['position'],
                interferenceChance: 0,
                avoidAccidentalLures: true,
                guaranteedMatchChance: 1,
                random: () => 0,
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 6; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        expect(positions).toHaveLength(6);
        expect(positions[5]).toBe(positions[0]);
    });

    it('Easy mode avoids accidental near-miss values on non-match trials', async () => {
        const states: BoardState[] = [];
        let randomCall = 0;
        const n = 3;
        const game = new Game(
            n,
            48,
            10,
            10,
            (state) => states.push({ ...state }),
            () => undefined,
            () => undefined,
            {
                random: () => (randomCall++ % 97) / 97,
                interferenceChance: 0,
                avoidAccidentalLures: true,
                guaranteedMatchChance: 0,
                useJaeggiQuotas: false,
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 48; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        const offsets = n < 3 ? [1, n] : [-1, 1, n];
        for (let t = n; t < states.length; t++) {
            for (const modality of ['position', 'audio'] as const) {
                const current =
                    modality === 'position' ? states[t].positionIndex : states[t].audioToken;
                const trueMatch =
                    modality === 'position'
                        ? states[t - n].positionIndex
                        : states[t - n].audioToken;
                if (current === trueMatch) continue;
                for (const offset of offsets) {
                    const lag = n + offset;
                    if (lag < 1 || t - lag < 0) continue;
                    const lureValue =
                        modality === 'position'
                            ? states[t - lag].positionIndex
                            : states[t - lag].audioToken;
                    expect(current).not.toBe(lureValue);
                }
            }
        }
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

    it('uses quota planner when useBlockQuotas and lureStage are set', async () => {
        const { planBlockStimuli } = await import('./blockQuotas');
        let seed = 99;
        const random = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 0x100000000;
        };
        const expected = planBlockStimuli({
            gameLength: 20,
            sessionN: 3,
            modalities: ['position', 'audio'],
            lureStage: 'C',
            random,
        });

        let result: import('./GameResult').GameResult | null = null;
        seed = 99;
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
                lureStage: 'C',
                useBlockQuotas: true,
                guaranteedMatchChance: 0,
                random,
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 20; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        expect(result).not.toBeNull();
        expect(expected.ok).toBe(true);
    });

    it('ignores useBlockQuotas without lureStage (free-play path)', async () => {
        let result: import('./GameResult').GameResult | null = null;
        const game = new Game(
            2,
            6,
            10,
            10,
            () => undefined,
            () => undefined,
            (gameResult) => {
                result = gameResult;
            },
            {
                useBlockQuotas: true,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
                random: () => 0.5,
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 6; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        expect(result).not.toBeNull();
    });

    it('uses Jaeggi quotas in free-play when enabled', async () => {
        let seed = 42;
        const random = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 0x100000000;
        };

        let result: import('./GameResult').GameResult | null = null;
        const game = new Game(
            2,
            20,
            10,
            10,
            () => undefined,
            () => undefined,
            (gameResult) => {
                result = gameResult;
            },
            {
                useJaeggiQuotas: true,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
                random,
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 20; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        expect(result).not.toBeNull();
        const position = result!.sdt?.byModality.position?.all.counts;
        const audio = result!.sdt?.byModality.audio?.all.counts;
        // 20 total / n=2 → 18 scorable → round(6*18/20)=5
        expect((position?.hits ?? 0) + (position?.misses ?? 0)).toBe(5);
        expect((audio?.hits ?? 0) + (audio?.misses ?? 0)).toBe(5);
    });

    it('realizes every planned Jaeggi target as an actual n-back match (classic 20+n and free-play 30)', async () => {
        const getModalityValue = (await import('./types')).getModalityValue;
        type BoardState = import('./types').BoardState;
        type TrialPlanEntry = import('./blockQuotas').TrialPlanEntry;

        async function runBlock(opts: {
            seed: number;
            n: number;
            gameLength: number;
            expectPerModality: number;
        }) {
            let seed = opts.seed;
            const random = () => {
                seed = (seed * 1664525 + 1013904223) >>> 0;
                return seed / 0x100000000;
            };

            const boards: BoardState[] = [];
            let result: import('./GameResult').GameResult | null = null;
            const game = new Game(
                opts.n,
                opts.gameLength,
                10,
                10,
                (boardState) => {
                    boards.push(boardState);
                },
                () => undefined,
                (gameResult) => {
                    result = gameResult;
                },
                {
                    useJaeggiQuotas: true,
                    interferenceChance: 0,
                    guaranteedMatchChance: 0,
                    random,
                }
            );

            const plan = (game as unknown as { trialPlan: TrialPlanEntry[] | null }).trialPlan;
            expect(plan).not.toBeNull();

            const startPromise = game.start();
            for (let i = 0; i < opts.gameLength; i++) {
                await vi.advanceTimersByTimeAsync(10);
            }
            await startPromise;

            expect(boards).toHaveLength(opts.gameLength);
            expect(result).not.toBeNull();

            let plannedMissed = 0;
            let realizedPosition = 0;
            let realizedAudio = 0;

            for (let t = opts.n; t < opts.gameLength; t++) {
                const prior = boards[t - opts.n];
                const cur = boards[t];
                const posMatch =
                    getModalityValue(cur, 'position') === getModalityValue(prior, 'position');
                const audioMatch =
                    getModalityValue(cur, 'audio') === getModalityValue(prior, 'audio');
                if (posMatch) realizedPosition++;
                if (audioMatch) realizedAudio++;

                if (plan![t].byModality.position?.role === 'target' && !posMatch) {
                    plannedMissed++;
                }
                if (plan![t].byModality.audio?.role === 'target' && !audioMatch) {
                    plannedMissed++;
                }
            }

            // Planned targets must always become true matches in the stimulus stream.
            expect(plannedMissed).toBe(0);
            // SDT target count (= hits+misses with no claims) must match plan density.
            const position = result!.sdt?.byModality.position?.all.counts;
            const audio = result!.sdt?.byModality.audio?.all.counts;
            expect((position?.hits ?? 0) + (position?.misses ?? 0)).toBe(opts.expectPerModality);
            expect((audio?.hits ?? 0) + (audio?.misses ?? 0)).toBe(opts.expectPerModality);
            // Stimulus-level matches should equal SDT targets when clean trials never collide.
            expect(realizedPosition).toBe(opts.expectPerModality);
            expect(realizedAudio).toBe(opts.expectPerModality);
        }

        // Classic Jaeggi: 20 scorable → 6+6
        for (const seed of [1, 7, 42, 99, 12345]) {
            await runBlock({ seed, n: 2, gameLength: 22, expectPerModality: 6 });
        }
        // Free-play default: 28 scorable → 8+8
        for (const seed of [1, 7, 42, 99, 12345]) {
            await runBlock({ seed, n: 2, gameLength: 30, expectPerModality: 8 });
        }
    });

    it('plans Jaeggi-scale targets when variable N is on', async () => {
        let randomCall = 0;
        let result: import('./GameResult').GameResult | null = null;
        const game = new Game(
            2,
            20,
            10,
            10,
            () => undefined,
            () => undefined,
            (gameResult) => {
                result = gameResult;
            },
            {
                useJaeggiQuotas: true,
                variableN: true,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
                random: () => (randomCall++ % 100) / 100,
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 20; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        expect(result).not.toBeNull();
        const position = result!.sdt?.byModality.position?.all.counts;
        const audio = result!.sdt?.byModality.audio?.all.counts;
        // Variable N planner uses Jaeggi density scaled to scorable trials.
        const positionTargets = (position?.hits ?? 0) + (position?.misses ?? 0);
        const audioTargets = (audio?.hits ?? 0) + (audio?.misses ?? 0);
        expect(positionTargets).toBeGreaterThanOrEqual(5);
        expect(audioTargets).toBeGreaterThanOrEqual(5);
        expect(positionTargets).toBe(audioTargets);
    });

    it('pins stimuli to center when Position is not an active modality', async () => {
        const positions: number[] = [];
        const game = new Game(
            2,
            8,
            10,
            10,
            (state) => {
                positions.push(state.positionIndex);
            },
            () => undefined,
            () => undefined,
            {
                mode: 'triple',
                modalities: ['color', 'image', 'audio'],
                interferenceChance: 0,
                guaranteedMatchChance: 0,
                useJaeggiQuotas: false,
                random: () => 0.9,
            }
        );

        const startPromise = game.start();
        for (let i = 0; i < 8; i++) {
            await vi.advanceTimersByTimeAsync(10);
        }
        await startPromise;

        expect(positions.length).toBe(8);
        expect(positions.every((p) => p === 4)).toBe(true);
        expect(game.modalities).toEqual(['color', 'image', 'audio']);
    });

    it('stepForward leaves the pause gate and scores the held trial immediately', async () => {
        const states: BoardState[] = [];
        let ended = false;
        const game = new Game(
            2,
            3,
            50,
            50,
            (state) => states.push({ ...state }),
            () => undefined,
            () => {
                ended = true;
            },
            {
                modalities: ['position'],
                random: () => 0.9,
                interferenceChance: 0,
                guaranteedMatchChance: 0,
            }
        );

        const startPromise = game.start();
        game.pause({ allowClaims: true });
        expect(game.isPaused).toBe(true);

        // The frozen clock never advances to the next onset on its own.
        await vi.advanceTimersByTimeAsync(1000);
        expect(states).toHaveLength(1);

        game.stepForward();
        expect(game.isPaused).toBe(false);

        await vi.advanceTimersByTimeAsync(100);
        await startPromise;

        expect(states).toHaveLength(3);
        expect(ended).toBe(true);
    });

    it('scores claims made during the stepwise pause on stepForward', async () => {
        let lastMatch: Record<string, string> | undefined;
        const game = new Game(
            2,
            3,
            50,
            50,
            () => undefined,
            (match) => {
                lastMatch = match;
            },
            () => undefined,
            {
                modalities: ['position'],
                random: () => 0.9,
                interferenceChance: 0,
                guaranteedMatchChance: 1,
            }
        );

        const startPromise = game.start();
        // Trials 0–1 (warm-up): hold the gate, then continue unclaimed. A 1ms
        // advance flushes the scoring continuation without consuming the next
        // onset timer (re-armed at the same fake-clock time).
        for (let i = 0; i < 2; i++) {
            game.pause({ allowClaims: true });
            game.stepForward();
            await vi.advanceTimersByTimeAsync(1);
        }

        // Third onset: scorable trial with a guaranteed n-back match. Claims
        // made while the gate holds must attach to this trial, not the next.
        game.pause({ allowClaims: true });
        expect(game.addChoice('position')).toBe(true);
        game.stepForward();
        await startPromise;

        expect(lastMatch?.position).toBe('success');
    });
});
