import { Howl } from 'howler';
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
        this.sounds.get(token)?.play();
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
                })
            );
        }
    }
}
