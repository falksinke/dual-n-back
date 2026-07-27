import './ResultPanel.scss';
import { GameResult } from '../../model/GameResult';
import { ModalityId } from '../../model/modalities';
import { useGameStore } from '../../store/gameStore';
import {
    blockRoleLabel,
    controllerActionHint,
    formatSdtMetric,
} from '../adaptiveDisplay';

interface ResultPanelProps {
    result: GameResult;
}

export const ResultPanel = ({ result }: ResultPanelProps) => {
    const lastBlockRole = useGameStore((state) => state.lastBlockRole);
    const lastControllerAction = useGameStore((state) => state.lastControllerAction);
    const pendingContinue = useGameStore((state) => state.adaptiveSession?.pendingContinue === true);

    if (result == null) return null;

    const modalities = result.modalities;
    const sdt = result.sdt;
    const blockLabel = blockRoleLabel(lastBlockRole);
    const nextHint = controllerActionHint(lastControllerAction);

    const totalSuccess = modalities.reduce(
        (sum, m) => sum + (result.recaps[m]?.success ?? 0),
        0
    );
    const totalFailed = modalities.reduce(
        (sum, m) => sum + (result.recaps[m]?.failed ?? 0),
        0
    );

    const renderSdtRow = (
        label: string,
        getValue: (modality: ModalityId) => string | number
    ) => (
        <div className="row">
            <div className="cell left">{label}</div>
            {modalities.map((modality) => (
                <div key={modality} className="cell label">
                    {getValue(modality)}
                </div>
            ))}
            <div className="cell label" />
        </div>
    );

    return (
        <div className="result-panel">
            {blockLabel && (
                <p className="result-block-role">{blockLabel}</p>
            )}

            <div className="row">
                <div className="cell" />
                {modalities.map((modality) => (
                    <div key={modality} className="cell label">
                        {result.getModalityLabel(modality)}
                    </div>
                ))}
                <div className="cell label">Total</div>
            </div>
            <div className="row">
                <div className="cell left">Matches: </div>
                {modalities.map((modality) => (
                    <div key={modality} className="cell label">
                        {result.recaps[modality]?.success ?? 0}
                    </div>
                ))}
                <div className="cell label">{totalSuccess}</div>
            </div>
            <div className="row">
                <div className="cell left">Misses: </div>
                {modalities.map((modality) => (
                    <div key={modality} className="cell label">
                        {result.recaps[modality]?.failed ?? 0}
                    </div>
                ))}
                <div className="cell label">{totalFailed}</div>
            </div>
            <div className="row">
                <div className="cell" />
                {modalities.map((modality) => (
                    <div key={modality} className="cell label">
                        {result.getMatchPercentage(modality)}%
                    </div>
                ))}
                <div className="cell label bold" style={{ color: 'var(--primary)' }}>
                    {result.generalMatchPercentage}%
                </div>
            </div>

            {sdt && (
                <div className="result-sdt">
                    <p className="result-section-label">Signal detection</p>
                    {renderSdtRow('d′ clean', (modality) =>
                        formatSdtMetric(sdt.byModality[modality]?.clean.dPrime ?? Number.NaN)
                    )}
                    {renderSdtRow('d′ lure', (modality) =>
                        formatSdtMetric(sdt.byModality[modality]?.lure.dPrime ?? Number.NaN)
                    )}
                    {renderSdtRow('d′ all', (modality) =>
                        formatSdtMetric(sdt.byModality[modality]?.all.dPrime ?? Number.NaN)
                    )}
                    {renderSdtRow('c', (modality) =>
                        formatSdtMetric(sdt.byModality[modality]?.all.criterion ?? Number.NaN)
                    )}
                    {renderSdtRow('Hits', (modality) =>
                        sdt.byModality[modality]?.all.counts.hits ?? 0
                    )}
                    {renderSdtRow('FAs', (modality) =>
                        sdt.byModality[modality]?.all.counts.falseAlarms ?? 0
                    )}
                    {renderSdtRow('Misses', (modality) =>
                        sdt.byModality[modality]?.all.counts.misses ?? 0
                    )}
                    {renderSdtRow('Lure cost', (modality) =>
                        formatSdtMetric(sdt.byModality[modality]?.lureCost ?? Number.NaN)
                    )}
                </div>
            )}

            {nextHint && <p className="result-next-hint">{nextHint}</p>}
            {pendingContinue && (
                <p className="result-continue-hint">
                    Press <kbd className="key-space">Space</kbd> to continue
                </p>
            )}
        </div>
    );
};
