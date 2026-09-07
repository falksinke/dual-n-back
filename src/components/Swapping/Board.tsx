import type { CSSProperties, ReactNode } from 'react';
import { getImageSrc, type ImageId } from '../../model/imageSet';
import {
    GRID_DIMENSIONS,
    getAccessiblePositionLabel,
    getArrangementSize,
    getPositionLabel,
} from '../../model/swapping';
import type { SwappingConfig, SwappingToken, TokenIdentity } from '../../model/swapping/types';

export interface BoardProps {
    config: SwappingConfig;
    tokens: readonly (SwappingToken | undefined)[];
    highlights?: readonly number[];
    ariaLabel?: string;
}

export function SwappingTokenMark({ token }: { token: TokenIdentity }): ReactNode {
    if (token.kind === 'icon') {
        return (
            <img
                className="swapping-token__icon"
                src={getImageSrc(token.value as ImageId)}
                alt=""
                aria-hidden="true"
            />
        );
    }

    return <span className={`swapping-token__text is-${token.kind}`}>{token.value}</span>;
}

export default function Board({
    config,
    tokens,
    highlights = [],
    ariaLabel = 'Swapping board',
}: BoardProps) {
    const size = getArrangementSize(config);
    const columns =
        config.layout === 'sequence'
            ? Math.min(size, 6)
            : GRID_DIMENSIONS[config.layout].columns;
    const mobileColumns = config.layout === 'sequence' ? Math.min(size, 4) : columns;
    const highlighted = new Set(highlights);

    return (
        <ol
            className={`swapping-board is-${config.layout === 'sequence' ? 'sequence' : 'grid'}`}
            style={{
                '--swapping-columns': columns,
                '--swapping-mobile-columns': mobileColumns,
            } as CSSProperties}
            aria-label={ariaLabel}
        >
            {Array.from({ length: size }, (_, index) => {
                const token = tokens[index];
                const accessiblePosition = getAccessiblePositionLabel(index, config.layout);
                return (
                    <li
                        className={`swapping-board__slot${highlighted.has(index) ? ' is-highlighted' : ''}`}
                        key={index}
                        aria-label={
                            token == null
                                ? `${accessiblePosition}, empty`
                                : `${accessiblePosition}: ${token.label}`
                        }
                    >
                        <span className="swapping-board__position" aria-hidden="true">
                            {getPositionLabel(index, config.layout).replace('position ', '')}
                        </span>
                        {token == null ? (
                            <span className="swapping-board__empty" aria-hidden="true" />
                        ) : (
                            <SwappingTokenMark token={token} />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
