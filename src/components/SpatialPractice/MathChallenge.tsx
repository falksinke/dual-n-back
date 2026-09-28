import { useRef, useState } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import './MathChallenge.scss';
import { EnvelopeMark } from './VillageArt';

interface MathChallengeProps {
    onSolved: () => void;
    onAbort: () => void;
}

export default function MathChallenge({ onSolved, onAbort }: MathChallengeProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [problem] = useState(() => {
        const a = 10 + Math.floor(Math.random() * 90);
        const b = 10 + Math.floor(Math.random() * 90);
        return { left: Math.max(a, b), right: Math.min(a, b) };
    });
    const [answer, setAnswer] = useState('');
    const [incorrect, setIncorrect] = useState(false);
    const finishedRef = useRef(false);

    useMountEffect(() => {
        const dialog = dialogRef.current;
        dialog?.showModal();
        inputRef.current?.focus();
        return () => dialog?.close();
    });

    return (
        <dialog ref={dialogRef} className="practice-math" aria-labelledby="practice-math-title" aria-describedby="practice-math-description"
            onCancel={(event) => { event.preventDefault(); onAbort(); }}>
            <form onSubmit={(event) => {
                event.preventDefault();
                if (finishedRef.current) return;
                if (/^\d+$/.test(answer.trim()) && Number(answer) === problem.left - problem.right) {
                    finishedRef.current = true;
                    onSolved();
                } else {
                    setIncorrect(true);
                    inputRef.current?.focus();
                    inputRef.current?.select();
                }
            }}>
                <span className="practice-math__seal" aria-hidden="true"><EnvelopeMark /></span>
                <p className="practice-math__eyebrow">At the post office</p>
                <h2 id="practice-math-title">A little change for postage.</h2>
                <p id="practice-math-description">Work out this subtraction, then deliver your letters from memory.</p>
                <p className="practice-math__problem">{problem.left} − {problem.right} = ?</p>
                <label htmlFor="practice-math-answer">Your answer</label>
                <input ref={inputRef} id="practice-math-answer" type="text" inputMode="numeric"
                    autoComplete="off" value={answer} aria-invalid={incorrect}
                    aria-describedby={incorrect ? 'practice-math-error' : undefined}
                    onChange={(event) => { setAnswer(event.target.value); setIncorrect(false); }} />
                {incorrect && <p id="practice-math-error" role="alert">Not quite. Try the postage calculation again; your route is still waiting.</p>}
                <div className="practice-math__actions">
                    <div className="haptic-host"><button type="submit">Check change</button></div>
                    <div className="haptic-host"><button type="button" onClick={onAbort}>Cancel round</button></div>
                </div>
            </form>
        </dialog>
    );
}
