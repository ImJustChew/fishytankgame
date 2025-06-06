import { _decorator, Component, Node, Sprite, SpriteFrame,find } from 'cc';
import { FishTank } from './FishTank';
import { FishManager } from './FishManager';
import socialService, { FriendData } from './firebase/social-service';
import { SavedFishType } from './firebase/database-service';
import { database } from './firebase/firebase';

const { ccclass, property } = _decorator;

@ccclass('FriendsFishTankManager')
export class FriendsFishTankManager extends Component {
    // 魚缸 SpriteFrame 屬性
    @property({
        type: SpriteFrame,
        tooltip: '基本魚缸 (aquarium1) 的 SpriteFrame'
    })
    private aquarium1SpriteFrame: SpriteFrame | null = null;

    @property({
        type: SpriteFrame,
        tooltip: '進階魚缸 (aquarium2) 的 SpriteFrame'
    })
    private aquarium2SpriteFrame: SpriteFrame | null = null;

    // 魚缸 Sprite 組件引用
    @property({
        type: Sprite,
        tooltip: '魚缸的 Sprite 組件'
    })
    private tankSprite: Sprite = null!;

    @property(FishTank)
    fishTank: FishTank | null = null;

    @property(FishManager)
    fishManager: FishManager | null = null;

    @property
    autoUpdateFish: boolean = true;

    private currentFriendUid: string | null = null;
    private friendData: FriendData | null = null;
    private fishDataListener: (() => void) | null = null;
    private currentFishData: SavedFishType[] = [];

    start() {
        // 查找必要的組件
        if (!this.fishTank) {
            this.fishTank = this.getComponent(FishTank);
            if (!this.fishTank) {
                const fishTankNode = find('FishTank');
                if (fishTankNode) {
                    this.fishTank = fishTankNode.getComponent(FishTank);
                }
            }
            
            if (!this.fishTank) {
                console.error('FishTank component not found');
            } else {
                console.log('FishTank component found');
            }
        }
        
        if (!this.fishManager) {
            this.fishManager = this.getComponent(FishManager);
            if (!this.fishManager) {
                const fishManagerNode = find('FishManager');
                if (fishManagerNode) {
                    this.fishManager = fishManagerNode.getComponent(FishManager);
                }
            }
            
            if (!this.fishManager) {
                console.error('FishManager component not found');
            } else {
                console.log('FishManager component found');
            }
        }
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
    public async loadFriendsFishTank(friendUid: string, friendData: any = null, enableRealTimeUpdates: boolean = false): Promise<boolean> {
        try {
            console.log(`Loading friend's fish tank: ${friendUid}`);
            
            // 清理之前的資源
            this.cleanup();
            
            // 保存當前訪問的朋友 ID
            this.currentFriendUid = friendUid;
            this.friendData = friendData;
            
            // 設置實時更新
            this.autoUpdateFish = enableRealTimeUpdates;
            
            console.log('Before loading friend tank level - will call loadFriendTankLevel now');
            // 加載朋友的魚缸等級
            await this.loadFriendTankLevel(friendUid);
            console.log('After loading friend tank level - loadFriendTankLevel completed');
            
            // 加載朋友的魚
            console.log('Loading friend\'s fish...');
            await this.loadFriendFish(friendUid);
            console.log('Friend\'s fish loaded successfully');
            
            // 如果啟用了實時更新，設置監聽器
            if (enableRealTimeUpdates) {
                this.setupFishDataListener();
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
        if (!this.currentFriendUid || this.fishDataListener) {
            return;
        }
        
        console.log(`Setting up fish data listener for friend: ${this.currentFriendUid}`);
        
        const fishRef = database.ref(`users/${this.currentFriendUid}/fishes`);
        
        // 創建監聽器函數
        const onFishDataChange = (snapshot: any) => {
            const fishData = snapshot.val();
            console.log('Fish data changed:', fishData);
            
            if (!fishData) {
                console.log('No fish data in update');
                this.handleFishDataUpdate([]);
                return;
            }
            
            // 將數據轉換為數組格式
            const fishArray: SavedFishType[] = [];
            Object.keys(fishData).forEach(key => {
                const fish = fishData[key];
                fishArray.push({
                    id: key,
                    ownerId: this.currentFriendUid!,
                    type: fish.type,
                    health: fish.health || 100,
                    lastFedTime: fish.lastFedTime || Date.now()
                });
            });
            
            this.handleFishDataUpdate(fishArray);
        };
        
        // 添加監聽器
        fishRef.on('value', onFishDataChange);
        
        // 保存監聽器引用，以便後續清理
        this.fishDataListener = () => {
            fishRef.off('value', onFishDataChange);
        };
    }

    /**
     * 清理魚數據監聽器
     */
    private cleanupFishDataListener() {
        if (this.fishDataListener) {
            this.fishDataListener();
            this.fishDataListener = null;
            console.log('Cleaned up fish data listener');
        }
    }

    /**
     * 處理魚數據更新
     */
    private handleFishDataUpdate(fishData: SavedFishType[] | null) {
        if (!fishData) {
            console.warn('No fish data received');
            this.currentFishData = [];
            return;
        }
        
        // 保存當前魚數據
        this.currentFishData = fishData;
        
        // 更新魚缸中的魚
        if (this.fishTank && this.fishManager) {
            // Make sure we're passing the fishManager to spawnFishFromData
            console.log(`Updating ${fishData.length} fish in tank with FishManager:`, this.fishManager);
            this.fishTank.spawnFishFromData(fishData, this.fishManager);
            console.log(`Updated ${fishData.length} fish in tank`);
        } else {
            console.error('Cannot update fish: FishTank or FishManager not assigned');
            if (!this.fishTank) console.error('FishTank is null');
            if (!this.fishManager) console.error('FishManager is null');
        }
    }

    /**
     * 在魚缸中生成朋友的魚
     */
    private spawnFriendFish(fishData: SavedFishType) {
        if (!this.fishTank || !this.fishManager) {
            console.error('FishTank or FishManager not assigned');
            return;
        }
        
        // 使用 FishTank 的 spawnFish 方法生成魚
        // this.fishTank.spawnFish(fishData);
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
        if (enabled && !this.fishDataListener && this.currentFriendUid) {
            this.setupFishDataListener();
        } else if (!enabled && this.fishDataListener) {
            this.cleanupFishDataListener();
        }
    }

    /**
     * Check if real-time updates are currently active
     */
    public isRealTimeUpdatesActive(): boolean {
        return this.fishDataListener !== null;
    }

    /**
     * 清理所有資源
     */
    private cleanup() {
        this.cleanupFishDataListener();
        this.currentFriendUid = null;
        this.friendData = null;
        this.currentFishData = [];
    }

    /**
     * 加載朋友的魚缸等級並更新外觀
     * @param friendUid 朋友的用戶 ID
     */
    public async loadFriendTankLevel(friendUid: string) {
        try {
            console.log(`START loadFriendTankLevel for friend: ${friendUid}`);
            
            // 從數據庫獲取朋友的魚缸等級
            console.log('Attempting to fetch tank level from database...');
            const tankLevelSnapshot = await database.ref(`users/${friendUid}/tankLevel`).once('value');
            const tankLevel = tankLevelSnapshot.val() || 1; // 默認為基本等級 (1)
            
            console.log(`Friend's tank level from database: ${tankLevel} (type: ${typeof tankLevel})`);
            
            // 將數字等級轉換為字符串標識符
            let tankLevelStr = 'aquarium1';
            if (tankLevel === 2) {
                tankLevelStr = 'aquarium2';
                console.log('Tank level is 2, using aquarium2');
            } else if (tankLevel === 3) {
                tankLevelStr = 'aquarium3'; // 如果有第三級魚缸
                console.log('Tank level is 3, using aquarium3');
            } else {
                console.log('Tank level is 1 or other value, using aquarium1');
            }
            
            // 更新魚缸外觀
            console.log(`Calling updateTankAppearance with: ${tankLevelStr}`);
            this.updateTankAppearance(tankLevelStr);
            console.log('END loadFriendTankLevel - completed successfully');
        } catch (error) {
            console.error('Failed to load friend\'s tank level:', error);
            // 默認顯示基本等級魚缸
            console.log('Error occurred, using default aquarium1');
            this.updateTankAppearance('aquarium1');
        }
    }

    /**
     * 根據魚缸等級更新外觀
     * @param tankLevel 魚缸等級 ('aquarium1' 或 'aquarium2')
     */
    private updateTankAppearance(tankLevel: string) {
        console.log(`START updateTankAppearance with level: ${tankLevel}`);
        
        // 直接使用已有的節點
        if (!this.tankSprite) {
            console.error('Cannot update tank appearance: Tank Sprite component not assigned');
            return;
        }
        
        console.log(`Tank Sprite component exists, updating appearance to: ${tankLevel}`);
        
        // 根據魚缸等級選擇相應的 SpriteFrame
        let spriteFrame: SpriteFrame | null = null;
        
        switch (tankLevel) {
            case 'aquarium1':
                spriteFrame = this.aquarium1SpriteFrame;
                console.log('Selected aquarium1SpriteFrame:', !!this.aquarium1SpriteFrame);
                break;
            case 'aquarium2':
                spriteFrame = this.aquarium2SpriteFrame;
                console.log('Selected aquarium2SpriteFrame:', !!this.aquarium2SpriteFrame);
                break;
            default:
                console.warn(`Unknown tank level: ${tankLevel}, using aquarium1 as fallback`);
                spriteFrame = this.aquarium1SpriteFrame;
                console.log('Selected fallback aquarium1SpriteFrame:', !!this.aquarium1SpriteFrame);
                break;
        }
        
        // 設置魚缸 Sprite
        if (spriteFrame) {
            this.tankSprite.spriteFrame = spriteFrame;
            console.log(`Tank appearance updated successfully to: ${tankLevel}`);
        } else {
            console.error(`SpriteFrame for tank level ${tankLevel} not assigned in Inspector`);
        }
        
        console.log('END updateTankAppearance');
    }

    /**
     * 加載朋友的魚
     * @param friendUid 朋友的用戶 ID
     */
    private async loadFriendFish(friendUid: string) {
        if (!this.fishManager) {
            console.error('FishManager not assigned to FriendsFishTankManager');
            return;
        }
        
        // 确保FishManager的spriteMap已初始化
        this.fishManager.initializeSpriteMap();
        
        // 只输出map相关的调试信息
        console.log('FishManager spriteMap initialized');
        
        try {
            // 获取朋友的鱼数据
            const fishData = await this.getFriendFishData(friendUid);
            
            // 将数据转换为数组格式
            const fishArray: SavedFishType[] = [];
            Object.keys(fishData).forEach(key => {
                const fish = fishData[key];
                const fishType = fish.type;
                const hasSprite = this.fishManager?.getFishSpriteById(fishType) ? true : false;
                
                // 只输出map查找结果
                console.log(`Map lookup: Fish type "${fishType}" -> Sprite found: ${hasSprite}`);
                
                fishArray.push({
                    id: key,
                    ownerId: friendUid,
                    type: fishType,
                    health: fish.health || 100,
                    lastFedTime: fish.lastFedTime || Date.now()
                });
            });
            
            // 保存当前鱼数据
            this.currentFishData = fishArray;
            
            // 在鱼缸中显示鱼
            if (this.fishTank) {
                this.fishTank.spawnFishFromData(fishArray, this.fishManager);
            }
        } catch (error) {
            console.error('Error loading friend\'s fish:', error);
        }
    }
}
