import { _decorator, Component, Node, Prefab, instantiate, Vec3, UITransform } from 'cc';
import { SavedFishType } from './firebase/database-service';
import { Fish } from './Fish';

const { ccclass, property } = _decorator;

@ccclass('FishTank')
export class FishTank extends Component {

    @property(Prefab)
    fishPrefab: Prefab | null = null;

    @property
    maxFishCount: number = 10;

    private activeFish: Fish[] = [];
    private tankBounds: { min: Vec3, max: Vec3 } = { min: new Vec3(), max: new Vec3() };

    start() {
        this.calculateTankBounds();
    } private calculateTankBounds() {
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
    } public spawnFishFromData(fishDataArray: SavedFishType[]) {
        // Recalculate tank bounds to ensure they're up to date
        this.calculateTankBounds();

        // Clear existing fish
        this.clearAllFish();

        // Limit the number of fish to spawn
        const fishToSpawn = fishDataArray.slice(0, this.maxFishCount); fishToSpawn.forEach((fishData, index) => {
            this.spawnFish(fishData);
        });
    }

    public spawnFish(fishData: SavedFishType): Fish | null {
        if (!this.fishPrefab) {
            console.error('Fish prefab not set in FishTank component');
            return null;
        }

        if (this.activeFish.length >= this.maxFishCount) {
            console.warn('Maximum fish count reached, cannot spawn more fish');
            return null;
        }

        // Instantiate fish prefab
        const fishNode = instantiate(this.fishPrefab);
        this.node.addChild(fishNode);

        // Get the Fish component
        const fishComponent = fishNode.getComponent(Fish);
        if (!fishComponent) {
            console.error('Fish prefab must have a Fish component');
            fishNode.destroy();
            return null;
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

    public addRandomFish() {
        // Create a sample fish data for testing
        const randomFishData: SavedFishType = {
            ownerId: 'current-user',
            type: `fish-${Math.floor(Math.random() * 5) + 1}`,
            health: 100,
            lastFedTime: Date.now()
        };

        this.spawnFish(randomFishData);
    }

    onDestroy() {
        this.clearAllFish();
    }
}
