import './ResultPanel.scss';
import type { CSSProperties } from 'react';
import { GameResult } from '../../model/GameResult';
import { ModalityId } from '../../model/modalities';
import { useGameStore } from '../../store/gameStore';
import {
    blockRoleLabel,
    controllerActionHint,
    formatSdtMetric,
} from '../adaptiveDisplay';
import SessionPrimaryButton from '../SessionPrimaryButton';

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

    const nBackDistribution = result.nBackDistribution;
    const nBackTotal =
        nBackDistribution?.reduce((sum, entry) => sum + entry.trials, 0) ?? 0;

    const sdtRows: Array<{
        label: string;
        getValue: (modality: ModalityId) => string | number;
    }> = sdt
        ? [
              {
                  label: 'd′ clean',
                  getValue: (modality) =>
                      formatSdtMetric(sdt.byModality[modality]?.clean.dPrime ?? Number.NaN),
              },
              {
                  label: 'd′ lure',
                  getValue: (modality) =>
                      formatSdtMetric(sdt.byModality[modality]?.lure.dPrime ?? Number.NaN),
              },
              {
                  label: 'd′ all',
                  getValue: (modality) =>
                      formatSdtMetric(sdt.byModality[modality]?.all.dPrime ?? Number.NaN),
              },
              {
                  label: 'c',
                  getValue: (modality) =>
                      formatSdtMetric(sdt.byModality[modality]?.all.criterion ?? Number.NaN),
              },
              {
                  label: 'Hits',
                  getValue: (modality) => sdt.byModality[modality]?.all.counts.hits ?? 0,
              },
              {
                  label: 'FAs',
                  getValue: (modality) =>
                      sdt.byModality[modality]?.all.counts.falseAlarms ?? 0,
              },
              {
                  label: 'Misses',
                  getValue: (modality) => sdt.byModality[modality]?.all.counts.misses ?? 0,
              },
              {
                  label: 'Lure cost',
                  getValue: (modality) =>
                      formatSdtMetric(sdt.byModality[modality]?.lureCost ?? Number.NaN),
              },
          ]
        : [];

    return (
        <div
            className={`result-panel${pendingContinue ? ' result-panel--interstitial' : ''}`}
            data-modality-count={modalities.length}
            style={
                {
                    '--result-modality-count': modalities.length,
                } as CSSProperties
            }
        >
            {blockLabel && <p className="result-block-role">{blockLabel}</p>}

            <header className="result-overall">
                <span className="result-overall-label">Match</span>
                <span className="result-overall-value">{result.generalMatchPercentage}%</span>
                <span className="result-overall-counts">
                    {totalSuccess} hit · {totalFailed} miss
                </span>
            </header>

            <div className="result-modality-grid">
                {modalities.map((modality) => (
                    <article key={modality} className="result-modality-card">
                        <h3 className="result-modality-title">
                            {result.getModalityLabel(modality)}
                        </h3>
                        <p className="result-modality-pct">
                            {result.getMatchPercentage(modality)}%
                        </p>
                        <dl className="result-modality-stats">
                            <div>
                                <dt>Matches</dt>
                                <dd>{result.recaps[modality]?.success ?? 0}</dd>
                            </div>
                            <div>
                                <dt>Misses</dt>
                                <dd>{result.recaps[modality]?.failed ?? 0}</dd>
                            </div>
                        </dl>
                    </article>
                ))}
            </div>

            {nBackDistribution != null && nBackDistribution.length > 0 && (
                <section className="result-nback" aria-label="Variable N distribution">
                    <p className="result-section-label">Variable N</p>
                    <ul className="result-nback-list">
                        {nBackDistribution.map((entry) => {
                            const pct =
                                nBackTotal > 0
                                    ? Math.round((entry.trials / nBackTotal) * 1000) / 10
                                    : 0;
                            return (
                                <li key={entry.n} className="result-nback-row">
                                    <span className="result-nback-label">{entry.n}-back</span>
                                    <span className="result-nback-bar" aria-hidden="true">
                                        <span
                                            className="result-nback-fill"
                                            style={{ width: `${Math.min(100, pct)}%` }}
                                        />
                                    </span>
                                    <span className="result-nback-count">
                                        {entry.trials}
                                        <span className="result-nback-pct"> · {pct}%</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {sdt && (
                <section className="result-sdt" aria-label="Signal detection">
                    <p className="result-section-label">Signal detection</p>
                    <div className="result-sdt-scroll">
                        <div
                            className="result-sdt-table"
                            role="table"
                            aria-label="Signal detection by modality"
                        >
                            <div className="result-sdt-row result-sdt-head" role="row">
                                <div className="result-sdt-cell result-sdt-sticky" role="columnheader">
                                    Metric
                                </div>
                                {modalities.map((modality) => (
                                    <div
                                        key={modality}
                                        className="result-sdt-cell"
                                        role="columnheader"
                                    >
                                        {result.getModalityLabel(modality)}
                                    </div>
                                ))}
                            </div>
                            {sdtRows.map((row) => (
                                <div key={row.label} className="result-sdt-row" role="row">
                                    <div
                                        className="result-sdt-cell result-sdt-sticky result-sdt-metric"
                                        role="rowheader"
                                    >
                                        {row.label}
                                    </div>
                                    {modalities.map((modality) => (
                                        <div
                                            key={modality}
                                            className="result-sdt-cell"
                                            role="cell"
                                        >
                                            {row.getValue(modality)}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {nextHint && <p className="result-next-hint">{nextHint}</p>}
            <div className="result-continue-actions">
                <SessionPrimaryButton label={pendingContinue ? 'Continue' : 'Start'} />
            </div>
        </div>
    );
};
