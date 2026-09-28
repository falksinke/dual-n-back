import { useRef, type KeyboardEvent } from 'react';
import { CELL_COUNT, MIDDLE_CELL } from './sequence';
import { Courier, EnvelopeMark, FireflyMark, HouseRoof, NightSky, Planter, PostOffice, SleepingCat, StreetLamp } from './VillageArt';
import './FireflyVillage.scss';

export interface FireflyVillageProps {
    phase: 'idle' | 'showing' | 'math' | 'recall' | 'success' | 'retry' | 'paused';
    activeCell: number | null;
    activeOrder: number | null;
    tapFeedback: { cell: number; correct: boolean; id: number } | null;
    wrongCell: number | null;
    middleWindowEnabled: boolean;
    onChoose: (cell: number) => void;
    onNewSequence: () => void;
    onReset: () => void;
}

const HOUSES = ['clay', 'sage', 'plum'] as const;

function MiddleBalcony() {
    return <div className="firefly-balcony" role="img" aria-label="Middle balcony with closed curtains, no deliveries">
        <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
            <rect x="18" y="13" width="84" height="91" rx="8" fill="#b8aea4" stroke="#34364c" strokeWidth="3" />
            <path d="M25 22h70v67H25Z" fill="#35485c" />
            <path d="M25 22h35v67H25Zm35 0h35v67H60Z" fill="#c6b3a2" />
            <path d="M31 23c-3 17 3 48 0 65m10-65c-2 19 2 47 0 65m10-65c-2 21 2 46 0 65m18-65c-2 19 2 48 0 65m10-65c-3 18 3 47 0 65m10-65c-2 19 2 47 0 65" fill="none" stroke="#9b897f" strokeWidth="2" opacity=".65" />
            <path d="M60 22v67" stroke="#a6a7a5" strokeWidth="4" />
            <path d="M11 77h98v8H11Z" fill="#d0b7a0" stroke="#4e495b" strokeWidth="2" />
            <path d="M17 85v26m86-26v26M32 85v24m14-24v24m14-24v24m14-24v24m14-24v24" stroke="#4e495b" strokeWidth="4" />
            <path d="M10 110h100v6H10Z" fill="#b89b83" stroke="#4e495b" strokeWidth="2" />
        </svg>
    </div>;
}

/** A view of the current pulse and the player's last tap only — no hidden route. */
export default function FireflyVillage({ phase, activeCell, activeOrder, tapFeedback, wrongCell, middleWindowEnabled, onChoose, onNewSequence, onReset }: FireflyVillageProps) {
    const windowsRef = useRef<Array<HTMLButtonElement | null>>([]);
    const courierPose = phase === 'idle' ? 'idle'
        : phase === 'success' ? 'success'
            : phase === 'retry' ? 'retry'
                : phase === 'paused' ? 'rest'
                    : phase === 'recall' && tapFeedback?.correct ? 'deliver' : 'watch';

    const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, cell: number): void => {
        if (phase !== 'recall' || event.altKey || event.ctrlKey || event.metaKey) return;
        const row = Math.floor(cell / 3);
        const column = cell % 3;
        let next = cell;
        switch (event.key) {
            case 'ArrowLeft': next = column > 0 ? cell - 1 : cell; break;
            case 'ArrowRight': next = column < 2 ? cell + 1 : cell; break;
            case 'ArrowUp': next = row > 0 ? cell - 3 : cell; break;
            case 'ArrowDown': next = row < 2 ? cell + 3 : cell; break;
            case 'Home': next = 0; break;
            case 'End': next = CELL_COUNT - 1; break;
            default: return; // Enter / Space remain native button activation.
        }
        event.preventDefault();
        if (!middleWindowEnabled && next === MIDDLE_CELL) next += next - cell;
        windowsRef.current[next]?.focus({ preventScroll: true });
    };

    return <div className={`firefly-village is-${phase}`}>
        <div className="firefly-village__sky" aria-hidden="true"><NightSky /></div>
        <div className="firefly-village__town">
            <div className="firefly-village__facades" aria-hidden="true">
                {HOUSES.map((kind) => <div key={kind} className={`firefly-village__house is-${kind}`}>
                    <HouseRoof kind={kind} />
                    <span className="firefly-village__masonry" />
                    <span className="firefly-village__drainpipe" />
                </div>)}
            </div>
            <div className="firefly-village__grid" role="group"
                aria-label={middleWindowEnabled ? 'Nine delivery windows' : 'Eight delivery windows and a middle balcony'}
                aria-describedby="spatial-practice-help">
                {Array.from({ length: CELL_COUNT }, (_, cell) => {
                    if (cell === MIDDLE_CELL && !middleWindowEnabled) return <MiddleBalcony key={cell} />;
                    const active = phase === 'showing' && activeCell === cell && activeOrder !== null;
                    const delivered = (phase === 'recall' || phase === 'success')
                        && tapFeedback?.cell === cell && tapFeedback.correct;
                    const wrong = phase === 'retry' && wrongCell === cell;
                    return <button key={cell} type="button"
                        ref={(node) => { windowsRef.current[cell] = node; }}
                        className={`firefly-window${active ? ' is-active' : ''}${delivered ? ' is-delivered' : ''}${wrong ? ' is-wrong' : ''}`}
                        disabled={phase !== 'recall'}
                        aria-label={`Position ${cell + 1}, row ${Math.floor(cell / 3) + 1}, column ${cell % 3 + 1}`}
                        onClick={() => onChoose(cell)} onKeyDown={(event) => moveFocus(event, cell)}>
                        <svg className="firefly-window__frame" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
                            <path d="M8 26h10v66H8zm94 0h10v66h-10Z" className="firefly-window__shutters" />
                            <path d="M9 38h7m-7 13h7m-7 13h7m-7 13h7m88-39h7m-7 13h7m-7 13h7m-7 13h7" stroke="#444659" strokeWidth="2" />
                            <rect x="16" y="14" width="88" height="88" rx="10" className="firefly-window__outer" stroke="#34364c" strokeWidth="3" />
                            <rect x="24" y="22" width="72" height="70" rx="4" className="firefly-window__pane" />
                            <path d="M24 22h12l-7 35-5 7m72-42H84l7 35 5 7" className="firefly-window__curtains" />
                            <path d="m38 24 13 0-25 37v-17Z" fill="#c7d1d9" opacity=".09" />
                            <path d="M60 23v67M25 57h70" className="firefly-window__mullions" strokeWidth="5" />
                            <path d="M44 97h32" stroke="#34364c" strokeWidth="5" strokeLinecap="round" />
                            <path d="M10 104h100v7H10Z" fill="#d0b7a0" stroke="#4e495b" strokeWidth="2" strokeLinejoin="round" />
                        </svg>
                        {active && <>
                            <svg className="firefly-window__cue-brackets" viewBox="0 0 120 120" fill="none" aria-hidden="true" focusable="false">
                                <path d="M4 28V7h20m72 0h20v21M4 91v21h20m72 0h20V91" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                            </svg>
                            <FireflyMark className="firefly-window__firefly" />
                            <span className="firefly-window__order" aria-hidden="true">{activeOrder}</span>
                        </>}
                        {delivered && <span key={tapFeedback?.id} className="firefly-window__delivery" aria-hidden="true">
                            <EnvelopeMark /><span className="firefly-window__check">✓</span>
                        </span>}
                        {wrong && <span className="firefly-window__return" aria-hidden="true">×</span>}
                    </button>;
                })}
            </div>
        </div>
        <div className="firefly-village__street" aria-hidden="true">
            <span className="firefly-village__cobbles" />
            <PostOffice />
            <StreetLamp />
            <Planter className="firefly-village__plant firefly-village__plant--left" />
            <Planter className="firefly-village__plant firefly-village__plant--right" />
            <SleepingCat />
            <Courier pose={courierPose} />
        </div>
        <div className="firefly-village__caption">
            <span aria-hidden="true">F I R E F L Y &nbsp; P O S T</span>
            <div className="firefly-village__caption-actions">
                {phase === 'idle' ? (
                    <button type="button" onClick={onNewSequence}>Start route <span aria-hidden="true">→</span></button>
                ) : <>
                    <button type="button" onClick={onNewSequence}>New sequence</button>
                    <button type="button" onClick={onReset}>Stop / reset</button>
                </>}
            </div>
        </div>
    </div>;
}
