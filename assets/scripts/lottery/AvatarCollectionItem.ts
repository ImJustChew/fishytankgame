import { _decorator, Component, Node, Label, Sprite, SpriteFrame, Button, resources, Color } from 'cc';
import { AvatarData, AvatarDatabase } from './AvatarData';

const { ccclass, property } = _decorator;

/**
 * Avatar collection item component for displaying individual avatars
 */
@ccclass('AvatarCollectionItem')
export class AvatarCollectionItem extends Component {
    @property(Sprite)
    avatarSprite: Sprite = null;

    @property(Label)
    nameLabel: Label = null;

    @property(Label)
    rarityLabel: Label = null;

    @property(Label)
    statusLabel: Label = null;

    @property(Button)
    selectButton: Button = null;

    @property(Node)
    selectedIndicator: Node = null;

    @property(Node)
    lockedOverlay: Node = null;

    private avatarData: AvatarData = null;
    private isUnlocked: boolean = false;
    private isSelected: boolean = false;
    private onSelectCallback: (avatarId: string) => void = null;

    public initialize(avatar: AvatarData, isUnlocked: boolean, isSelected: boolean, onSelect: (avatarId: string) => void) {
        this.avatarData = avatar;
        this.isUnlocked = isUnlocked;
        this.isSelected = isSelected;
        this.onSelectCallback = onSelect;

        this.setupUI();
        this.setupEventHandlers();
    }

    private setupUI() {
        if (!this.avatarData) return;

        // Set avatar name
        if (this.nameLabel) {
            this.nameLabel.string = this.avatarData.name;
        }

        // Set rarity
        if (this.rarityLabel) {
            this.rarityLabel.string = AvatarDatabase.getRarityDisplayName(this.avatarData.rarity);
            const rarityColor = AvatarDatabase.getRarityColor(this.avatarData.rarity);
            this.rarityLabel.color = Color.fromHEX(new Color(), rarityColor);
        }

        // Set status
        if (this.statusLabel) {
            this.statusLabel.string = this.isUnlocked ? 'Owned' : 'Locked';
            this.statusLabel.color = this.isUnlocked ? Color.GREEN : Color.GRAY;
        }

        // Load avatar sprite
        this.loadAvatarSprite();

        // Update visual state
        this.updateVisualState();
    }

    private loadAvatarSprite() {
        if (!this.avatarSprite || !this.avatarData) return;

        resources.load(`pictures/${this.avatarData.spritePath}/spriteFrame`, SpriteFrame, (err, spriteFrame) => {
            if (err) {
                console.error(`Failed to load avatar sprite: ${this.avatarData.spritePath}`, err);
                return;
            }

            if (this.avatarSprite && spriteFrame) {
                this.avatarSprite.spriteFrame = spriteFrame;

                // Dim sprite if locked
                if (!this.isUnlocked) {
                    this.avatarSprite.color = Color.GRAY;
                }
            }
        });
    }

    private updateVisualState() {
        // Show/hide selected indicator
        if (this.selectedIndicator) {
            this.selectedIndicator.active = this.isSelected;
        }

        // Show/hide locked overlay
        if (this.lockedOverlay) {
            this.lockedOverlay.active = !this.isUnlocked;
        }

        // Update select button
        if (this.selectButton) {
            this.selectButton.interactable = this.isUnlocked;

            // Update button text
            const buttonLabel = this.selectButton.getComponentInChildren(Label);
            if (buttonLabel) {
                if (this.isSelected) {
                    buttonLabel.string = 'Selected';
                } else if (this.isUnlocked) {
                    buttonLabel.string = 'Select';
                } else {
                    buttonLabel.string = 'Locked';
                }
            }
        }
    }

    private setupEventHandlers() {
        if (this.selectButton) {
            this.selectButton.node.on(Button.EventType.CLICK, this.onSelectButtonClicked, this);
        }
    }

    private onSelectButtonClicked() {
        if (this.isUnlocked && !this.isSelected && this.onSelectCallback) {
            this.onSelectCallback(this.avatarData.id);
        }
    }

    public setSelected(selected: boolean) {
        this.isSelected = selected;
        this.updateVisualState();
    }

    onDestroy() {
        if (this.selectButton) {
            this.selectButton.node.off(Button.EventType.CLICK, this.onSelectButtonClicked, this);
        }
    }
}
