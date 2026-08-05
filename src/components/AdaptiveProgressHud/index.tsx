import { useRef } from 'react';
import {
    adaptiveConditionCode,
    adaptivePhaseLabel,
    matchConditionCode,
    matchProgressFlavor,
    progressLevelFlavor,
} from '../adaptiveDisplay';
import { CURRICULUM_MAX_N, CURRICULUM_MIN_N } from '../../model/adaptiveCurriculum';
import { maxLevelIndex } from '../../model/adaptiveLevels';
import type {
    CurriculumModeLadderSnapshot,
    MatchLadderSnapshot,
} from '../../model/ladderPersistence';
import { AdaptiveSessionState } from '../../store/adaptiveSession';
import { useGameStore } from '../../store/gameStore';
import { useHapticsEnabled } from '../../haptics/HapticsEnabledContext';
import {
    hasSwitchInputSupport,
    isIOS,
    markIosSwitchGesture,
} from '../../haptics/haptics';
import './AdaptiveProgressHud.scss';

type AdaptiveProgressHudProps =
    | {
          path: 'cyclic';
          ladder: CurriculumModeLadderSnapshot;
          session: AdaptiveSessionState | null;
      }
    | {
          path: 'adaptive';
          ladder: MatchLadderSnapshot;
          session: AdaptiveSessionState | null;
      };

interface LadderStepButtonProps {
    label: string;
    disabled: boolean;
    onStep: () => void;
    children: string;
}

const LadderStepButton = ({ label, disabled, onStep, children }: LadderStepButtonProps) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const hapticsEnabled = useHapticsEnabled();
    const useIosSwitch =
        hapticsEnabled && !disabled && isIOS() && hasSwitchInputSupport();

    return (
        <div className="adaptive-hud-step-host haptic-host">
            <button
                ref={buttonRef}
                type="button"
                className="adaptive-hud-step"
                data-haptic="light"
                aria-label={label}
                disabled={disabled}
                onClick={onStep}
            >
                {children}
            </button>
            {useIosSwitch && (
                <input
                    type="checkbox"
                    className="ios-haptic-switch"
                    aria-hidden="true"
                    tabIndex={-1}
                    ref={(node) => {
                        if (node) node.setAttribute('switch', '');
                    }}
                    onChange={(event) => {
                        event.currentTarget.checked = false;
                        const button = buttonRef.current;
                        if (button) markIosSwitchGesture(button);
                        if (!disabled) onStep();
                    }}
                />
            )}
        </div>
    );
};

const AdaptiveProgressHud = (props: AdaptiveProgressHudProps) => {
    const { path, ladder, session } = props;
    const phase =
        session != null && session.phase !== 'idle'
            ? adaptivePhaseLabel(session.phase, path)
            : 'Ready';
    const code =
        path === 'cyclic' ? adaptiveConditionCode(ladder) : matchConditionCode(ladder);
    const flavor =
        path === 'cyclic' ? progressLevelFlavor(ladder) : matchProgressFlavor(ladder);
    const decreaseLadderStep = useGameStore((state) => state.decreaseLadderStep);
    const increaseLadderStep = useGameStore((state) => state.increaseLadderStep);
    const busy = useGameStore(
        (state) => state.game !== null || state.countdown !== null
    );
    const atMin =
        path === 'cyclic'
            ? ladder.track === 'fixed' &&
              ladder.n <= CURRICULUM_MIN_N &&
              (ladder.stage === 'teach_walkthrough' || ladder.stage === 'teach_decide')
            : ladder.levelIndex <= 0;
    const atMax =
        path === 'cyclic'
            ? ladder.track === 'flexible' &&
              ladder.n >= CURRICULUM_MAX_N &&
              ladder.stage === 'flex_mastery'
            : ladder.levelIndex >= maxLevelIndex();

    return (
        <div
            className="adaptive-hud"
            aria-live="polite"
            aria-label={`${path === 'cyclic' ? 'Cyclic' : 'Adaptive'} condition ${code}, ${flavor}`}
        >
            <div className="adaptive-hud-row">
                <LadderStepButton
                    label="Decrease ladder step"
                    disabled={busy || atMin}
                    onStep={decreaseLadderStep}
                >
                    ‹
                </LadderStepButton>

                <span className="adaptive-hud-code">{code}</span>

                <LadderStepButton
                    label="Increase ladder step"
                    disabled={busy || atMax}
                    onStep={increaseLadderStep}
                >
                    ›
                </LadderStepButton>
            </div>
            <div className="adaptive-hud-meta">
                <span className="adaptive-hud-phase">{phase}</span>
                <span className="adaptive-hud-flavor">{flavor}</span>
                {ladder.failStreak > 0 && (
                    <span className="adaptive-hud-fails">Fails {ladder.failStreak}</span>
                )}
            </div>
        </div>
    );
};

export default AdaptiveProgressHud;
