import type { ReactNode } from 'react';
import { getImageSrc, type ImageId } from '../../model/imageSet';
import { getAccessiblePositionLabel, getArrangementSize, getPositionLabel } from '../../model/swapping';
import type { SwappingConfig, SwappingToken, TokenIdentity } from '../../model/swapping/types';
import { CargoCoverArt, CargoCrateArt, WagonBaseArt } from './RailwayArt';
import TrackBed, { boardStyle } from './TrackBed';

type BoardBaseProps = {
    config: SwappingConfig;
    highlights?: readonly number[];
    ariaLabel?: string;
};

/** A covered board cannot even receive task tokens or placement feedback. */
export type BoardProps = BoardBaseProps & (
    | { concealed: true; tokens?: never; feedback?: never }
    | {
        concealed?: false;
        tokens: readonly (SwappingToken | undefined)[];
        /** Result-only position feedback; duplicate copies use model identity equivalence. */
        feedback?: readonly boolean[];
    }
);

export function SwappingTokenMark({ token }: { token: TokenIdentity }): ReactNode {
    if (token.kind === 'icon') {
        return <img className="swapping-token__icon" src={getImageSrc(token.value as ImageId)} alt="" aria-hidden="true" />;
    }
    return <span className={`swapping-token__text is-${token.kind}`}>{token.value}</span>;
}

/** Same shape, materials and label treatment for every kind and copy of a token. */
export function CargoMark({ token, topDown = false }: { token: TokenIdentity; topDown?: boolean }) {
    return (
        <span className="swapping-cargo">
            <CargoCrateArt topDown={topDown} />
            <span className="swapping-cargo__mark"><SwappingTokenMark token={token} /></span>
        </span>
    );
}

export default function Board(props: BoardProps) {
    const { config, highlights = [], ariaLabel = 'Swapping board' } = props;
    const size = getArrangementSize(config);
    const highlighted = new Set(highlights);
    return (
        <TrackBed layout={config.layout}>
            <ol className={`swapping-board is-${config.layout === 'sequence' ? 'sequence' : 'grid'}${props.concealed ? ' is-concealed' : ''}`}
                style={boardStyle(config)} aria-label={ariaLabel}>
                {Array.from({ length: size }, (_, index) => {
                    // This is a DOM boundary, not CSS visibility. No cargo mark or
                    // identifying image is constructed in the concealed branch.
                    const token = props.concealed ? undefined : props.tokens[index];
                    const correct = props.concealed ? undefined : props.feedback?.[index];
                    const position = getAccessiblePositionLabel(index, config.layout);
                    const label = props.concealed ? `${position}, covered`
                        : token == null ? `${position}, empty` : `${position}: ${token.label}`;
                    return (
                        <li key={index}
                            className={`swapping-board__slot${highlighted.has(index) ? ' is-highlighted' : ''}${correct == null ? '' : correct ? ' is-correct' : ' is-incorrect'}`}
                            aria-label={`${label}${props.concealed && highlighted.has(index) ? ', affected by this instruction' : ''}${correct == null ? '' : correct ? ', correct' : ', incorrect'}`}>
                            <span className="swapping-board__position" aria-hidden="true">
                                {getPositionLabel(index, config.layout).replace('position ', '')}
                            </span>
                            {props.concealed ? (
                                <span className="swapping-cargo is-covered"><CargoCoverArt topDown={config.layout !== 'sequence'} /></span>
                            ) : token == null ? (
                                <span className="swapping-cargo is-empty"><span className="swapping-board__empty" aria-hidden="true" /></span>
                            ) : <CargoMark token={token} topDown={config.layout !== 'sequence'} />}
                            <WagonBaseArt />
                            {correct != null && <span className="swapping-board__verdict" aria-hidden="true">{correct ? '✓' : '×'}</span>}
                        </li>
                    );
                })}
            </ol>
        </TrackBed>
    );
}
