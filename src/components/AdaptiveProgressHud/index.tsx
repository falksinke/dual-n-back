import { LURE_STAGES, LureStageId } from '../../model/lureStages';
import {
    adaptiveBlockProgress,
    adaptiveConditionCode,
    adaptivePhaseLabel,
    lureStageFlavor,
} from '../adaptiveDisplay';
import { AdaptiveSessionState } from '../../store/adaptiveSession';
import './AdaptiveProgressHud.scss';

interface AdaptiveProgressHudProps {
    n: number;
    lureStage: LureStageId;
    session: AdaptiveSessionState | null;
}

const AdaptiveProgressHud = ({ n, lureStage, session }: AdaptiveProgressHudProps) => {
    const stageIndex = LURE_STAGES.indexOf(lureStage);
    const phase =
        session != null && session.phase !== 'idle' ? adaptivePhaseLabel(session.phase) : 'Ready';
    const blocks = adaptiveBlockProgress(session);
    const code = adaptiveConditionCode(n, lureStage);

    return (
        <div
            className="adaptive-hud"
            aria-live="polite"
            aria-label={`Adaptive condition ${code}, ${lureStageFlavor(lureStage)}`}
        >
            <div className="adaptive-hud-top">
                <span className="adaptive-hud-code">{code}</span>
                <div className="adaptive-hud-meta">
                    <span className="adaptive-hud-flavor">{lureStageFlavor(lureStage)}</span>
                    <span className="adaptive-hud-phase">{phase}</span>
                </div>
            </div>

            <div className="adaptive-hud-stages" role="list" aria-label="Lure stages">
                {LURE_STAGES.map((stage, index) => {
                    const cleared = index < stageIndex;
                    const current = index === stageIndex;
                    return (
                        <div
                            key={stage}
                            role="listitem"
                            className={`adaptive-hud-stage${cleared ? ' is-cleared' : ''}${
                                current ? ' is-current' : ''
                            }`}
                            aria-current={current ? 'step' : undefined}
                        >
                            <span className="adaptive-hud-stage-mark" />
                            <span className="adaptive-hud-stage-letter">{stage}</span>
                        </div>
                    );
                })}
            </div>

            {blocks != null && (
                <div className="adaptive-hud-blocks">
                    <span className="adaptive-hud-blocks-label">Blocks</span>
                    <div className="adaptive-hud-blocks-track" aria-hidden="true">
                        {Array.from({ length: blocks.target }, (_, i) => (
                            <span
                                key={i}
                                className={`adaptive-hud-block-tick${
                                    i < blocks.done ? ' is-done' : ''
                                }`}
                            />
                        ))}
                    </div>
                    <span className="adaptive-hud-block-count">
                        {blocks.done}/{blocks.target}
                    </span>
                </div>
            )}
        </div>
    );
};

export default AdaptiveProgressHud;
