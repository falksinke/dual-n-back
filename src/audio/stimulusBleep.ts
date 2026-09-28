import { Howl } from 'howler';
import { ensureAudioReady, isAudioSuspendedForBackground } from './unlockAudio';

const stimulusBleep = new Howl({
    src: ['/assets/sounds/ui/stimulus-bleep.wav'],
    html5: true,
    preload: true,
    volume: 0.8,
});

/** A short, neutral onset cue for non-audio Single N-back streams. */
export function playStimulusBleep(): void {
    void ensureAudioReady().then(() => {
        if (isAudioSuspendedForBackground()) return;
        stimulusBleep.stop();
        stimulusBleep.play();
    });
}
