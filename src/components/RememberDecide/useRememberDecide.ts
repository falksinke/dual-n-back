import { useRef, useState } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import { generateRound } from '../../model/rememberDecide';
import type { DecisionAnswer, RememberDecideConfig, RememberDecideRound } from '../../model/rememberDecide';
import {
    initialState,
    rememberDecideReducer,
} from './controller';
import type { RememberDecideAction, RememberDecideState, TimedPhase } from './controller';
import { phaseIdentity, projectState } from './projection';

interface RememberDecideDependencies {
    readonly createRound?: (config: RememberDecideConfig) =>
        | { readonly ok: true; readonly value: RememberDecideRound }
        | { readonly ok: false; readonly error: { readonly message: string } };
    readonly now?: () => number;
}

export function useRememberDecide(
    onExit: () => void,
    dependencies: RememberDecideDependencies = {}
) {
    const createRound = dependencies.createRound ?? generateRound;
    const now = dependencies.now ?? (() => performance.now());
    const [state, setState] = useState(() => initialState());
    const stateRef = useRef(state);
    const timerRef = useRef<number | null>(null);
    const timerOwnerRef = useRef<object | null>(null);
    const mountedRef = useRef(true);

    function clearRunner(): void {
        if (timerRef.current == null) return;
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        timerOwnerRef.current = null;
    }

    function send(action: RememberDecideAction): RememberDecideState {
        if (!mountedRef.current) return stateRef.current;
        const previous = stateRef.current;
        const next = rememberDecideReducer(previous, action);
        if (phaseIdentity(previous) !== phaseIdentity(next)) clearRunner();
        stateRef.current = next;
        setState(next);
        return next;
    }

    function startWithConfig(config: RememberDecideConfig): void {
        if (!mountedRef.current) return;
        clearRunner();
        const result = createRound(config);
        if (!result.ok) {
            send({ type: 'setup', error: result.error.message });
            return;
        }
        send({ type: 'start', round: result.value });
    }

    function start(expectedGeneration: number): void {
        if (stateRef.current.generation !== expectedGeneration) return;
        startWithConfig(stateRef.current.config);
    }

    function isCurrentRun(run: NonNullable<RememberDecideState['phaseRun']>): boolean {
        const current = stateRef.current.phaseRun;
        return current?.generation === run.generation
            && current.phase === run.phase
            && current.itemIndex === run.itemIndex
            && current.deadline === run.deadline;
    }

    function scheduleRun(run: NonNullable<RememberDecideState['phaseRun']>): void {
        const delay = Math.max(0, run.deadline - now());
        const owner = {};
        const timer = window.setTimeout(() => {
            if (timerOwnerRef.current !== owner) return;
            timerRef.current = null;
            timerOwnerRef.current = null;
            if (!mountedRef.current) return;
            if (!isCurrentRun(run)) return;
            const observedNow = now();
            if (observedNow < run.deadline) {
                scheduleRun(run);
                return;
            }
            send({
                type: 'phase-elapsed',
                generation: run.generation,
                phase: run.phase,
                itemIndex: run.itemIndex,
                now: observedNow,
            });
        }, delay);
        timerRef.current = timer;
        timerOwnerRef.current = owner;
    }

    function mountPhase(
        generation: number,
        phase: TimedPhase,
        itemIndex: number
    ): void {
        if (!mountedRef.current) return;
        const next = send({ type: 'mount-phase', generation, phase, itemIndex, now: now() });
        if (
            !next.phaseRun
            || next.phaseRun.generation !== generation
            || next.phaseRun.phase !== phase
            || next.phaseRun.itemIndex !== itemIndex
            || timerRef.current != null
        ) return;
        const run = next.phaseRun;
        scheduleRun(run);
    }

    function answer(generation: number, itemIndex: number, answerValue: DecisionAnswer): void {
        send({
            type: 'answer',
            generation,
            itemIndex,
            answer: answerValue,
            now: now(),
        });
    }

    function interrupt(generation: number): void {
        if (stateRef.current.generation !== generation) return;
        clearRunner();
        send({ type: 'interrupt', generation });
    }

    function setup(expectedGeneration: number): void {
        if (stateRef.current.generation !== expectedGeneration) return;
        clearRunner();
        send({ type: 'setup' });
    }

    function exit(expectedGeneration: number): void {
        if (!mountedRef.current || stateRef.current.generation !== expectedGeneration) return;
        clearRunner();
        send({ type: 'setup' });
        onExit();
    }

    function tryNextLength(expectedGeneration: number): void {
        const current = stateRef.current;
        if (current.generation !== expectedGeneration) return;
        const nextLength = current.score?.recommendation.nextLength;
        if (current.phase !== 'result' || nextLength == null) return;
        startWithConfig({ ...current.config, sequenceLength: nextLength });
    }

    useMountEffect(() => {
        mountedRef.current = true;
        const handleVisibility = (): void => {
            if (document.hidden) interrupt(stateRef.current.generation);
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            mountedRef.current = false;
            document.removeEventListener('visibilitychange', handleVisibility);
            clearRunner();
        };
    });

    return {
        view: projectState(state),
        start,
        restart: start,
        setup,
        exit,
        interrupt,
        mountPhase,
        answer,
        tryNextLength,
        configure: (generation: number, config: RememberDecideConfig) => {
            if (stateRef.current.generation === generation) send({ type: 'configure', config });
        },
        remember: (generation: number, row: number, column: number) => send({ type: 'remember', generation, location: { row, column } }),
        undo: (generation: number) => send({ type: 'undo', generation }),
        clear: (generation: number) => send({ type: 'clear', generation }),
        submit: (generation: number) => send({ type: 'submit', generation }),
    };
}
