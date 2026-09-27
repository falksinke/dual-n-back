import { Howl } from 'howler';
import { ensureAudioReady, isAudioSuspendedForBackground } from '../../audio/unlockAudio';

type Cue = 'item' | 'press' | 'success' | 'failure';
type FeedbackCue = Exclude<Cue, 'item' | 'press'>;
const NOTES: Record<FeedbackCue, string> = { success: 'a4', failure: 'c4' };

/** Short, neutral item cues: pitch never encodes the spatial answer. */
export class PracticeSounds {
    private readonly sounds = new Map<Cue, Howl>([
        ['item', new Howl({
            src: ['/assets/sounds/ui/stimulus-bleep.wav'],
            html5: true,
            preload: true,
            volume: 0.8,
        })],
        ['press', new Howl({
            src: ['/assets/sounds/ui/response-bleep.wav'],
            html5: true,
            preload: true,
            volume: 0.8,
        })],
        ...(Object.entries(NOTES) as Array<[FeedbackCue, string]>).map(([cue, note]): [Cue, Howl] => [cue, new Howl({
            src: [`${import.meta.env.BASE_URL}assets/sounds/piano/${note}.wav`],
            preload: true,
            volume: 0.4,
            sprite: { cue: [0, 280] },
        })]),
    ]);

    play(cue: Cue): void {
        void ensureAudioReady();
        if (isAudioSuspendedForBackground()) return;
        const sound = this.sounds.get(cue);
        sound?.stop();
        if (cue === 'item' || cue === 'press') sound?.play();
        else sound?.play('cue');
    }

    stop(): void {
        this.sounds.forEach((sound) => sound.stop());
    }

    dispose(): void {
        this.sounds.forEach((sound) => sound.unload());
    }
}
