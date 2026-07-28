import { Howl } from 'howler';
import { ensureAudioReady } from '../audio/unlockAudio';
import { AudioPackId, getSoundSrc, getTokensForPack } from './audioPacks';

export class Speech {
    private readonly pack: AudioPackId;
    private sounds: Map<string, Howl>;

    constructor(pack: AudioPackId = 'letters') {
        this.pack = pack;
        this.sounds = new Map<string, Howl>();
        this.initializeSounds(getTokensForPack(pack));
    }

    public play(token: string) {
        const sound = this.sounds.get(token);
        if (!sound) return;

        // AirPods / iOS: context may be interrupted after route change; resume then play.
        void ensureAudioReady().then(() => {
            sound.play();
        });
    }

    public getSoundSrc(token: string): string[] {
        return getSoundSrc(this.pack, token);
    }

    public get audioPack(): AudioPackId {
        return this.pack;
    }

    private initializeSounds(tokens: readonly string[]) {
        for (const token of tokens) {
            this.sounds.set(
                token,
                new Howl({
                    src: this.getSoundSrc(token),
                    // Short one-shots: HTML5 Audio survives AirPods reconnect better than Web Audio on iOS.
                    html5: true,
                    preload: true,
                })
            );
        }
    }
}
