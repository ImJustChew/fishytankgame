import { _decorator, Component, Node, Vec3, Graphics, Color, Sprite, SpriteFrame, UITransform, tween } from 'cc';
import { BattleTank } from '../BattleTank';
import { BattleFish } from './BattleFish';
import { FishManager } from '../../FishManager';

const { ccclass, property } = _decorator;

/**
 * BattleFishVisualizer
 * A utility component to help visualize battle fish in the tank
 */
@ccclass('BattleFishVisualizer')
export class BattleFishVisualizer extends Component {
    @property(BattleTank)
    battleTank: BattleTank | null = null;

    @property(FishManager)
    fishManager: FishManager | null = null;

    start() {
        this.scheduleOnce(() => {
            this.visualizeExistingFish();
        }, 1.0);
    }

    /**
     * Visualize all fish in the battle tank to make them more visible
     */
    public visualizeExistingFish(): void {
        if (!this.battleTank || !this.battleTank.node) {
            console.error('Battle tank not assigned to BattleFishVisualizer');
            return;
        }

        console.log('Visualizing existing fish in battle tank');

        // Count fish before enhancement
        let battleFishCount = 0;
        let spriteCount = 0;

        // Check all children of the battle tank
        const children = [...this.battleTank.node.children];
        children.forEach((fishNode, index) => {
            const battleFish = fishNode.getComponent(BattleFish);
            if (battleFish) {
                battleFishCount++;

                // Ensure fish has a sprite
                let spriteComponent = fishNode.getComponent(Sprite);
                if (!spriteComponent) {
                    spriteComponent = fishNode.addComponent(Sprite);
                }

                if (spriteComponent) {
                    spriteCount++;

                    // Try to get a sprite frame if we have fish manager
                    if (this.fishManager && !spriteComponent.spriteFrame) {
                        // Try to get battle data or use a default sprite
                        const battleData = battleFish.getBattleData && battleFish.getBattleData();
                        const fishId = battleData ? battleData.originalData.id : 'fish_001';
                        const spriteFrame = this.fishManager.getFishSpriteById(fishId);

                        if (spriteFrame) {
                            spriteComponent.spriteFrame = spriteFrame;
                        }
                    }

                    // Ensure the fish is visible
                    spriteComponent.color = new Color(255, 255, 255, 255); // Full opacity

                    // Add a transform if needed
                    const uiTransform = fishNode.getComponent(UITransform) || fishNode.addComponent(UITransform);
                    if (uiTransform && (uiTransform.width === 0 || uiTransform.height === 0)) {
                        uiTransform.width = 80;
                        uiTransform.height = 40;
                    }

                    // Add HP bar and enemy indicator
                    this.addBattleElements(fishNode);
                }
            }
        });

        if (battleFishCount > 0) {
            console.log(`Enhanced ${battleFishCount} fish (${spriteCount} with sprites)`);
        }
    }

    /**
     * Visualize a specific fish node to make it visible
     * This is called when a new fish is added to the tank
     */
    public visualizeSpecificFish(fishNode: Node): void {
        if (!fishNode) {
            console.error('Cannot visualize null fish node');
            return;
        }

        const battleFish = fishNode.getComponent(BattleFish);
        if (!battleFish) {
            console.warn(`Node ${fishNode.name} does not have a BattleFish component`);
            return;
        }

        // Ensure fish has a sprite
        let spriteComponent = fishNode.getComponent(Sprite);
        if (!spriteComponent) {
            spriteComponent = fishNode.addComponent(Sprite);
        }

        if (spriteComponent) {
            // Try to get a sprite frame if we have fish manager
            if (this.fishManager && !spriteComponent.spriteFrame) {
                // Try to get battle data or use a default sprite
                const battleData = battleFish.getBattleData && battleFish.getBattleData();
                const fishId = battleData ? battleData.originalData.id : 'fish_001';
                const spriteFrame = this.fishManager.getFishSpriteById(fishId);

                if (spriteFrame) {
                    spriteComponent.spriteFrame = spriteFrame;
                }
            }

            // Ensure the fish is visible
            spriteComponent.color = new Color(255, 255, 255, 255); // Full opacity

            // Add a transform if needed
            const uiTransform = fishNode.getComponent(UITransform) || fishNode.addComponent(UITransform);
            if (uiTransform && (uiTransform.width === 0 || uiTransform.height === 0)) {
                uiTransform.width = 80;
                uiTransform.height = 40;
            }

            // Add HP bar and enemy indicator
            this.addBattleElements(fishNode);
        }
    }

    /**
     * Add HP bar and enemy indicator
     */
    private addBattleElements(fishNode: Node): void {
        const battleFish = fishNode.getComponent(BattleFish);
        if (battleFish) {
            // Add HP bar
            this.addHpBar(fishNode, battleFish);

            // Add enemy indicator (red dot) if this is an enemy fish
            const isEnemyFish = battleFish.getOwner?.() === 'opponent' ||
                battleFish.node['_owner'] === 'opponent';

            if (isEnemyFish) {
                this.addEnemyIndicator(fishNode);
            }
        }
    }

    /**
     * Add HP bar to a battle fish
     */
    private addHpBar(fishNode: Node, battleFish: BattleFish): void {
        // Remove any existing HP bar
        const existingHpBar = fishNode.getChildByName('HpBarNode');
        if (existingHpBar) {
            existingHpBar.destroy();
        }

        // Create an HP bar container
        const hpBarNode = new Node('HpBarNode');
        fishNode.addChild(hpBarNode);

        // Position it above the fish with a slight offset
        // Use a higher position (35) to ensure it doesn't overlap with the fish sprite
        hpBarNode.setPosition(0, 35, -2); // Z-index -2 to ensure it's visible above the fish

        // Add graphics for the HP bar background
        const hpBarGraphics = hpBarNode.addComponent(Graphics);

        // Background with border (darker gray)
        hpBarGraphics.lineWidth = 2;
        hpBarGraphics.strokeColor = new Color(60, 60, 60, 255); // Darker border
        hpBarGraphics.fillColor = new Color(80, 80, 80, 220); // Slightly more opaque

        const barWidth = 50;
        const barHeight = 6; // Slightly taller for better visibility

        // Draw bar background
        hpBarGraphics.roundRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, 3); // Rounded corners
        hpBarGraphics.stroke();
        hpBarGraphics.fill();

        // Create a separate node for the HP fill to make updates easier
        const hpFillNode = new Node('HpFill');
        hpBarNode.addChild(hpFillNode);

        const hpFillGraphics = hpFillNode.addComponent(Graphics);
        // Get max HP from battle data or use battleHP property
        const battleData = battleFish.getBattleData?.();
        const maxHP = battleData?.originalData?.health || battleFish.battleHP || 100;
        const currentHP = battleData?.currentHP || battleFish.battleHP || maxHP;

        // Calculate HP percentage
        const hpPercent = Math.max(0, Math.min(1, currentHP / maxHP));
        const currentBarWidth = barWidth * hpPercent;

        // Set appropriate color based on HP percentage
        if (hpPercent > 0.6) {
            hpFillGraphics.fillColor = new Color(50, 220, 50, 255); // Green
        } else if (hpPercent > 0.3) {
            hpFillGraphics.fillColor = new Color(220, 220, 50, 255); // Yellow
        } else {
            hpFillGraphics.fillColor = new Color(220, 50, 50, 255); // Red
        }

        // Draw the current HP fill
        hpFillGraphics.roundRect(-barWidth / 2, -barHeight / 2, currentBarWidth, barHeight, 2);
        hpFillGraphics.fill();

        // Store the max width for later updates
        hpFillNode['maxWidth'] = barWidth;

        // Store the HP fill node on the fish for later updates
        fishNode['hpFillNode'] = hpFillNode;
    }

    /**
    * Add an enemy indicator (red dot) to mark enemy fish
    */
    private addEnemyIndicator(fishNode: Node): void {
        // Remove any existing indicator
        const existingIndicator = fishNode.getChildByName('EnemyIndicator');
        if (existingIndicator) {
            existingIndicator.destroy();
        }

        // Create a new indicator node
        const indicatorNode = new Node('EnemyIndicator');
        fishNode.addChild(indicatorNode);

        // Center the indicator on the fish
        indicatorNode.setPosition(0, 0, -1); // Put it slightly in front of the fish

        // Add graphics for the red dot with a pulsing effect
        const graphics = indicatorNode.addComponent(Graphics);

        // Draw a red dot with a glow effect
        // Inner circle (bright red)
        graphics.fillColor = new Color(255, 0, 0, 255); // Bright red
        graphics.circle(0, 0, 7);
        graphics.fill();

        // Outer circle (softer red for glow effect)
        graphics.fillColor = new Color(255, 0, 0, 100); // Translucent red
        graphics.circle(0, 0, 10);
        graphics.fill();

        // Add a border for better visibility
        graphics.lineWidth = 1;
        graphics.strokeColor = new Color(255, 255, 255, 180); // White outline
        graphics.circle(0, 0, 7);
        graphics.stroke();

        // Add a simple animation to make the indicator pulse
        // This creates a visual cue that this is an enemy
        this.scheduleEnemyDotPulse(indicatorNode);
    }

    /**
     * Schedule a pulse animation for the enemy indicator
     */
    private scheduleEnemyDotPulse(dotNode: Node): void {
        // Use a tween to create a pulsing effect
        const pulse = () => {
            // Start at normal scale
            dotNode.setScale(1, 1, 1);

            // Pulse out
            tween(dotNode)
                .to(0.5, { scale: new Vec3(1.3, 1.3, 1.3) })
                .to(0.5, { scale: new Vec3(1.0, 1.0, 1.0) })
                .call(() => {
                    // If the node is still valid, repeat the pulse
                    if (dotNode.isValid) {
                        pulse();
                    }
                })
                .start();
        };

        // Start the pulse animation
        pulse();
    }
}
