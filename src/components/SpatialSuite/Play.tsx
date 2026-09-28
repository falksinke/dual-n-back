import { useEffect, useState } from 'react';
import type { DriftStimulus } from '../../model/spatialSuite/games/drift';
import type { PatternStimulus } from '../../model/spatialSuite/games/pattern';
import type { RelayPlan, RelayStimulus } from '../../model/spatialSuite/games/relay';
import { RULE_LABELS, type ShiftRule, type ShiftStimulus } from '../../model/spatialSuite/games/shift';
import type { WayfinderStimulus } from '../../model/spatialSuite/games/wayfinder';
import type { BlockPlan, TrialResponse } from '../../model/spatialSuite/types';
import { DriftStage, PatternStage, RelayStage, ShiftStage, WayfinderStage } from './Stage';
import { useBlockRunner, type FeedbackKind } from './useBlockRunner';

const FEEDBACK_TEXT: Record<FeedbackKind, string> = {
    hit: 'Match',
    'false-alarm': 'Not a match',
    miss: 'Missed a match',
};

const MATCH_KEYS = new Set([' ', 'j', 'f']);

interface PlayProps {
    plan: BlockPlan<unknown>;
    label: string;
    onFinish: (responses: TrialResponse[], tracked?: { correct: number; total: number }) => void;
    onInterrupted: () => void;
    onQuit: () => void;
}

export default function Play({ plan, label, onFinish, onInterrupted, onQuit }: PlayProps) {
    const relay = plan.game === 'relay' ? (plan as RelayPlan) : null;
    const [selecting, setSelecting] = useState<TrialResponse[] | null>(null);
    const [selected, setSelected] = useState<number[]>([]);
    const runner = useBlockRunner(plan, (responses) => {
        if (relay) setSelecting(responses);
        else onFinish(responses);
    }, { continuous: relay !== null, onInterrupted });
    const { trialIndex, visible, feedback, respond } = runner;
    const trial = trialIndex >= 0 ? plan.trials[trialIndex] : null;

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onQuit();
                return;
            }
            if (selecting || event.repeat || !MATCH_KEYS.has(event.key.toLowerCase())) return;
            event.preventDefault();
            respond();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [respond, onQuit, selecting]);

    const endMs = plan.onsets[plan.onsets.length - 1] + plan.difficulty.stimulusMs + plan.difficulty.isiMs;
    const scored = Math.max(0, trialIndex + 1);
    const rule = trial?.rule && plan.game === 'shift' ? RULE_LABELS[trial.rule as ShiftRule] : null;

    let stage;
    switch (plan.game) {
        case 'drift': stage = <DriftStage stimulus={(trial?.stimulus as DriftStimulus) ?? null} visible={visible} />; break;
        case 'wayfinder': stage = <WayfinderStage stimulus={(trial?.stimulus as WayfinderStimulus) ?? null} visible={visible} />; break;
        case 'pattern': stage = <PatternStage stimulus={(trial?.stimulus as PatternStimulus) ?? null} visible={visible} />; break;
        case 'shift': stage = <ShiftStage stimulus={(trial?.stimulus as ShiftStimulus) ?? null} visible={visible} />; break;
        case 'relay': stage = (
            <RelayStage plan={relay!} elapsed={selecting ? endMs : runner.elapsed}
                flashing={visible && trial ? (trial.stimulus as RelayStimulus).object : null}
                view={selecting ? 'select' : trialIndex < 0 ? 'preview' : 'play'}
                selected={selected}
                onToggle={(object) => setSelected((current) => current.includes(object)
                    ? current.filter((o) => o !== object)
                    : current.length < relay!.tracked.length ? [...current, object] : current)} />
        );
    }

    const status = selecting
        ? `Pick the ${relay!.tracked.length} discs you tracked`
        : relay && trialIndex < 0 ? 'Remember the highlighted discs' : rule ? rule.cue : `${plan.difficulty.n}-back`;

    return (
        <section className="suite-play" aria-label={label}>
            <header className="suite-play__bar">
                <span>{label}</span>
                <span aria-hidden="true">{Math.min(scored, plan.trials.length)} / {plan.trials.length}</span>
                <button type="button" className="suite-link" onClick={onQuit}>Stop</button>
            </header>
            <div className={`suite-cue ${rule ? `is-rule is-${trial!.rule}` : ''}`} aria-live="polite">
                {rule && <strong>{rule.name}</strong>}
                <span>{status}</span>
            </div>
            <div className="suite-stage-wrap">{stage}</div>
            {selecting ? (
                <button type="button" className="suite-button is-primary suite-match"
                    disabled={selected.length !== relay!.tracked.length}
                    onClick={() => onFinish(selecting, {
                        correct: selected.filter((o) => relay!.tracked.includes(o)).length,
                        total: relay!.tracked.length,
                    })}>
                    Confirm
                </button>
            ) : (
                <button type="button" key={feedback?.id}
                    className={`suite-button suite-match ${feedback ? `is-${feedback.kind}` : ''}`}
                    onPointerDown={(event) => {
                        event.preventDefault();
                        respond();
                    }}
                    onClick={(event) => {
                        // Pointer presses already responded on pointer-down for lower latency.
                        if (event.detail === 0) respond();
                    }}>
                    Match
                    <span className="suite-match__hint" aria-hidden="true">Space</span>
                </button>
            )}
            <p className="suite-feedback" aria-live="polite">{feedback ? FEEDBACK_TEXT[feedback.kind] : ' '}</p>
        </section>
    );
}
