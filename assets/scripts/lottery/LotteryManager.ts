import { _decorator, Component, Node, Button, Sprite, Label, SpriteFrame, Animation, tween, Vec3, Color, ScrollView, Prefab, instantiate, director, UITransform, Tween } from 'cc';
import { AvatarData, AvatarDatabase, AvatarRarity } from './AvatarData';
import { AvatarManager } from './AvatarManager';
import databaseService from '../firebase/database-service';

const { ccclass, property } = _decorator;

/**
 * Lottery pane states
 */
enum LotteryPane {
    PRE_LOTTERY = 'pre',
    ROLLING = 'rolling',
    POST_LOTTERY = 'post'
}

@ccclass('LotteryManager')
export class LotteryManager extends Component {
    // === PRE-LOTTERY PANE ===
    @property(Node)
    preLotteryPane: Node = null!;

    @property(ScrollView)
    avatarPreviewScroll: ScrollView = null!;

    @property(Node)
    avatarPreviewContainer: Node = null!;

    @property(Prefab)
    avatarPreviewItemPrefab: Prefab = null!;

    @property(Button)
    rollButton: Button = null!;

    @property(Label)
    userMoneyLabel: Label = null!;

    @property(Label)
    rollCostLabel: Label = null!;

    // === ROLLING PANE ===
    @property(Node)
    rollingPane: Node = null!;

    @property(Node)
    wheelContainer: Node = null!;

    @property(Sprite)
    wheelSprite: Sprite = null!;

    @property(Node)
    wheelPointer: Node = null!;

    @property(Label)
    rollingStatusLabel: Label = null!;

    // === POST-LOTTERY PANE ===
    @property(Node)
    postLotteryPane: Node = null!;

    @property(Sprite)
    resultSprite: Sprite = null!;

    @property(Label)
    resultNameLabel: Label = null!;

    @property(Label)
    resultDescriptionLabel: Label = null!;

    @property(Label)
    resultRarityLabel: Label = null!;

    @property(Node)
    sparkleEffects: Node = null!;

    @property(Button)
    rollAgainButton: Button = null!;

    @property(Button)
    collectButton: Button = null!;

    // === SHARED PROPERTIES ===
    @property(AvatarManager)
    avatarManager: AvatarManager = null!;

    @property(Button)
    backButton: Button = null!;

    private currentPane: LotteryPane = LotteryPane.PRE_LOTTERY;
    private isProcessing: boolean = false;
    private spinCost: number = 100;
    private currentWonAvatar: AvatarData | null = null; start() {
        this.setupUI();
        this.showPane(LotteryPane.PRE_LOTTERY);
        this.loadAvatarPreviews();
        this.updateUserMoney();
    }

    private setupUI() {
        // Pre-lottery pane setup
        if (this.rollButton) {
            this.rollButton.node.on('click', this.onRollButtonClicked, this);
        }

        // Post-lottery pane setup
        if (this.rollAgainButton) {
            this.rollAgainButton.node.on('click', this.onRollAgainClicked, this);
        }

        if (this.collectButton) {
            this.collectButton.node.on('click', this.onCollectClicked, this);
        }

        // Back button setup
        if (this.backButton) {
            this.backButton.node.on('click', this.onBackClicked, this);
        }

        this.updateRollCostDisplay();
    }

    // === PANE MANAGEMENT ===
    private showPane(pane: LotteryPane) {
        this.currentPane = pane;

        // Hide all panes
        if (this.preLotteryPane) this.preLotteryPane.active = false;
        if (this.rollingPane) this.rollingPane.active = false;
        if (this.postLotteryPane) this.postLotteryPane.active = false;

        // Show the requested pane
        switch (pane) {
            case LotteryPane.PRE_LOTTERY:
                if (this.preLotteryPane) this.preLotteryPane.active = true;
                this.updateUserMoney();
                break;
            case LotteryPane.ROLLING:
                if (this.rollingPane) this.rollingPane.active = true;
                break;
            case LotteryPane.POST_LOTTERY:
                if (this.postLotteryPane) this.postLotteryPane.active = true;
                break;
        }
    }    // === PRE-LOTTERY PANE METHODS ===
    private async loadAvatarPreviews() {
        if (!this.avatarPreviewContainer || !this.avatarManager) return;

        // Clear existing previews
        this.avatarPreviewContainer.removeAllChildren();

        const allAvatars = AvatarDatabase.getAllAvatars();

        for (const avatar of allAvatars) {
            const previewItem = this.createAvatarPreviewItem(avatar);
            this.avatarPreviewContainer.addChild(previewItem);
        }
    } private createAvatarPreviewItem(avatar: AvatarData): Node {
        const itemNode = new Node(`Preview_${avatar.id}`);
        const transform = itemNode.addComponent(UITransform);
        transform.setContentSize(120, 150);

        // Add sprite component
        const sprite = itemNode.addComponent(Sprite);
        const avatarSprite = this.avatarManager.getAvatarSpriteById(avatar.id);
        if (avatarSprite) {
            sprite.spriteFrame = avatarSprite;
        }
        const spriteTransform = sprite.getComponent(UITransform);
        if (spriteTransform) {
            spriteTransform.setContentSize(100, 100);
        }
        sprite.node.setPosition(0, 15);

        // Add label for name
        const labelNode = new Node('NameLabel');
        const label = labelNode.addComponent(Label);
        label.string = avatar.name;
        label.fontSize = 14;
        labelNode.setPosition(0, -40);
        itemNode.addChild(labelNode);

        // Add rarity indicator
        const rarityNode = new Node('RarityLabel');
        const rarityLabel = rarityNode.addComponent(Label);
        rarityLabel.string = AvatarDatabase.getRarityDisplayName(avatar.rarity);
        rarityLabel.fontSize = 12;
        const rarityColor = new Color();
        rarityColor.fromHEX(AvatarDatabase.getRarityColor(avatar.rarity));
        rarityLabel.color = rarityColor;
        rarityNode.setPosition(0, -55);
        itemNode.addChild(rarityNode);

        return itemNode;
    }

    private updateRollCostDisplay() {
        if (this.rollCostLabel) {
            this.rollCostLabel.string = `${this.spinCost} coins`;
        }
    }

    private async updateUserMoney() {
        if (!this.userMoneyLabel) return;

        try {
            const userData = await databaseService.getUserData();
            const money = userData?.money || 0;
            this.userMoneyLabel.string = `${money} coins`;

            // Update roll button state
            if (this.rollButton) {
                this.rollButton.interactable = money >= this.spinCost && !this.isProcessing;
            }
        } catch (error) {
            console.error('Error updating user money:', error);
            this.userMoneyLabel.string = '0 coins';
        }
    }

    private async onRollButtonClicked() {
        if (this.isProcessing) return;

        // Check if user has enough money
        const userData = await databaseService.getUserData();
        if (!userData || userData.money < this.spinCost) {
            this.showRollingStatus('Not enough coins!', Color.RED);
            return;
        }

        this.isProcessing = true;

        try {
            // Deduct money
            await databaseService.updateUserMoney(userData.money - this.spinCost);

            // Switch to rolling pane
            this.showPane(LotteryPane.ROLLING);

            // Play wheel animation and get result
            const wonAvatar = await this.playWheelAnimation();

            // Add to collection
            await databaseService.addAvatarToCollection(wonAvatar.id);
            this.currentWonAvatar = wonAvatar;

            // Switch to result pane
            this.showResultPane(wonAvatar);

        } catch (error) {
            console.error('Error during lottery roll:', error);
            this.showRollingStatus('Error occurred!', Color.RED);
            this.showPane(LotteryPane.PRE_LOTTERY);
        } finally {
            this.isProcessing = false;
        }
    }

    // === ROLLING PANE METHODS ===
    private showRollingStatus(message: string, color: Color = Color.WHITE) {
        if (this.rollingStatusLabel) {
            this.rollingStatusLabel.string = message;
            this.rollingStatusLabel.color = color;
        }
    }

    private async playWheelAnimation(): Promise<AvatarData> {
        this.showRollingStatus('Spinning the wheel...', Color.YELLOW);

        // Get random avatar using existing lottery logic
        const randomValue = Math.random();
        let cumulativeChance = 0;
        const allAvatars = AvatarDatabase.getAllAvatars();

        let selectedAvatar = allAvatars[0]; // fallback

        for (const avatar of allAvatars) {
            cumulativeChance += avatar.dropRate;
            if (randomValue <= cumulativeChance) {
                selectedAvatar = avatar;
                break;
            }
        }

        // Animate the wheel
        if (this.wheelContainer) {
            // Calculate final rotation based on selected avatar
            const avatarIndex = allAvatars.findIndex(a => a.id === selectedAvatar.id);
            const sectionAngle = 360 / allAvatars.length;
            const targetAngle = avatarIndex * sectionAngle + (sectionAngle / 2);
            const fullRotations = 5; // Number of full spins
            const finalAngle = fullRotations * 360 + targetAngle;

            // Animate wheel rotation
            return new Promise<AvatarData>((resolve) => {
                tween(this.wheelContainer)
                    .to(3.0, { angle: finalAngle }, {
                        easing: 'quintOut' // Slow down at the end
                    })
                    .call(() => {
                        this.showRollingStatus('Revealing result...', Color.GREEN);
                        // Small delay before showing result
                        setTimeout(() => {
                            resolve(selectedAvatar);
                        }, 500);
                    })
                    .start();
            });
        }

        // Fallback without animation
        return new Promise<AvatarData>((resolve) => {
            setTimeout(() => {
                resolve(selectedAvatar);
            }, 2000);
        });
    }

    // === POST-LOTTERY PANE METHODS ===
    private showResultPane(avatar: AvatarData) {
        this.showPane(LotteryPane.POST_LOTTERY);
        this.displayAvatarResult(avatar);
    }

    private async displayAvatarResult(avatar: AvatarData) {
        // Get avatar sprite from AvatarManager
        const spriteFrame = this.avatarManager ? this.avatarManager.getAvatarSpriteById(avatar.id) : null;

        if (this.resultSprite && spriteFrame) {
            this.resultSprite.spriteFrame = spriteFrame;
        }

        if (this.resultNameLabel) {
            this.resultNameLabel.string = avatar.name;
        }

        if (this.resultDescriptionLabel) {
            this.resultDescriptionLabel.string = avatar.description;
        }

        if (this.resultRarityLabel) {
            this.resultRarityLabel.string = AvatarDatabase.getRarityDisplayName(avatar.rarity);
            // Set color based on rarity
            const color = new Color();
            color.fromHEX(AvatarDatabase.getRarityColor(avatar.rarity));
            this.resultRarityLabel.color = color;
        }

        // Show sparkle effects for rare+ avatars
        if (avatar.rarity !== AvatarRarity.COMMON && this.sparkleEffects) {
            this.sparkleEffects.active = true;
            this.playSparkleAnimation();
        } else if (this.sparkleEffects) {
            this.sparkleEffects.active = false;
        }

        // Scale in animation for result
        if (this.resultSprite) {
            this.resultSprite.node.setScale(0, 0, 1);
            tween(this.resultSprite.node)
                .to(0.5, { scale: new Vec3(1, 1, 1) })
                .start();
        }
    }

    private playSparkleAnimation() {
        if (!this.sparkleEffects) return;

        // Simple sparkle animation - rotate continuously
        tween(this.sparkleEffects)
            .by(1.0, { angle: 360 })
            .repeatForever()
            .start();
    } private onRollAgainClicked() {
        if (this.isProcessing) return;

        // Stop any ongoing sparkle animations
        if (this.sparkleEffects) {
            Tween.stopAllByTarget(this.sparkleEffects);
            this.sparkleEffects.active = false;
        }

        // Reset to pre-lottery pane
        this.showPane(LotteryPane.PRE_LOTTERY);
        this.updateUserMoney();
    }

    private onCollectClicked() {
        if (this.isProcessing) return;

        // For now, just go back to pre-lottery (collection is already saved)
        // Could add additional effects or navigate to collection view
        this.onRollAgainClicked();
    } private onBackClicked() {
        // Stop any ongoing animations
        if (this.sparkleEffects) {
            Tween.stopAllByTarget(this.sparkleEffects);
        }
        if (this.wheelContainer) {
            Tween.stopAllByTarget(this.wheelContainer);
        }

        // Navigate back to main scene
        director.loadScene('main');
    }

    onDestroy() {
        // Clean up event listeners
        if (this.rollButton) {
            this.rollButton.node.off('click', this.onRollButtonClicked, this);
        }
        if (this.rollAgainButton) {
            this.rollAgainButton.node.off('click', this.onRollAgainClicked, this);
        }
        if (this.collectButton) {
            this.collectButton.node.off('click', this.onCollectClicked, this);
        }
        if (this.backButton) {
            this.backButton.node.off('click', this.onBackClicked, this);
        }
    }
}
