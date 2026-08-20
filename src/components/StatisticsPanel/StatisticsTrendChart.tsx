import type { StatisticsDailyPoint } from '../../model/statistics';

interface StatisticsTrendChartProps {
    points: StatisticsDailyPoint[];
}

const WIDTH = 640;
const HEIGHT = 220;
const PLOT = { left: 44, right: 20, top: 20, bottom: 34 };

function pathFor(values: number[], minimum: number, maximum: number): string {
    const width = WIDTH - PLOT.left - PLOT.right;
    const height = HEIGHT - PLOT.top - PLOT.bottom;
    return values
        .map((value, index) => {
            const x = PLOT.left + (index / Math.max(1, values.length - 1)) * width;
            const y = PLOT.top + ((maximum - value) / Math.max(0.25, maximum - minimum)) * height;
            return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ');
}

function shortDay(dayKey: string): string {
    return dayKey.slice(5).replace('-', '/');
}

const StatisticsTrendChart = ({ points }: StatisticsTrendChartProps) => {
    const visible = points.slice(-30);
    if (visible.length < 2) {
        return (
            <div className="statistics-chart-empty">
                Two training days are needed for the progress graph.
            </div>
        );
    }

    const values = visible.flatMap((point) => [point.averageN, point.maximumN]);
    const minimum = Math.floor(Math.min(...values) * 2) / 2;
    const maximum = Math.max(minimum + 0.5, Math.ceil(Math.max(...values) * 2) / 2);
    const gridValues = Array.from({ length: 5 }, (_, index) =>
        minimum + ((maximum - minimum) * index) / 4
    );
    const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
    const plotWidth = WIDTH - PLOT.left - PLOT.right;

    return (
        <svg
            className="statistics-chart"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label="Daily N-back progress"
        >
            {gridValues.map((value) => {
                const y = PLOT.top + ((maximum - value) / (maximum - minimum)) * plotHeight;
                return (
                    <g key={value}>
                        <line
                            className="statistics-chart-grid"
                            x1={PLOT.left}
                            x2={PLOT.left + plotWidth}
                            y1={y}
                            y2={y}
                        />
                        <text className="statistics-chart-axis-label" x={PLOT.left - 8} y={y + 4}>
                            {value.toFixed(1)}
                        </text>
                    </g>
                );
            })}
            <path
                className="statistics-chart-line statistics-chart-line--average"
                d={pathFor(
                    visible.map((point) => point.averageN),
                    minimum,
                    maximum
                )}
            />
            <path
                className="statistics-chart-line statistics-chart-line--maximum"
                d={pathFor(
                    visible.map((point) => point.maximumN),
                    minimum,
                    maximum
                )}
            />
            {visible.map((point, index) => {
                if (index !== 0 && index !== visible.length - 1) return null;
                const x = PLOT.left + (index / (visible.length - 1)) * plotWidth;
                return (
                    <text
                        key={point.dayKey}
                        className="statistics-chart-date"
                        x={x}
                        y={HEIGHT - 8}
                        textAnchor={index === 0 ? 'start' : 'end'}
                    >
                        {shortDay(point.dayKey)}
                    </text>
                );
            })}
        </svg>
    );
};

export default StatisticsTrendChart;
