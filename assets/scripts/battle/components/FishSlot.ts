import { _decorator, Component, Label, Sprite, SpriteFrame, Node } from 'cc';
const { ccclass, property } = _decorator;

/**
 * FishSlot Component
 * Represents a deployable fish slot in the battle deployment panel
 */
@ccclass('FishSlot')
export class FishSlot extends Component {
    @property(Sprite)
    fishIcon: Sprite | null = null;

    @property(Label)
    fishNameLabel: Label | null = null;

    @property(Label)
    countLabel: Label | null = null;

    @property(Node)
    iconContainer: Node | null = null;

    private fishId: string = '';
    private fishCount: number = 0;
    private isEnabled: boolean = true;

    /**
     * Initialize the fish slot with data
     */
    public init(fishId: string, fishName: string, count: number, spriteFrame: SpriteFrame | null): void {
        this.fishId = fishId;
        this.fishCount = count;

        // Set fish icon
        if (this.fishIcon && spriteFrame) {
            this.fishIcon.spriteFrame = spriteFrame;
        }        // Clear fish name - we only want to show count
        if (this.fishNameLabel) {
            this.fishNameLabel.string = '';
        }

        // Set count
        if (this.countLabel) {
            this.countLabel.string = count.toString();
        }

        // Update enabled state
        this.updateEnabledState();
    }

    /**
     * Update the count display
     */
    public updateCount(newCount: number): void {
        this.fishCount = newCount;

        if (this.countLabel) {
            this.countLabel.string = newCount.toString();
        }

        this.updateEnabledState();
    }

    /**
     * Get the current fish count
     */
    public getCount(): number {
        return this.fishCount;
    }

    /**
     * Get the fish ID
     */
    public getFishId(): string {
        return this.fishId;
    }

    /**
     * Check if the slot is enabled (has fish available)
     */
    public isSlotEnabled(): boolean {
        return this.isEnabled && this.fishCount > 0;
    }

    /**
     * Update the visual enabled state based on fish count
     */
    private updateEnabledState(): void {
        this.isEnabled = this.fishCount > 0;

        // Update visual appearance based on enabled state
        const alpha = this.isEnabled ? 1.0 : 0.5;

        if (this.fishIcon) {
            const color = this.fishIcon.color.clone();
            color.a = alpha * 255;
            this.fishIcon.color = color;
        }

        if (this.fishNameLabel) {
            const color = this.fishNameLabel.color.clone();
            color.a = alpha * 255;
            this.fishNameLabel.color = color;
        }

        if (this.countLabel) {
            const color = this.countLabel.color.clone();
            color.a = alpha * 255;
            this.countLabel.color = color;
        }
    }

    /**
     * Manually set enabled state (for testing or special cases)
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        this.updateEnabledState();
    }
}
