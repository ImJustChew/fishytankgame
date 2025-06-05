import { _decorator, Component, Node, Vec3, UITransform, Sprite } from 'cc';
import { SavedFishType } from '../firebase/database-service';
import { Fish } from '../Fish';
import { FishManager } from '../FishManager';

const { ccclass, property } = _decorator;

/**
 * BattleTank - Simplified tank component for battle mode
 * Focuses only on fish management and tank bounds for battles
 */
@ccclass('BattleTank')
export class BattleTank extends Component {

    @property
    maxFishCount: number = 50; // Higher limit for battle scenarios

    private activeFish: Fish[] = [];
    private tankBounds: { min: Vec3, max: Vec3 } = { min: new Vec3(), max: new Vec3() };

    start() {
        this.calculateTankBounds();

        // Ensure tank is properly configured for visibility
        this.ensureVisibility();
    }

    /**
     * Ensures that the tank and its children are properly visible
     */
    private ensureVisibility() {
        // Make sure the tank node is active
        this.node.active = true;

        // Make sure the transform is properly set up
        const uiTransform = this.getComponent(UITransform) || this.addComponent(UITransform);
        if (uiTransform) {
            // Ensure the tank has a reasonable size if not already set
            if (uiTransform.width === 0 || uiTransform.height === 0) {
                uiTransform.width = 600;
                uiTransform.height = 400;
            }

            console.log(`Battle tank size: ${uiTransform.width} x ${uiTransform.height}`);
        }

        // Ensure z position is good for rendering
        const currentPos = this.node.getPosition();
        if (currentPos.z === 0) {
            this.node.setPosition(currentPos.x, currentPos.y, -5);
        }

        // Log tank visibility information
        console.log(`Battle tank configuration:
            - Active: ${this.node.active}
            - Position: ${this.node.position.toString()}
            - Scale: ${this.node.scale.toString()}
            - Parent: ${this.node.parent?.name || 'none'}
            - Has UITransform: ${!!this.getComponent(UITransform)}
            - Children count: ${this.node.children.length}
        `);
    }

    private calculateTankBounds() {
        // Use the node this component is attached to as the tank boundary
        const transform = this.getComponent(UITransform);
        let width = 0;
        let height = 0;

        if (transform) {
            width = transform.contentSize.width;
            height = transform.contentSize.height;
        }

        // If UITransform doesn't exist or has zero size, use fallback values
        if (width === 0 || height === 0) {
            const scale = this.node.getScale();
            width = 600 * scale.x; // Larger default for battle
            height = 400 * scale.y; // Larger default for battle
        }

        const halfWidth = width / 2;
        const halfHeight = height / 2;

        this.tankBounds = {
            min: new Vec3(-halfWidth, -halfHeight, 0),
            max: new Vec3(halfWidth, halfHeight, 0)
        };
    }

    /**
     * Spawn fish from data array - replaces all existing fish
     */
    public spawnFishFromData(fishDataArray: SavedFishType[], fishManager: FishManager) {
        // Recalculate tank bounds to ensure they're up to date
        this.calculateTankBounds();

        // Clear existing fish
        this.clearAllFish();

        // Limit the number of fish to spawn
        const fishToSpawn = fishDataArray.slice(0, this.maxFishCount);

        fishToSpawn.forEach((fishData) => {
            this.spawnFish(fishData, fishManager);
        });
    }

    /**
     * Spawn a single fish
     */
    public spawnFish(fishData: SavedFishType, fishManager: FishManager): Fish | null {
        if (this.activeFish.length >= this.maxFishCount) {
            console.warn('Maximum fish count reached, cannot spawn more fish');
            return null;
        }

        // Get sprite frame for the fish type
        const spriteFrame = fishManager.getFishSpriteById(fishData.type);
        if (!spriteFrame) {
            console.warn(`No sprite found for fish type: ${fishData.type}, spawning without sprite`);
        }

        // Create a new node for the fish
        const fishNode = new Node(`BattleFish_${fishData.type}`);
        this.node.addChild(fishNode);

        // Add Fish component
        const fishComponent = fishNode.addComponent(Fish);
        if (!fishComponent) {
            console.error('Failed to add Fish component');
            fishNode.destroy();
            return null;
        }

        // Add Sprite component and set sprite frame
        const spriteComponent = fishNode.addComponent(Sprite);
        if (spriteComponent && spriteFrame) {
            spriteComponent.spriteFrame = spriteFrame;
        }

        // Initialize the fish with data and bounds
        fishComponent.initializeFish(fishData, this.tankBounds);

        // Add to active fish array
        this.activeFish.push(fishComponent);

        // Set up cleanup when fish is destroyed
        fishNode.on(Node.EventType.NODE_DESTROYED, () => {
            const index = this.activeFish.indexOf(fishComponent);
            if (index > -1) {
                this.activeFish.splice(index, 1);
            }
        });

        return fishComponent;
    }

    /**
     * Remove a specific fish
     */
    public removeFish(fish: Fish) {
        const index = this.activeFish.indexOf(fish);
        if (index > -1) {
            this.activeFish.splice(index, 1);
            fish.node.destroy();
        }
    }

    /**
     * Clear all fish from the tank
     */
    public clearAllFish() {
        this.activeFish.forEach(fish => {
            if (fish && fish.node) {
                fish.node.destroy();
            }
        });
        this.activeFish = [];
    }

    /**
     * Get all active fish
     */
    public getActiveFish(): Fish[] {
        return [...this.activeFish];
    }

    /**
     * Get fish count
     */
    public getFishCount(): number {
        return this.activeFish.length;
    }

    /**
     * Get tank bounds for battle calculations
     */
    public getTankBounds(): { min: Vec3, max: Vec3 } {
        return this.tankBounds;
    }

    /**
     * Update tank bounds (useful when tank size changes)
     */
    public updateTankBounds() {
        this.calculateTankBounds();

        // Update bounds for existing fish
        this.activeFish.forEach(fish => {
            if (fish && fish.initializeFish) {
                const fishData = fish.getFishData();
                if (fishData) {
                    fish.initializeFish(fishData, this.tankBounds);
                }
            }
        });
    }

    /**
     * Get fish data array for battle calculations
     */
    public getFishDataArray(): SavedFishType[] {
        return this.activeFish
            .map(fish => fish.getFishData())
            .filter(data => data !== null) as SavedFishType[];
    }

    onDestroy() {
        this.clearAllFish();
    }
}
