import { _decorator, Component, Node, input, Input, EventTouch, Camera, Vec3, UITransform, AudioClip, AudioSource, tween, Button, Label, Sprite, SpriteFrame } from 'cc';
import { FishTank } from './FishTank';
import { FishManager } from './FishManager';
import { FishFoodManager } from './FishFoodManager';
import { PlayerManager } from './PlayerManager';
import databaseService, { SavedFishType } from './firebase/database-service';
import authService from './firebase/auth-service';
import { FISH_LIST } from './FishData';
import { FISH_FOOD_LIST } from './FishFoodData';
import { FishFood } from './FishFood';
import { FriendListPanel } from './FriendListPanel';
import { AudioManager } from './AudioManager';

const { ccclass, property } = _decorator;

// 魚缸等級配置
export enum TankLevel {
    Basic = 1,
    Premium = 2,
    Deluxe = 3
}

// 魚缸升級所需金額
const TANK_UPGRADE_COST = 20000;

@ccclass('FishTankManager')
export class FishTankManager extends Component {
    @property(FishTank)
    fishTank: FishTank | null = null;

    @property(FishManager)
    fishManager: FishManager | null = null;

    @property(FishFoodManager)
    fishFoodManager: FishFoodManager | null = null;

    @property(PlayerManager)
    playerManager: PlayerManager | null = null;

    @property
    autoLoadFish: boolean = true;

    @property
    eatDistance: number = 20;

    @property
    trackingRange: number = 400;

    @property(FriendListPanel)
    friendListPanel: FriendListPanel = null;

    @property(AudioClip)
    backgroundMusic: AudioClip | null = null;

    @property(AudioClip)
    fishFoodGenerationSound: AudioClip | null = null;

    @property(AudioClip)
    eatFishFoodSound: AudioClip | null = null;

    private musicAudioSource: AudioSource | null = null;

    @property(Node)
    public upgradeTankButton: Node = null!;

    @property(Label)
    public upgradeTankLabel: Label = null!;

    @property(SpriteFrame)
    public tankLevelSprites: SpriteFrame[] = [];

    @property(Sprite)
    public tankBackgroundSprite: Sprite = null!;

    private currentMoney: number = 0;
    private currentTankLevel: TankLevel = TankLevel.Basic;

    update(deltaTime: number) {
        // check for collision of fish and food (eating) 
        for (const food of this.fishTank.getActiveFishFood()) {
            for (const fish of this.fishTank.getActiveFish()) {
                if (this.isFoodNearFish(food.node, fish.node)) {
                    fish.eatFood(food.getFoodType());
                    food.destroyFood();
                    if (this.eatFishFoodSound) {
                        const sfxNode = new Node('SFXAudioSource');
                        const sfx = sfxNode.addComponent(AudioSource);
                        sfx.clip = this.eatFishFoodSound;
                        sfx.volume = 0.4;
                        sfx.play();
                        this.node.addChild(sfxNode);
                        sfx.node.once(AudioSource.EventType.ENDED, () => {
                            sfxNode.destroy();
                        });
                    }
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
        // Make sure fishManager is initialized before setting up listeners
        if (this.fishManager) {
            console.log('[FishTankManager] Initializing FishManager sprite map');
            this.fishManager.initializeSpriteMap();
            
            // Debug: Check if the fishManager has sprites after initialization
            const testSprite = this.fishManager.getFishSpriteById('fish_001');
            console.log('[FishTankManager] Test sprite for fish_001:', testSprite ? 'Found' : 'Not found');
        } else {
            console.error('FishManager not assigned to FishTankManager');
        }
        
        // Set up fish data listener
        this.setupFishDataListener();
        
        // Initialize upgrade button
        this.initUpgradeButton();
        
        // Load tank level from database
        this.loadTankLevelFromDatabase();
        
        // Set up money listener
        //this.setupMoneyListener();
        //this.spawnDefaultFish();

        // Initialize player system
        this.initializePlayerSystem();

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
     * Handle real-time fish data updates - preserves fish positions
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
            // Use updateFishFromData instead of spawnFishFromData to preserve positions
            this.fishTank.updateFishFromData(fishData, this.fishManager);
        } else {
            console.log('No fish data received from real-time update');
            // Clear all fish when no data is received
            this.fishTank.clearAllFish();
            // Optionally spawn default fish for testing
            //this.spawnDefaultFish();
        }
    }

    public async loadFishFromDatabase(preserveExisting: boolean = false) {
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

            // Debug: Log the exact fish data retrieved from the database
            console.log('[FishTankManager] Fish data from database:', JSON.stringify(savedFish));

            if (savedFish && savedFish.length > 0) {
                console.log(`Loading ${savedFish.length} fish from database`);
                
                // Debug: Check if fish types match FISH_LIST IDs
                const fishListIds = FISH_LIST.map(fish => fish.id);
                for (const fish of savedFish) {
                    console.log(`[FishTankManager] Fish type: "${fish.type}", exists in FISH_LIST: ${fishListIds.indexOf(fish.type) !== -1}`);
                }
                
                if (preserveExisting) {
                    // Use updateFishFromData to preserve existing fish positions
                    this.fishTank.updateFishFromData(savedFish, this.fishManager);
                } else {
                    // Use spawnFishFromData for complete replacement (default behavior)
                    this.fishTank.spawnFishFromData(savedFish, this.fishManager);
                }
            } else {
                console.log('No saved fish found in database');
                // Optionally spawn some default fish for testing
                //this.spawnDefaultFish();
            }
        } catch (error) {
            console.error('Error loading fish from database:', error);
            // Fallback to default fish
            //this.spawnDefaultFish();
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

    // ==================== PLAYER SYSTEM METHODS ====================

    /**
     * Initialize the player system
     */
    private async initializePlayerSystem() {
        if (!this.fishTank) {
            console.error('FishTank component not assigned, cannot initialize player system');
            return;
        }

        if (!this.playerManager) {
            console.error('PlayerManager component not assigned, cannot initialize player system');
            return;
        }

        try {
            // Spawn current user's player
            await this.fishTank.spawnCurrentUserPlayer(this.playerManager);
            console.log('Player system initialized successfully');
        } catch (error) {
            console.error('Error initializing player system:', error);
        }
    }

    /**
     * Refresh player positions (useful for manual updates)
     */
    public async refreshPlayers() {
        if (!this.fishTank) {
            console.error('FishTank component not assigned');
            return;
        }

        if (!this.playerManager) {
            console.error('PlayerManager component not assigned');
            return;
        }

        try {
            console.log('Players refreshed successfully');
        } catch (error) {
            console.error('Error refreshing players:', error);
        }
    }

    /**
     * Get current user's player
     */
    public getCurrentUserPlayer() {
        return this.fishTank ? this.fishTank.getCurrentUserPlayer() : null;
    }

    /**
     * Get number of active players
     */
    public getPlayerCount(): number {
        return this.fishTank ? this.fishTank.getPlayerCount() : 0;
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
        console.log('Click detected in FishTankManager');
        if (this.friendListPanel && this.friendListPanel.node.active) {
            return;
        }
        const currentFoodType = this.fishTank.getCurrentActiveFishFood();
        const touchPos = event.getUILocation();
        if (!touchPos) {
            console.warn('Could not convert to world space.');
            return;
        }

        const spawnLocation = this.fishTank.getComponent(UITransform)!.convertToNodeSpaceAR(
            new Vec3(touchPos.x, touchPos.y, 0));
        console.log(currentFoodType);
        this.fishTank.spawnFishFood(currentFoodType, spawnLocation, this.fishFoodManager);
        console.log('Spawned default fish food for testing');
        console.log('Touch position:', touchPos);
        if (this.fishFoodGenerationSound) {
            const sfxNode = new Node('SFXAudioSource');
            const sfx = sfxNode.addComponent(AudioSource);
            sfx.clip = this.fishFoodGenerationSound;
            sfx.volume = 1;
            sfx.play();
            this.node.addChild(sfxNode);
            sfx.node.once(AudioSource.EventType.ENDED, () => {
                sfxNode.destroy();
            });
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

    private initUpgradeButton() {
        if (this.upgradeTankButton) {
            // 初始時隱藏按鈕
            this.upgradeTankButton.active = false;
            
            // 添加點擊事件
            const button = this.upgradeTankButton.getComponent(Button);
            if (button) {
                button.node.on(Button.EventType.CLICK, this.onUpgradeTankClicked, this);
            }
            
            // 設置按鈕文字
            if (this.upgradeTankLabel) {
                this.upgradeTankLabel.string = `升級魚缸 ($${TANK_UPGRADE_COST})`;
            }
        }
    }
    
    private async loadTankLevelFromDatabase() {
        try {
            const userData = await databaseService.getUserData();
            if (userData && userData.tankLevel) {
                this.currentTankLevel = userData.tankLevel;
                this.updateTankAppearance();
            } else {
                // 如果數據庫中沒有魚缸等級，設置為基本等級並保存
                this.currentTankLevel = TankLevel.Basic;
                this.saveTankLevelToDatabase();
            }
        } catch (error) {
            console.error('Failed to load tank level:', error);
        }
    }
    
    private async saveTankLevelToDatabase() {
        try {
            // 使用新添加的 updateUserTankLevel 方法
            await databaseService.updateUserTankLevel(this.currentTankLevel);
            console.log(`Tank level saved to database: ${this.currentTankLevel}`);
        } catch (error) {
            console.error('Failed to save tank level:', error);
        }
    }
    
    /*private setupMoneyListener() {
        // 監聽金錢變化
        databaseService.onUserMoneyChanged((money) => {
            this.currentMoney = money;
            this.checkUpgradeAvailability();
        });
    }*/
    
    private checkUpgradeAvailability() {
        // 如果金錢達到升級要求且魚缸等級未達最高，顯示升級按鈕
        if (this.currentMoney >= TANK_UPGRADE_COST && this.currentTankLevel < TankLevel.Deluxe) {
            if (this.upgradeTankButton) {
                this.upgradeTankButton.active = true;
            }
        } else {
            if (this.upgradeTankButton) {
                this.upgradeTankButton.active = false;
            }
        }
    }
    
    private async onUpgradeTankClicked() {
        // 檢查金錢是否足夠
        if (this.currentMoney < TANK_UPGRADE_COST) {
            console.log('Not enough money to upgrade tank');
            return;
        }
        
        // 檢查魚缸等級是否已達最高
        if (this.currentTankLevel >= TankLevel.Deluxe) {
            console.log('Tank already at maximum level');
            return;
        }
        
        try {
            // 扣除金錢
            const newMoney = this.currentMoney - TANK_UPGRADE_COST;
            await databaseService.updateUserMoney(newMoney);
            
            // 升級魚缸
            this.currentTankLevel++;
            
            // 更新魚缸外觀
            this.updateTankAppearance();
            
            // 保存魚缸等級到數據庫
            await this.saveTankLevelToDatabase();
            
            // 隱藏升級按鈕
            this.checkUpgradeAvailability();
            
            // 播放升級音效
            const audioManager = AudioManager.getInstance();
            if (audioManager) {
                audioManager.playSFX('upgrade_success');
            }
            
            console.log(`Tank upgraded to level ${this.currentTankLevel}`);
        } catch (error) {
            console.error('Failed to upgrade tank:', error);
        }
    }
    
    private updateTankAppearance() {
        // 根據魚缸等級更新外觀
        if (this.tankBackgroundSprite && this.tankLevelSprites.length >= this.currentTankLevel) {
            const spriteIndex = this.currentTankLevel - 1;
            this.tankBackgroundSprite.spriteFrame = this.tankLevelSprites[spriteIndex];
        }
        
        // 根據魚缸等級調整魚缸大小或其他屬性
        if (this.fishTank) {
            // 更新魚缸容量
            this.fishTank.maxFishCount = 10 + (this.currentTankLevel - 1) * 5;
            this.fishTank.maxFishFoodCount = 20 + (this.currentTankLevel - 1) * 10;
        }
    }
}
