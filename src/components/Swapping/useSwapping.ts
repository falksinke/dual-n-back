import { useRef, useState } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import { createPresetConfig, generateRound } from '../../model/swapping';
import type { SwappingConfig } from '../../model/swapping/types';
import { createLetterPlayer } from './audio';
import type { LetterPlayer } from './audio';
import { initialState, swappingReducer } from './controller';
import type { SwappingAction } from './controller';
import { projectState } from './projection';

export function useSwapping(onExit: () => void) {
    const [state, setState] = useState(() => initialState(createPresetConfig('start', 'numbers', 'sequence')));
    const stateRef = useRef(state);
    const playerRef = useRef<LetterPlayer | null>(null);
    const sampleGeneration = useRef(0);
    const [sampleStatus, setSampleStatus] = useState('');

    function send(action: SwappingAction) {
        const next = swappingReducer(stateRef.current, action);
        stateRef.current = next;
        setState(next);
        return next;
    }

    function player() {
        return playerRef.current ??= createLetterPlayer();
    }

    function stopAudio() {
        sampleGeneration.current += 1;
        playerRef.current?.cancel();
    }

    function playEncoding() {
        if (stateRef.current.phase !== 'encode' || stateRef.current.audioStatus === 'playing') return;
        stopAudio();
        const next = send({ type: 'audio-start' });
        if (next.audioStatus !== 'playing' || !next.round) return;
        const generation = next.generation;
        player().play(next.round.initial.map((token) => token.value.toLowerCase()), {
            onToken: (index) => send({ type: 'audio-token', generation, index }),
            onComplete: () => send({ type: 'audio-complete', generation }),
            onError: (message) => send({ type: 'audio-error', generation, message }),
        });
    }

    function start() {
        const result = generateRound(stateRef.current.config);
        stopAudio();
        setSampleStatus('');
        if (!result.ok) {
            send({ type: 'setup', error: result.error.message });
            return;
        }
        send({ type: 'start', round: result.value });
        if (result.value.config.content === 'audio') playEncoding();
    }

    function pause() {
        stopAudio();
        setSampleStatus('');
        send({ type: 'pause' });
    }

    function resume() {
        const next = send({ type: 'resume' });
        if (next.phase === 'encode' && next.config.content === 'audio' && next.audioStatus === 'pending') playEncoding();
    }

    function setup() {
        stopAudio();
        setSampleStatus('');
        send({ type: 'setup' });
    }

    function sample() {
        if (stateRef.current.phase !== 'setup') return;
        stopAudio();
        const generation = sampleGeneration.current;
        setSampleStatus('Playing sample C…');
        player().play(['c'], {
            onToken: () => {},
            onComplete: () => { if (generation === sampleGeneration.current) setSampleStatus('Sample C finished.'); },
            onError: (message) => { if (generation === sampleGeneration.current) setSampleStatus(message); },
        });
    }

    useMountEffect(() => {
        const onVisibility = () => { if (document.hidden) pause(); };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            sampleGeneration.current += 1;
            playerRef.current?.dispose();
            playerRef.current = null;
            // Invalidate controller callbacks even if an adapter callback was already queued.
            stateRef.current = { ...stateRef.current, generation: stateRef.current.generation + 1 };
        };
    });

    return {
        view: projectState(state), sampleStatus, send, start, pause, resume, setup, sample,
        playEncoding,
        configure: (config: SwappingConfig) => { stopAudio(); setSampleStatus(''); send({ type: 'configure', config }); },
        exit: () => { stopAudio(); send({ type: 'setup' }); onExit(); },
        ready: () => { stopAudio(); send({ type: 'ready' }); },
    };
}
