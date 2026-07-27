import { MatchRecap } from './GameHistory';
import { ModalityId, MODALITY_LABELS } from './modalities';
import { BlockSdtReport } from './sdtMetrics';

export class GameResult {
    public readonly recaps: Record<ModalityId, MatchRecap>;
    public readonly modalities: ModalityId[];
    public readonly sdt: BlockSdtReport | null;

    constructor(
        recaps: Record<ModalityId, MatchRecap>,
        modalities: ModalityId[],
        sdt: BlockSdtReport | null = null
    ) {
        this.recaps = recaps;
        this.modalities = modalities;
        this.sdt = sdt;
    }

    /** @deprecated Use recaps.audio — kept for dual-mode compatibility. */
    public get audioRecap(): MatchRecap {
        return this.recaps.audio ?? { success: 0, failed: 0 };
    }

    /** @deprecated Use recaps.position — kept for dual-mode compatibility. */
    public get positionRecap(): MatchRecap {
        return this.recaps.position ?? { success: 0, failed: 0 };
    }

    public get audioCount(): number {
        return this.audioRecap.success + this.audioRecap.failed;
    }

    public get positionCount(): number {
        return this.positionRecap.success + this.positionRecap.failed;
    }

    public getMatchPercentage(modality: ModalityId): number {
        const recap = this.recaps[modality] ?? { success: 0, failed: 0 };
        const count = recap.success + recap.failed;
        if (count === 0) return 0;
        return Math.round((recap.success / count) * 1000) / 10;
    }

    public get audioMatchPercentage(): number {
        return this.getMatchPercentage('audio');
    }

    public get positionMatchPercentage(): number {
        return this.getMatchPercentage('position');
    }

    public get generalMatchPercentage(): number {
        let success = 0;
        let total = 0;
        for (const modality of this.modalities) {
            const recap = this.recaps[modality] ?? { success: 0, failed: 0 };
            success += recap.success;
            total += recap.success + recap.failed;
        }
        if (total === 0) return 0;
        return Math.round((success / total) * 1000) / 10;
    }

    public get audioMissCount(): number {
        return this.audioRecap.failed;
    }

    public get positionMissCount(): number {
        return this.positionRecap.failed;
    }

    public getModalityLabel(modality: ModalityId): string {
        return MODALITY_LABELS[modality];
    }
}
