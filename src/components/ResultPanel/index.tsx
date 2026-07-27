import './ResultPanel.scss';
import { GameResult } from '../../model/GameResult';
import { ModalityId } from '../../model/modalities';

interface ResultPanelProps {
    result: GameResult;
}

export const ResultPanel = ({ result }: ResultPanelProps) => {
    if (result == null) return null;

    const modalities = result.modalities;

    const totalSuccess = modalities.reduce(
        (sum, m) => sum + (result.recaps[m]?.success ?? 0),
        0
    );
    const totalFailed = modalities.reduce(
        (sum, m) => sum + (result.recaps[m]?.failed ?? 0),
        0
    );

    return (
        <div className="result-panel">
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
        </div>
    );
};
