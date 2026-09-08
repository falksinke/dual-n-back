import type { ReactNode } from 'react';
import {
    PlatformCatArt,
    ScenicTrainArt,
    StationBackdrop,
    StationmasterArt,
    type RailwayMood,
} from './RailwayArt';

const sceneCaptions: Record<RailwayMood, string> = {
    dispatch: 'Awaiting dispatch',
    memorise: 'Cargo inspection',
    sealed: 'Cargo sealed',
    unload: 'Unloading time',
    success: 'Clear to depart',
    review: 'Checking the manifest',
    paused: 'Tea break',
    audio: 'Receiving by radio',
    error: 'Radio on hold',
};

/**
 * Scenery accepts only a public mood and already-projected children. It has no
 * access to the controller, tokens, instructions, random source or answer key.
 * Even the departing train is fixed, unmarked scenery, never the task wagons.
 */
export default function RailwayScene({ mood, children, message }: {
    mood: RailwayMood;
    children?: ReactNode;
    message: string;
}) {
    return (
        <div className={`swapping-scene is-${mood}`}>
            <div className="swapping-scene__panorama" aria-hidden="true">
                <StationBackdrop mood={mood} />
                {mood !== 'paused' && <ScenicTrainArt />}
            </div>
            <div className="swapping-scene__sign" aria-hidden="true">
                <span>Northline goods station</span>
                <span><i />{sceneCaptions[mood]}</span>
            </div>
            {children && <div className="swapping-scene__stage">{children}</div>}
            <div className="swapping-scene__platform">
                <StationmasterArt mood={mood} />
                <p className="swapping-scene__message">{message}</p>
                <PlatformCatArt awake={mood === 'review' || mood === 'error'} />
            </div>
        </div>
    );
}
