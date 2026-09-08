import type { ReactNode } from 'react';
import GreenhouseArtwork from './art/GreenhouseArtwork';
import KeeperArtwork from './art/KeeperArtwork';

interface GreenhouseProps {
    readonly children?: ReactNode;
    /** Only untimed setup enables keeper motion. The scenery has no task inputs. */
    readonly welcome?: boolean;
}

export default function Greenhouse({ children, welcome = false }: GreenhouseProps) {
    return (
        <div className={`moth-greenhouse${welcome ? ' is-welcome' : ''}`}>
            <GreenhouseArtwork />
            <div className="moth-greenhouse__keeper" aria-hidden="true"><KeeperArtwork /></div>
            {children}
        </div>
    );
}
