import { _decorator, Component, Node, instantiate, Prefab, Label, Sprite, SpriteFrame, Animation, Button, resources, tween, Vec3, Color } from 'cc';
import { AvatarData, AvatarDatabase, AvatarRarity } from './AvatarData';
import databaseService from '../firebase/database-service';

const { ccclass, property } = _decorator;

/**
 * Lottery animation states
 */
enum LotteryState {
    IDLE,
    SPINNING,
    REVEALING,
    COMPLETED
}

/**
 * Main lottery system manager
 */
@ccclass('AvatarLotteryManager')
export class AvatarLotteryManager extends Component {
    @property(Button)
    rollButton: Button = null;

    @property(Node)
    resultContainer: Node = null;

    @property(Sprite)
    resultAvatarSprite: Sprite = null;

    @property(Label)
    resultNameLabel: Label = null;

    @property(Label)
    resultDescriptionLabel: Label = null;

    @property(Label)
    resultRarityLabel: Label = null;

    @property(Node)
    spinningIndicator: Node = null;

    @property(Node)
    rollCostContainer: Node = null;

    @property(Label)
    rollCostLabel: Label = null;

    @property(Label)
    userMoneyLabel: Label = null;

    @property(Button)
    backButton: Button = null;

    @property(Button)
    collectionButton: Button = null;

    // Lottery configuration
    private readonly ROLL_COST = 100; // Cost per roll
    private currentState: LotteryState = LotteryState.IDLE;
    private currentUserMoney: number = 0;

    start() {
        this.initializeUI();
        this.loadUserMoney();
        this.setupEventHandlers();
    }

    private initializeUI() {
        // Hide result container initially
        if (this.resultContainer) {
            this.resultContainer.active = false;
        }

        // Hide spinning indicator
        if (this.spinningIndicator) {
            this.spinningIndicator.active = false;
        }

        // Set roll cost label
        if (this.rollCostLabel) {
            this.rollCostLabel.string = `Cost: ${this.ROLL_COST} coins`;
        }

        console.log('[AvatarLotteryManager] UI initialized');
    }

    private async loadUserMoney() {
        try {
            const userData = await databaseService.getUserData();
            if (userData) {
                this.currentUserMoney = userData.money;
                this.updateMoneyDisplay();
                this.updateRollButtonState();
            }
        } catch (error) {
            console.error('Error loading user money:', error);
        }
    }

    private updateMoneyDisplay() {
        if (this.userMoneyLabel) {
            this.userMoneyLabel.string = `Coins: ${this.currentUserMoney}`;
        }
    }

    private updateRollButtonState() {
        if (this.rollButton) {
            const canRoll = this.currentUserMoney >= this.ROLL_COST && this.currentState === LotteryState.IDLE;
            this.rollButton.interactable = canRoll;

            if (!canRoll && this.currentUserMoney < this.ROLL_COST) {
                // Could add visual feedback for insufficient funds
                console.log('Insufficient funds for lottery roll');
            }
        }
    }

    private setupEventHandlers() {
        if (this.rollButton) {
            this.rollButton.node.on(Button.EventType.CLICK, this.onRollButtonClicked, this);
        }

        if (this.backButton) {
            this.backButton.node.on(Button.EventType.CLICK, this.onBackButtonClicked, this);
        }

        if (this.collectionButton) {
            this.collectionButton.node.on(Button.EventType.CLICK, this.onCollectionButtonClicked, this);
        }
    }

    private async onRollButtonClicked() {
        if (this.currentState !== LotteryState.IDLE) {
            return;
        }

        if (this.currentUserMoney < this.ROLL_COST) {
            console.log('Insufficient funds for lottery roll');
            return;
        }

        await this.performLotteryRoll();
    }

    private async performLotteryRoll() {
        try {
            this.currentState = LotteryState.SPINNING;
            this.updateRollButtonState();

            // Deduct money first
            this.currentUserMoney -= this.ROLL_COST;
            await databaseService.updateUserMoney(this.currentUserMoney);
            this.updateMoneyDisplay();

            // Show spinning animation
            await this.playSpinningAnimation();

            // Get random avatar
            const wonAvatar = AvatarDatabase.getRandomAvatar();
            console.log('Won avatar:', wonAvatar);

            // Add to user's collection
            await databaseService.addAvatarToCollection(wonAvatar.id);

            // Show result
            await this.showResult(wonAvatar);

            this.currentState = LotteryState.COMPLETED;

        } catch (error) {
            console.error('Error performing lottery roll:', error);
            this.currentState = LotteryState.IDLE;
            this.updateRollButtonState();
        }
    }

    private async playSpinningAnimation(): Promise<void> {
        return new Promise((resolve) => {
            if (this.spinningIndicator) {
                this.spinningIndicator.active = true;

                // Rotate the spinning indicator
                const spinTween = tween(this.spinningIndicator)
                    .by(2.0, { angle: 720 }) // 2 full rotations over 2 seconds
                    .call(() => {
                        this.spinningIndicator.active = false;
                        resolve();
                    });

                spinTween.start();
            } else {
                // Fallback delay if no spinning indicator
                this.scheduleOnce(() => {
                    resolve();
                }, 2.0);
            }
        });
    }

    private async showResult(avatar: AvatarData): Promise<void> {
        return new Promise((resolve) => {
            if (!this.resultContainer) {
                resolve();
                return;
            }

            // Load avatar sprite
            this.loadAvatarSprite(avatar);

            // Set text labels
            if (this.resultNameLabel) {
                this.resultNameLabel.string = avatar.name;
            }

            if (this.resultDescriptionLabel) {
                this.resultDescriptionLabel.string = avatar.description;
            }

            if (this.resultRarityLabel) {
                this.resultRarityLabel.string = AvatarDatabase.getRarityDisplayName(avatar.rarity);

                // Set rarity color
                const rarityColor = AvatarDatabase.getRarityColor(avatar.rarity);
                this.resultRarityLabel.color = Color.fromHEX(new Color(), rarityColor);
            }

            // Show result container with animation
            this.resultContainer.active = true;
            this.resultContainer.setScale(0.1, 0.1, 1);

            const showTween = tween(this.resultContainer)
                .to(0.5, { scale: new Vec3(1, 1, 1) }, {
                    easing: 'backOut'
                })
                .call(() => {
                    // Allow new roll after showing result
                    this.scheduleOnce(() => {
                        this.currentState = LotteryState.IDLE;
                        this.updateRollButtonState();
                    }, 1.0);
                    resolve();
                });

            showTween.start();
        });
    }

    private loadAvatarSprite(avatar: AvatarData) {
        if (!this.resultAvatarSprite) {
            return;
        }

        // Load sprite from resources
        resources.load(`pictures/${avatar.spritePath}/spriteFrame`, SpriteFrame, (err, spriteFrame) => {
            if (err) {
                console.error(`Failed to load avatar sprite: ${avatar.spritePath}`, err);
                return;
            }

            if (this.resultAvatarSprite && spriteFrame) {
                this.resultAvatarSprite.spriteFrame = spriteFrame;
            }
        });
    }

    private onBackButtonClicked() {
        // Navigate back to main menu or previous scene
        // This would typically use a scene manager
        console.log('Back button clicked - implement scene navigation');
    }

    private onCollectionButtonClicked() {
        // Open avatar collection view
        console.log('Collection button clicked - implement collection view');
        this.openAvatarCollection();
    }

    private openAvatarCollection() {
        // This would open the avatar collection scene/panel
        // For now, we'll just log the user's collection
        this.showUserCollection();
    }

    private async showUserCollection() {
        try {
            const collection = await databaseService.getAvatarCollection();
            const selectedAvatar = await databaseService.getSelectedAvatar();

            console.log('User avatar collection:', collection);
            console.log('Selected avatar:', selectedAvatar);

            // TODO: Implement actual collection UI display
        } catch (error) {
            console.error('Error loading avatar collection:', error);
        }
    }

    public hideResult() {
        if (this.resultContainer) {
            this.resultContainer.active = false;
        }
    }

    onDestroy() {
        // Clean up event handlers
        if (this.rollButton) {
            this.rollButton.node.off(Button.EventType.CLICK, this.onRollButtonClicked, this);
        }

        if (this.backButton) {
            this.backButton.node.off(Button.EventType.CLICK, this.onBackButtonClicked, this);
        }

        if (this.collectionButton) {
            this.collectionButton.node.off(Button.EventType.CLICK, this.onCollectionButtonClicked, this);
        }
    }
}
