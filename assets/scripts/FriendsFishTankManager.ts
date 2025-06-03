import { _decorator, Component, Node } from 'cc';
import { FishTank } from './FishTank';
import { FishManager } from './FishManager';
import socialService, { FriendData } from './firebase/social-service';
import { SavedFishType } from './firebase/database-service';

const { ccclass, property } = _decorator;

@ccclass('FriendsFishTankManager')
export class FriendsFishTankManager extends Component {

    @property(FishTank)
    fishTank: FishTank | null = null;

    @property(FishManager)
    fishManager: FishManager | null = null;

    @property
    autoUpdateFish: boolean = true;

    private currentFriendUid: string | null = null;
    private friendData: FriendData | null = null;
    private unsubscribeFishData: (() => void) | null = null;

    start() {
        // Component starts empty - need to call loadFriendsFishTank to display fish
    }

    onDestroy() {
        this.cleanup();
    }

    /**
     * Load and display a friend's fish tank
     * @param friendUid The UID of the friend whose fish tank to display
     * @param friendData Optional friend data for displaying friend info
     * @param enableRealTimeUpdates Whether to enable real-time updates (defaults to autoUpdateFish property)
     */
    public async loadFriendsFishTank(friendUid: string, friendData?: FriendData, enableRealTimeUpdates?: boolean): Promise<boolean> {
        if (!this.fishTank) {
            console.error('FishTank component not assigned to FriendsFishTankManager');
            return false;
        }

        if (!this.fishManager) {
            console.error('FishManager component not assigned to FriendsFishTankManager');
            return false;
        }

        try {
            console.log(`Loading fish tank for friend: ${friendUid}`);

            // Clean up any existing listeners
            this.cleanup();

            // Store friend info
            this.currentFriendUid = friendUid;
            this.friendData = friendData || null;

            // Clear existing fish
            this.clearFishTank();

            // Determine if real-time updates should be enabled
            const shouldEnableRealTime = enableRealTimeUpdates !== undefined ? enableRealTimeUpdates : this.autoUpdateFish;

            // Set up real-time listener if enabled
            if (shouldEnableRealTime) {
                this.setupFishDataListener();
            } else {
                // Just load once
                const friendsFish = await socialService.getFriendsFish(friendUid);
                this.handleFishDataUpdate(friendsFish);
            }

            return true;

        } catch (error) {
            console.error('Error loading friend\'s fish tank:', error);
            return false;
        }
    }

    /**
     * Set up real-time listener for friend's fish data changes
     */
    private setupFishDataListener() {
        if (!this.currentFriendUid || !this.fishTank || !this.fishManager) {
            console.error('Cannot setup fish data listener: Missing required components or friend UID');
            return;
        }

        this.unsubscribeFishData = socialService.onFriendsFishChanged(this.currentFriendUid, (fishData) => {
            this.handleFishDataUpdate(fishData);
        });

        if (this.unsubscribeFishData) {
            console.log(`Fish data listener set up for friend: ${this.currentFriendUid}`);
        } else {
            console.error('Failed to set up fish data listener');
        }
    }

    /**
     * Handle real-time fish data updates
     */
    private handleFishDataUpdate(fishData: SavedFishType[] | null) {
        if (!this.fishTank || !this.fishManager) {
            console.error('FishTank or FishManager component not assigned');
            return;
        }

        // Clear existing fish first
        this.fishTank.clearAllFish();

        if (fishData && fishData.length > 0) {
            console.log(`Received ${fishData.length} fish from friend's real-time update`);
            this.fishTank.spawnFishFromData(fishData, this.fishManager);
        } else {
            console.log('No fish data received from friend\'s real-time update - tank is now empty');
        }
    }

    /**
     * Refresh the current friend's fish tank
     */
    public async refreshFriendsFishTank(): Promise<boolean> {
        if (!this.currentFriendUid) {
            console.warn('No friend currently loaded');
            return false;
        }

        return await this.loadFriendsFishTank(this.currentFriendUid, this.friendData);
    }

    /**
     * Clear the fish tank
     */
    public clearFishTank() {
        if (this.fishTank) {
            this.fishTank.clearAllFish();
        }
    }

    /**
     * Get the currently displayed friend's UID
     */
    public getCurrentFriendUid(): string | null {
        return this.currentFriendUid;
    }

    /**
     * Get the currently displayed friend's data
     */
    public getCurrentFriendData(): FriendData | null {
        return this.friendData;
    }

    /**
     * Get the number of fish in the friend's tank
     */
    public getFishCount(): number {
        return this.fishTank ? this.fishTank.getFishCount() : 0;
    }

    /**
     * Get all fish data currently displayed in the tank
     * Useful for fish stealing or interaction features
     */
    public getCurrentFishData(): SavedFishType[] {
        if (!this.fishTank) {
            return [];
        }

        // Use the existing getFishDataArray method from FishTank
        return this.fishTank.getFishDataArray();
    }

    /**
     * Check if we can interact with the friend's fish (e.g., steal)
     * This verifies that the friend is still in our friends list
     */
    public async canInteractWithFish(): Promise<boolean> {
        if (!this.currentFriendUid) {
            return false;
        }

        try {
            const friendsList = await socialService.getFriendsList();
            if (!friendsList) {
                return false;
            }

            return friendsList.some(friend => friend.uid === this.currentFriendUid);
        } catch (error) {
            console.error('Error checking friend interaction permissions:', error);
            return false;
        }
    }

    /**
     * Attempt to steal a specific fish from the friend's tank
     * @param fishId The ID of the fish to steal
     */
    public async stealFish(fishId: string): Promise<{ success: boolean; message: string; detected?: boolean }> {
        if (!this.currentFriendUid) {
            return { success: false, message: 'No friend tank currently loaded' };
        }

        const canInteract = await this.canInteractWithFish();
        if (!canInteract) {
            return { success: false, message: 'Cannot interact with this friend\'s fish' };
        }

        try {
            const result = await socialService.stealFish(this.currentFriendUid, fishId);

            // Real-time updates will automatically refresh the tank if enabled
            // If not using real-time updates, manually refresh
            if (!this.autoUpdateFish && result.success) {
                await this.refreshFriendsFishTank();
            }

            return result;
        } catch (error) {
            console.error('Error stealing fish:', error);
            return { success: false, message: 'Failed to steal fish' };
        }
    }

    /**
     * Enable or disable real-time updates for the current friend's fish tank
     */
    public setRealTimeUpdates(enabled: boolean) {
        if (enabled && !this.unsubscribeFishData && this.currentFriendUid) {
            this.setupFishDataListener();
        } else if (!enabled && this.unsubscribeFishData) {
            this.unsubscribeFishData();
            this.unsubscribeFishData = null;
            console.log('Real-time updates disabled');
        }
    }

    /**
     * Check if real-time updates are currently active
     */
    public isRealTimeUpdatesActive(): boolean {
        return this.unsubscribeFishData !== null;
    }

    /**
     * Clean up method to remove any existing listeners or data
     */
    private cleanup() {
        // Clear fish tank
        this.clearFishTank();

        // Unsubscribe from fish data listener
        if (this.unsubscribeFishData) {
            this.unsubscribeFishData();
            this.unsubscribeFishData = null;
        }

        // Clear stored friend data
        this.currentFriendUid = null;
        this.friendData = null;
    }
}
