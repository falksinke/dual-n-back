import { Game, ResultMatch } from '../model/Game';
import { BoardState } from '../model/types';
import { GameResult } from '../model/GameResult';
import { ButtonState } from '../model/enums/buttonState';
import { ModalityId } from '../model/modalities';
import { GameStore } from './gameStore';
import { clearStimulusTimers, presentBoardStimulus } from './stimulusPresentation';

type StoreGetter = () => GameStore;
type StoreSetter = (
    partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)
) => void;

let buttonTimeout: ReturnType<typeof setTimeout> | null = null;
/** performance.now() when scored colors were last applied — used to avoid wiping them on a same-turn next onset. */
let lastScoreAtMs = 0;

const clearButtonTimeout = () => {
    if (buttonTimeout !== null) {
        clearTimeout(buttonTimeout);
        buttonTimeout = null;
    }
};

const resetButtons = (
    setStore: StoreSetter,
    modalities: ModalityId[]
): void => {
    setStore({
        btns: Object.fromEntries(
            modalities.map((m) => [m, ButtonState.None])
        ) as Partial<Record<ModalityId, `${ButtonState}`>>,
    });
};

const scheduleButtonClear = (getStore: StoreGetter, setStore: StoreSetter): void => {
    clearButtonTimeout();
    buttonTimeout = setTimeout(() => {
        resetButtons(setStore, getStore().activeModalities);
        buttonTimeout = null;
    }, 500);
};

const defaultBoardReset = {
    positionIndex: -1,
    audioToken: null,
    colorId: null,
    imageId: null,
    currentTrials: -1,
    nForTrial: -1,
    stimulusEpoch: 0,
};

export class GameSession extends Game {
    private getStore: StoreGetter;
    private setStore: StoreSetter;

    constructor(getStore: StoreGetter, setStore: StoreSetter) {
        const store = getStore();
        const settings = store.settings;
        super(
            settings.level,
            settings.trials,
            settings.isiMin,
            settings.isiMax,
            (boardState) => GameSession.onBoardStateChange(getStore, setStore, boardState),
            (match) => GameSession.onPlayerChoiceValidated(getStore, setStore, match),
            (gameResult) => GameSession.onGameEnded(getStore, setStore, gameResult),
            {
                allowCenterStimulus: settings.allowCenterStimulus,
                mode: settings.mode,
                modalities: store.blockModalities ?? undefined,
                interferenceChance: settings.interferenceChance,
                variableN: settings.variableN,
                audioPack: settings.audioPack,
                lureStage: settings.lureStage,
                useBlockQuotas:
                    settings.useBlockQuotas && settings.lureStage != null ? true : undefined,
            }
        );
        this.getStore = getStore;
        this.setStore = setStore;
    }

    public begin(): void {
        if (this.getStore().settings.useFullScreen) {
            document.body.requestFullscreen?.().catch(() => undefined);
        }
        void this.start();
    }

    public cancel(): void {
        if (this.getStore().settings.useFullScreen && document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => undefined);
        }
        clearStimulusTimers();
        clearButtonTimeout();
        this.stop();
        this.setStore({
            game: null,
            boardState: defaultBoardReset,
        });
    }

    public selectModality(modality: ModalityId): void {
        if (!this.isGameInProgress) return;
        this.addChoice(modality);
        this.getStore().setButtonState(modality, ButtonState.Pressed);
    }

    private static onBoardStateChange = (
        getStore: StoreGetter,
        setStore: StoreSetter,
        boardState: BoardState
    ) => {
        // Drop leftover colors from the previous trial so they don't bleed into a
        // short-ISI next onset — unless scoring and this onset share the same turn
        // (response window === sampled ISI), where feedback must remain visible.
        const scoredThisTurn = lastScoreAtMs > 0 && performance.now() - lastScoreAtMs < 32;
        if (!scoredThisTurn) {
            clearButtonTimeout();
            resetButtons(setStore, getStore().activeModalities);
        }
        presentBoardStimulus(getStore, setStore, boardState);
    };

    private static onPlayerChoiceValidated = (
        getStore: StoreGetter,
        setStore: StoreSetter,
        match: ResultMatch
    ) => {
        clearButtonTimeout();
        const modalities = getStore().activeModalities;
        const btns: Partial<Record<ModalityId, `${ButtonState}`>> = {};
        for (const modality of modalities) {
            const result = match[modality];
            btns[modality] = result
                ? result === 'success'
                    ? ButtonState.Success
                    : ButtonState.Error
                : ButtonState.None;
        }
        setStore({ btns });
        lastScoreAtMs = performance.now();
        scheduleButtonClear(getStore, setStore);
    };

    private static onGameEnded = (
        getStore: StoreGetter,
        _setStore: StoreSetter,
        gameResult: GameResult
    ) => {
        if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => undefined);
        }
        clearStimulusTimers();
        clearButtonTimeout();
        getStore().pushGameResult(gameResult);
    };
}
