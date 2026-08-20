import { useRef, useState } from 'react';
import { ALL_MODALITIES, MODALITY_LABELS, type ModeId } from '../../model/modalities';
import {
    buildStatisticsSummary,
    createEmptyStatisticsHistory,
    loadStatisticsHistory,
    type StatisticsModeFilter,
    type StatisticsRound,
} from '../../model/statistics';
import { useModalA11y } from '../../hooks/useModalA11y';
import StatisticsTrendChart from './StatisticsTrendChart';
import './StatisticsPanel.scss';

interface StatisticsPanelProps {
    open: boolean;
    onClose: () => void;
}

const MODE_FILTERS: Array<{ id: StatisticsModeFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'dual', label: 'Dual' },
    { id: 'triple', label: 'Triple' },
    { id: 'quad', label: 'Quad' },
];

const MODE_LABELS: Record<ModeId, string> = {
    dual: 'Dual',
    triple: 'Triple',
    quad: 'Quad',
};

function formatDuration(durationMs: number): string {
    const totalSeconds = Math.round(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatCompletedAt(completedAt: string): string {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(completedAt));
}

function nBackLabel(round: StatisticsRound): string {
    if (round.variableN == null || round.variableN.length === 0) {
        return `${round.nBack}-back`;
    }
    const values = round.variableN.map((entry) => entry.n);
    return `Variable ${Math.min(...values)}–${Math.max(...values)}`;
}

function scoreClass(score: number): string {
    if (score >= 80) return ' is-advance';
    if (score < 50) return ' is-fallback';
    return '';
}

const StatisticsPanel = ({ open, onClose }: StatisticsPanelProps) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const [modeFilter, setModeFilter] = useState<StatisticsModeFilter>('all');
    const history = open ? loadStatisticsHistory() : createEmptyStatisticsHistory();
    const summary = buildStatisticsSummary(history.rounds, modeFilter);

    useModalA11y({
        active: open,
        onEscape: onClose,
        containerRef: panelRef,
        enableTrap: true,
        restoreTarget: '.statistics-trigger',
    });

    return (
        <div className={`statistics-shell${open ? ' is-open' : ''}`} aria-hidden={!open}>
            <button
                type="button"
                className="statistics-backdrop"
                tabIndex={-1}
                aria-label="Dismiss statistics"
                onClick={onClose}
            />
            <div
                ref={panelRef}
                className="statistics-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="statistics-title"
            >
                <header className="statistics-header">
                    <div>
                        <p className="statistics-eyebrow">Training history</p>
                        <h2 id="statistics-title" className="statistics-title">
                            Statistics
                        </h2>
                    </div>
                    <button
                        type="button"
                        className="statistics-close"
                        onClick={onClose}
                        aria-label="Close statistics"
                    >
                        ✕
                    </button>
                </header>

                <div className="statistics-filters" aria-label="Filter statistics by mode">
                    {MODE_FILTERS.map((filter) => (
                        <button
                            key={filter.id}
                            type="button"
                            className={`statistics-filter${modeFilter === filter.id ? ' is-active' : ''}`}
                            aria-pressed={modeFilter === filter.id}
                            onClick={() => setModeFilter(filter.id)}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {summary.totalRounds === 0 ? (
                    <div className="statistics-empty">
                        <span className="statistics-empty-mark" aria-hidden="true">↗</span>
                        <h3>No completed rounds yet</h3>
                        <p>Your daily trend and last 20 rounds will appear here.</p>
                    </div>
                ) : (
                    <div className="statistics-body">
                        <section className="statistics-metrics" aria-label="Overall statistics">
                            <article className="statistics-metric">
                                <span className="statistics-metric-label">Rounds</span>
                                <strong className="statistics-metric-value">{summary.totalRounds}</strong>
                                <span className="statistics-metric-detail">
                                    {summary.today.rounds} today · {formatDuration(summary.today.durationMs)}
                                </span>
                            </article>
                            <article className="statistics-metric">
                                <span className="statistics-metric-label">Average score</span>
                                <strong className="statistics-metric-value">{summary.averageScore}%</strong>
                                <span className="statistics-metric-detail">All recorded rounds</span>
                            </article>
                            <article className="statistics-metric">
                                <span className="statistics-metric-label">20-round average</span>
                                <strong className="statistics-metric-value">
                                    {summary.averageNLast20.toFixed(2)}
                                </strong>
                                <span className="statistics-metric-detail">N-back level</span>
                            </article>
                            <article className="statistics-metric">
                                <span className="statistics-metric-label">Last 24 hours</span>
                                <strong className="statistics-metric-value">
                                    {summary.last24Hours.rounds}
                                </strong>
                                <span className="statistics-metric-detail">
                                    {formatDuration(summary.last24Hours.durationMs)} trained
                                </span>
                            </article>
                        </section>

                        <section className="statistics-section statistics-progress">
                            <div className="statistics-section-heading">
                                <div>
                                    <p className="statistics-section-kicker">Daily progress</p>
                                    <h3>Average and maximum N</h3>
                                </div>
                                <div className="statistics-legend" aria-label="Chart legend">
                                    <span><i className="is-average" />Average</span>
                                    <span><i className="is-maximum" />Maximum</span>
                                </div>
                            </div>
                            <StatisticsTrendChart points={summary.dailyTrend} />
                        </section>

                        <section className="statistics-section">
                            <div className="statistics-section-heading">
                                <div>
                                    <p className="statistics-section-kicker">Last 50 rounds</p>
                                    <h3>Modality averages</h3>
                                </div>
                            </div>
                            <div className="statistics-modalities">
                                {ALL_MODALITIES.flatMap((modality) => {
                                    const score = summary.modalityAverages[modality];
                                    return score == null
                                        ? []
                                        : [
                                              <div key={modality} className="statistics-modality">
                                                  <span>{MODALITY_LABELS[modality]}</span>
                                                  <strong>{score}%</strong>
                                              </div>,
                                          ];
                                })}
                            </div>
                        </section>

                        <section className="statistics-section statistics-history">
                            <div className="statistics-section-heading">
                                <div>
                                    <p className="statistics-section-kicker">Session history</p>
                                    <h3>Last 20 rounds</h3>
                                </div>
                            </div>
                            <div className="statistics-history-list" role="list">
                                {summary.recent.map((round) => (
                                    <article key={round.id} className="statistics-history-row" role="listitem">
                                        <time dateTime={round.completedAt}>
                                            {formatCompletedAt(round.completedAt)}
                                        </time>
                                        <span className="statistics-history-mode">
                                            {MODE_LABELS[round.mode]} {nBackLabel(round)}
                                        </span>
                                        <strong className={`statistics-history-score${scoreClass(round.scorePct)}`}>
                                            {round.scorePct}%
                                        </strong>
                                    </article>
                                ))}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatisticsPanel;
