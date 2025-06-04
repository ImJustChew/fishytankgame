import { _decorator, Component, Node, Prefab, instantiate, Vec3, UITransform, Sprite, SpriteFrame } from 'cc';
import { SavedFishType } from './firebase/database-service';
import { Fish } from './Fish';
import { FishManager } from './FishManager';

const { ccclass, property } = _decorator;

@ccclass('FishTank')
export class FishTank extends Component {

    @property
    maxFishCount: number = 10;

    private activeFish: Fish[] = [];
    private tankBounds: { min: Vec3, max: Vec3 } = { min: new Vec3(), max: new Vec3() };

    start() {
        this.calculateTankBounds();
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
            width = 400 * scale.x;  // Default tank width
            height = 300 * scale.y; // Default tank height
        }

        const halfWidth = width / 2;
        const halfHeight = height / 2;

        this.tankBounds = {
            min: new Vec3(-halfWidth, -halfHeight, 0),
            max: new Vec3(halfWidth, halfHeight, 0)
        };
    }

    public spawnFishFromData(fishDataArray: SavedFishType[], fishManager: FishManager) {
        // Recalculate tank bounds to ensure they're up to date
        this.calculateTankBounds();

        // Clear existing fish
        this.clearAllFish();

        // Limit the number of fish to spawn
        const fishToSpawn = fishDataArray.slice(0, this.maxFishCount);

        fishToSpawn.forEach((fishData, index) => {
            this.spawnFish(fishData, fishManager);
        });
    }

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
        const fishNode = new Node(`Fish_${fishData.type}`);
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

    public removeFish(fish: Fish) {
        const index = this.activeFish.indexOf(fish);
        if (index > -1) {
            this.activeFish.splice(index, 1);
            fish.node.destroy();
        }
    }

    public clearAllFish() {
        this.activeFish.forEach(fish => {
            if (fish && fish.node) {
                fish.node.destroy();
            }
        });
        this.activeFish = [];
    }

    public getActiveFish(): Fish[] {
        return [...this.activeFish];
    }

    public getFishCount(): number {
        return this.activeFish.length;
    }

    public getFishDataArray(): SavedFishType[] {
        return this.activeFish
            .map(fish => fish.getFishData())
            .filter(data => data !== null) as SavedFishType[];
    }

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

    public addRandomFish(fishManager: FishManager) {
        // Create a sample fish data for testing
        const randomFishData: SavedFishType = {
            ownerId: 'current-user',
            type: `fish_${Math.floor(Math.random() * 3) + 1}`, // fish_1, fish_2, or fish_3 to match FishData IDs
            health: 100,
            lastFedTime: Date.now()
        };

        this.spawnFish(randomFishData, fishManager);
    }

    onDestroy() {
        this.clearAllFish();
    }
}
