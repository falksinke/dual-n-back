import { ModalityId } from './modalities';

export class Match {
    private readonly claims: Record<ModalityId, boolean>;

    constructor(modalities: ModalityId[]) {
        this.claims = {} as Record<ModalityId, boolean>;
        for (const modality of modalities) {
            this.claims[modality] = false;
        }
    }

    public claim(modality: ModalityId): void {
        if (modality in this.claims) {
            this.claims[modality] = true;
        }
    }

    public isClaimed(modality: ModalityId): boolean {
        return this.claims[modality] ?? false;
    }
}
