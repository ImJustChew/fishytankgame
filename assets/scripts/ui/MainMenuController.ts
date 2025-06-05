import { _decorator, Component, Button, director } from 'cc';
import { LotteryManager } from '../lottery/LotteryManager';
import { AvatarCollectionDisplay } from '../lottery/AvatarCollectionDisplay';

const { ccclass, property } = _decorator;

@ccclass('MainMenuController')
export class MainMenuController extends Component {
    @property(Button)
    lotteryButton: Button = null!;

    @property(Button)
    collectionButton: Button = null!;

    @property(LotteryManager)
    lotteryManager: LotteryManager = null!;

    @property(AvatarCollectionDisplay)
    collectionDisplay: AvatarCollectionDisplay = null!;

    start() {
        this.setupButtons();
    }

    private setupButtons() {
        if (this.lotteryButton) {
            this.lotteryButton.node.on('click', this.onLotteryButtonClicked, this);
        }

        if (this.collectionButton) {
            this.collectionButton.node.on('click', this.onCollectionButtonClicked, this);
        }
    } private onLotteryButtonClicked() {
        console.log('[MainMenuController] Navigating to lottery scene...');
        director.loadScene('avatarlottery');
    }

    private onCollectionButtonClicked() {
        if (this.collectionDisplay) {
            this.collectionDisplay.showCollection();
        }
    }

    onDestroy() {
        if (this.lotteryButton) {
            this.lotteryButton.node.off('click', this.onLotteryButtonClicked, this);
        }
        if (this.collectionButton) {
            this.collectionButton.node.off('click', this.onCollectionButtonClicked, this);
        }
    }
}
