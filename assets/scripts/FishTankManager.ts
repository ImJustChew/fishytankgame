import { _decorator, Component, Node } from 'cc';
import { FishTank } from './FishTank';
import { FishManager } from './FishManager';
import databaseService, { SavedFishType } from './firebase/database-service';
import authService from './firebase/auth-service';
import { FISH_LIST } from './FishData';

const { ccclass, property } = _decorator;

@ccclass('FishTankManager')
export class FishTankManager extends Component {

    @property(FishTank)
    fishTank: FishTank | null = null;

    @property(FishManager)
    fishManager: FishManager | null = null;

    @property
    autoLoadFish: boolean = true;

    private unsubscribeFishData: (() => void) | null = null; start() {
        if (this.autoLoadFish) {
            this.setupFishDataListener();
        } else {
            // If auto-load is disabled, still load once initially
            this.loadFishFromDatabase();
        }
        this.spawnDefaultFish();
    }    /**
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

        // Create some default fish for testing using IDs from FishData
        const defaultFishTypes = FISH_LIST.map(fish => fish.id).slice(0, 6); // Use first 3 types for simplicity
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
