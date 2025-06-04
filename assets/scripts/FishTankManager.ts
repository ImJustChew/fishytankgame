import { _decorator, Component, Node, input, Input, EventTouch, Camera, Vec3, UITransform } from 'cc';
import { FishTank } from './FishTank';
import { FishManager } from './FishManager';
import { FishFoodManager } from './FishFoodManager';
import databaseService, { SavedFishType } from './firebase/database-service';
import authService from './firebase/auth-service';
import { FISH_LIST } from './FishData';
import { FISH_FOOD_LIST } from './FishFoodData';
import { FishFood } from './FishFood';

const { ccclass, property } = _decorator;

@ccclass('FishTankManager')
export class FishTankManager extends Component {
    @property(FishTank)
    fishTank: FishTank | null = null;

    @property(FishManager)
    fishManager: FishManager | null = null;

    @property(FishFoodManager)
    fishFoodManager: FishFoodManager | null = null;

    @property
    autoLoadFish: boolean = true;

    @property
    eatDistance: number = 20;

    @property
    trackingRange: number = 400;

    update(deltaTime: number) {
        // check for collision of fish and food (eating) 
        for (const food of this.fishTank.getActiveFishFood()) {
            for (const fish of this.fishTank.getActiveFish()) {
                if (this.isFoodNearFish(food.node, fish.node)) {
                    fish.eatFood(food.getFoodType());
                    food.destroyFood();
                    break; // One fish eats one food
                }
            }
        }

        for (const fish of this.fishTank.getActiveFish()) {
            let closestFood: Node | null = null;
            let minDistance = Infinity;

            const fishPos = fish.node.getPosition();

            for (const food of this.fishTank.getActiveFishFood()) {
                if (!food || !food.node || !food.node.isValid) continue;
                const foodPos = food.node.getPosition();
                const distance = Vec3.distance(fishPos, foodPos);

                if (distance < this.trackingRange && distance < minDistance) {
                    minDistance = distance;
                    closestFood = food.node;
                }
            }

            if (closestFood) {
                fish.setTarget(closestFood.getPosition());
            } else {
                fish.clearTarget();
            }
        }

    }

    private isFoodNearFish(foodNode: Node, fishNode: Node): boolean {
        const foodPos = foodNode.getWorldPosition();
        const fishPos = fishNode.getWorldPosition();
        const distance = Vec3.distance(foodPos, fishPos);
        return distance < this.eatDistance; // Adjust threshold as needed
    }

    private unsubscribeFishData: (() => void) | null = null; start() {
        if (this.autoLoadFish) {
            this.setupFishDataListener();
        } else {
            // If auto-load is disabled, still load once initially
            this.loadFishFromDatabase();
        }
        this.spawnDefaultFish();

        // Listen for mouse/touch clicks
        input.on(Input.EventType.TOUCH_END, this.onClickEnd, this);
    }
    /**
     * Set up real-time listener for fish data changes
     */
    private setupFishDataListener() {
        if (!this.fishTank) {
            console.error('FishTank component not assigned to FishTankManager');
            return;
        }

        if (!this.fishManager) {
            console.error('FishManager component not assigned to FishTankManager');
            return;
        }

        this.unsubscribeFishData = databaseService.onFishDataChanged((fishData) => {
            this.handleFishDataUpdate(fishData);
        });

        console.log('Fish data listener set up');
    }

    /**
     * Handle real-time fish data updates
     */
    private handleFishDataUpdate(fishData: SavedFishType[] | null) {
        if (!this.fishTank) {
            console.error('FishTank component not assigned to FishTankManager');
            return;
        }

        if (!this.fishManager) {
            console.error('FishManager component not assigned to FishTankManager');
            return;
        }

        if (fishData && fishData.length > 0) {
            console.log(`Received ${fishData.length} fish from real-time update`);
            this.fishTank.spawnFishFromData(fishData, this.fishManager);
        } else {
            console.log('No fish data received from real-time update');
            // Optionally spawn default fish for testing
            this.spawnDefaultFish();
        }
    }

    public async loadFishFromDatabase() {
        if (!this.fishTank) {
            console.error('FishTank component not assigned to FishTankManager');
            return;
        }

        if (!this.fishManager) {
            console.error('FishManager component not assigned to FishTankManager');
            return;
        }

        try {
            const savedFish = await databaseService.getSavedFish();

            if (savedFish && savedFish.length > 0) {
                console.log(`Loading ${savedFish.length} fish from database`);
                this.fishTank.spawnFishFromData(savedFish, this.fishManager);
            } else {
                console.log('No saved fish found in database');
                // Optionally spawn some default fish for testing
                this.spawnDefaultFish();
            }
        } catch (error) {
            console.error('Error loading fish from database:', error);
            // Fallback to default fish
            this.spawnDefaultFish();
        }
    }

    private spawnDefaultFish() {
        if (!this.fishTank || !this.fishManager) return;

        const user = authService.getCurrentUser();
        const ownerId = user ? user.uid : 'unknown-user';

        // Create some default fish food for testing using IDs from FishFoodData
        const defaultFishTypes = FISH_LIST.map(fish => fish.id).slice(0, 3); // Use first 3 types for simplicity
        const defaultFish: SavedFishType[] = defaultFishTypes.map((type, index) => ({
            ownerId: ownerId,
            type: type,
            health: Math.floor(Math.random() * 50) + 50, // 50-100 health
            lastFedTime: Date.now() - (Math.random() * 86400000) // Random time in last 24 hours
        }));

        this.fishTank.spawnFishFromData(defaultFish, this.fishManager);
        console.log('Spawned default fish for testing');
    }

    public refreshFishTank() {
        this.loadFishFromDatabase();
    }

    public clearFishTank() {
        if (this.fishTank) {
            this.fishTank.clearAllFish();
        }
    }

    public getFishCount(): number {
        return this.fishTank ? this.fishTank.getFishCount() : 0;
    }

    public enableAutoLoadFish() {
        if (!this.autoLoadFish) {
            this.autoLoadFish = true;
            this.setupFishDataListener();
        }
    }

    public disableAutoLoadFish() {
        if (this.autoLoadFish) {
            this.autoLoadFish = false;
            this.cleanup();
        }
    }

    private onClickEnd(event: EventTouch) {
        const currentFoodType = this.fishTank.getCurrentActiveFishFood();
        const touchPos = event.getUILocation();
        if (!touchPos) {
            console.warn('Could not convert to world space.');
            return;
        }

        const spawnLocation = this.fishTank.getComponent(UITransform)!.convertToNodeSpaceAR(
            new Vec3(touchPos.x, touchPos.y, 0));

        this.fishTank.spawnFishFood(currentFoodType, spawnLocation, this.fishFoodManager);
        console.log('Spawned default fish food for testing');
    }

    private cleanup() {
        if (this.unsubscribeFishData) {
            this.unsubscribeFishData();
            this.unsubscribeFishData = null;
            console.log('Fish data listener cleaned up');
        }
    }

    onDestroy() {
        this.cleanup();
    }
}