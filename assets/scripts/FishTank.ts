import { _decorator, Component, Node, Prefab, instantiate, Vec3, UITransform, Sprite, SpriteFrame } from 'cc';
import { SavedFishType } from './firebase/database-service';
import { Fish } from './Fish';
import { FishManager } from './FishManager';
import { FishFoodManager } from './FishFoodManager';
import { FishFood } from './FishFood'
import { FishFoodType, FISH_FOOD_LIST } from './FishFoodData'
import { Player, PlayerData } from './Player';
import { PlayerManager } from './PlayerManager';
import databaseService from './firebase/database-service';
import authService from './firebase/auth-service';


const { ccclass, property } = _decorator;

@ccclass('FishTank')
export class FishTank extends Component {

    @property
    maxFishCount: number = 99999;

    @property
    maxFishFoodCount: number = 20;

    @property
    maxPlayerCount: number = 5; // Max players that can be displayed (current user + friends)

    private activeFish: Fish[] = [];
    private activeFishFood: FishFood[] = []
    private activePlayers: Player[] = [];
    private tankBounds: { min: Vec3, max: Vec3 } = { min: new Vec3(), max: new Vec3() };

    private currentActiveFishFood: FishFoodType | null = null;
    private currentUser: Player | null = null; // Reference to current user's player

    start() {
        this.calculateTankBounds();
        // always set default fish food value
        this.setCurrentActiveFishFoodByIdx(0);
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
        if (!fishDataArray) {
            console.log('No fish data provided');
            return;
        }

        console.log(`Spawning ${fishDataArray.length} fish from data`);
        
        // Debug: Check if fishManager is valid
        if (!fishManager) {
            console.error('[FishTank] No FishManager provided to spawnFishFromData');
            return;
        }
        
        console.log('[FishTank] Using FishManager:', fishManager);

        // Clear existing fish first
        this.clearAllFish();

        // Process each fish from the data
        fishDataArray.slice(0, this.maxFishCount).forEach(fishData => {
            // Skip fish with undefined type
            if (!fishData.type) {
                console.warn('[FishTank] Skipping fish with undefined type');
                return;
            }
            
            // Debug: Log each fish's type
            console.log(`[FishTank] Processing fish with type: "${fishData.type}"`);
            
            // 檢查魚是否已死亡
            if (fishData.health <= 0) {
                console.log(`Skipping dead fish ${fishData.id}`);
                
                // 從數據庫中移除已死亡的魚
                if (fishData.id) {
                    databaseService.removeFish(fishData.id)
                        .then(() => {
                            console.log(`Dead fish ${fishData.id} removed from database`);
                        })
                        .catch(error => {
                            console.error(`Error removing dead fish ${fishData.id}:`, error);
                        });
                }
                
                return;
            }
            
            // 生成活著的魚 - Make sure to pass fishManager
            this.spawnFish(fishData, fishManager);
        });
    }

    /**
     * Update fish data without losing positions - intelligent synchronization
     * Only adds new fish, removes missing fish, and updates existing fish data
     */
    public updateFishFromData(fishDataArray: SavedFishType[], fishManager: FishManager) {
        if (!fishDataArray) {
            console.log('No fish data provided for update');
            return;
        }

        console.log(`Updating ${fishDataArray.length} fish from data`);
        
        // Debug: Check if fishManager is valid
        if (!fishManager) {
            console.error('[FishTank] No FishManager provided to updateFishFromData');
            return;
        }
        
        console.log('[FishTank] Using FishManager:', fishManager);

        // Create a set of IDs from the new data for quick lookup
        const newFishIds = new Set<string>();
        fishDataArray.forEach(fish => {
            if (fish.id) {
                newFishIds.add(fish.id);
            }
        });

        // Remove fish that are no longer in the new data
        const fishToRemove = this.activeFish.filter(fish => {
            const fishData = fish.getFishData();
            return fishData?.id && !newFishIds.has(fishData.id);
        });

        fishToRemove.forEach(fish => {
            console.log(`Removing fish ${fish.getFishData()?.id} - no longer in database`);
            this.removeFish(fish);
        });

        // Process each fish from the new data
        fishDataArray.slice(0, this.maxFishCount).forEach(newFishData => {
            // 檢查魚是否已死亡
            if (newFishData.health <= 0) {
                console.log(`Skipping dead fish ${newFishData.id}`);
                
                // 從數據庫中移除已死亡的魚
                if (newFishData.id) {
                    databaseService.removeFish(newFishData.id)
                        .then(() => {
                            console.log(`Dead fish ${newFishData.id} removed from database`);
                        })
                        .catch(error => {
                            console.error(`Error removing dead fish ${newFishData.id}:`, error);
                        });
                }
                
                // 如果這條死魚已經在場景中，移除它
                const existingFish = this.activeFish.find(fish => {
                    const fishData = fish.getFishData();
                    return fishData?.id === newFishData.id;
                });
                
                if (existingFish) {
                    console.log(`Removing dead fish ${newFishData.id} from scene`);
                    this.removeFish(existingFish);
                }
                
                return;
            }

            if (!newFishData.id) {
                console.warn('Fish data missing ID, cannot sync');
                return;
            }

            // Find existing fish with this ID
            const existingFish = this.activeFish.find(fish => {
                const fishData = fish.getFishData();
                return fishData?.id === newFishData.id;
            });

            if (existingFish) {
                // Update existing fish data without losing position
                //console.log(`Updating existing fish ${newFishData.id} data`);
                existingFish.updateFishData(newFishData);
                console.log(`Updated existing fish ${newFishData.id}`);
            } else {
                // Spawn new fish - make sure to pass fishManager
                this.spawnFish(newFishData, fishManager);
                console.log(`Spawned new fish ${newFishData.id}`);
            }
        });
    }

    public spawnFish(fishData: SavedFishType, fishManager: FishManager): Fish | null {
        //console.log(`Attempting to spawn fish: ${fishData.type} with ID: ${fishData.id}`);
        if (this.activeFish.length >= this.maxFishCount) {
            console.warn('Maximum fish count reached, cannot spawn more fish');
            return null;
        }

        // Get sprite frame for the fish type if fishManager is provided
        let spriteFrame = null;
        if (fishManager) {
            // Debug: Log the fish manager instance
            console.log('[FishTank] FishManager provided:', fishManager);
            
            // Debug: Log the fish type being requested
            console.log(`[FishTank] Requesting sprite for fish type: "${fishData.type}"`);
            
            // Check if the fishManager has the getFishSpriteById method
            if (typeof fishManager.getFishSpriteById === 'function') {
                spriteFrame = fishManager.getFishSpriteById(fishData.type);
                console.log(`[FishTank] Sprite frame result:`, spriteFrame ? 'Found' : 'Not found');
            } else {
                console.error('[FishTank] FishManager does not have getFishSpriteById method');
            }
        } else {
            console.warn('[FishTank] No FishManager provided for fish type:', fishData.type);
        }
        
        if (!spriteFrame) {
            console.warn(`[FishTank] No sprite found for fish type: ${fishData.type}, spawning without sprite`);
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

        // Add UITransform component for collision detection
        const uiTransform = fishNode.addComponent(UITransform);
        if (uiTransform) {
            // Set size based on sprite or default size
            if (spriteFrame) {
                const originalSize = spriteFrame.originalSize;
                uiTransform.setContentSize(originalSize.width, originalSize.height);
            } else {
                uiTransform.setContentSize(50, 50); // Default size if no sprite
            }
        }

        // Initialize the fish with data and bounds
        console.log(`Spawning fish: ${fishData.type} with ID: ${fishData.id}`);
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

    // public spawnFishFoodFromData(fishFood: FishFoodType, fishFoodManager: FishFoodManager) {
    //     // Recalculate tank bounds to ensure they're up to date
    //     this.calculateTankBounds();

    //     // Limit the number of fish to spawn
    //     // const fishToSpawn = fishDataArray.slice(0, this.maxFishCount);

    //     this.spawnFishFood(fishFood, fishFoodManager);
    // }

    public spawnFishFood(fishFoodType: FishFoodType, spawnLocation: Vec3, fishFoodManager: FishFoodManager): FishFood | null {
        this.calculateTankBounds();

        // the click is out of bound, return null
        if (spawnLocation.x < this.tankBounds.min.x || spawnLocation.y < this.tankBounds.min.y
            || spawnLocation.x > this.tankBounds.max.x || spawnLocation.y > this.tankBounds.max.y
        ) {
            return null;
        }
        // make condition when food in aquarium has already reached a certain amount to avoid lag
        if (this.activeFishFood.length >= this.maxFishFoodCount) {
            console.warn('Maximum fish food count reached, cannot spawn more food');
            return null;
        }

        // Get sprite frame for the fish type
        const spriteFrame = fishFoodManager.getFishFoodSpriteById(fishFoodType.id);
        if (!spriteFrame) {
            console.warn(`No sprite found for fish type: ${fishFoodType.id}, spawning without sprite`);
        }

        // Create a new node for the fish
        const fishFoodNode = new Node(`Fish_${fishFoodType.id}`);
        this.node.addChild(fishFoodNode);

        // Add Fish component
        const fishFoodComponent = fishFoodNode.addComponent(FishFood);
        if (!fishFoodComponent) {
            console.error('Failed to add Fish Food component');
            fishFoodNode.destroy();
            return null;
        }

        // Add Sprite component and set sprite frame
        const spriteComponent = fishFoodNode.addComponent(Sprite);
        if (spriteComponent && spriteFrame) {
            spriteComponent.spriteFrame = spriteFrame;
        }

        // Initialize the fish food with data and bounds
        fishFoodComponent.initializeFishFood(fishFoodType, spawnLocation, this.tankBounds);

        // Add to active fish food array
        this.activeFishFood.push(fishFoodComponent);

        // Set up cleanup when fish food is destroyed
        fishFoodNode.on(Node.EventType.NODE_DESTROYED, () => {
            const index = this.activeFishFood.indexOf(fishFoodComponent);
            if (index > -1) {
                this.activeFishFood.splice(index, 1);
            }
        });

        return fishFoodComponent;
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

    public getActiveFishFood(): FishFood[] {
        return [...this.activeFishFood]
    }

    public getFishCount(): number {
        return this.activeFish.length;
    }

    public getFishFoodCount(): number {
        return this.activeFishFood.length;
    }
    /**
     * Get Current active food list 
     * @param idx 
     * @returns 
     */
    public getCurrentActiveFishFood(): FishFoodType | null {
        return this.currentActiveFishFood;
    }

    public getFishDataArray(): SavedFishType[] {
        return this.activeFish
            .map(fish => fish.getFishData())
            .filter(data => data !== null) as SavedFishType[];
    }

    /**
     * Set the current Active fish food maybe by idx in an array, 
     * for example from UI manager by passing an index 
     * @param index 
     */
    public setCurrentActiveFishFoodByIdx(index) {
        this.currentActiveFishFood = FISH_FOOD_LIST[index];
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

        // Update bounds for existing players
        this.activePlayers.forEach(player => {
            if (player && player.initializePlayer) {
                const playerData = player.getPlayerData();
                if (playerData) {
                    player.initializePlayer(playerData, this.tankBounds);
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

    // ==================== PLAYER MANAGEMENT METHODS ====================

    /**
     * Spawn the current user's player (controllable)
     */
    public async spawnCurrentUserPlayer(playerManager?: PlayerManager): Promise<Player | null> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot spawn current user player: No user is signed in');
            return null;
        }

        // Check if current user player already exists
        if (this.currentUser) {
            console.log('Current user player already spawned');
            return this.currentUser;
        }

        // Get or create player position from database
        let playerPosition = await databaseService.getPlayerPosition(user.uid);
        if (!playerPosition) {
            // Create default position if none exists
            playerPosition = { x: 0, y: 0, lastUpdated: Date.now() };
            await databaseService.updatePlayerPosition(0, 0);
        }

        const playerData: PlayerData = {
            ownerId: user.uid,
            x: playerPosition.x,
            y: playerPosition.y,
            isCurrentUser: true
        };

        const player = this.spawnPlayer(playerData, playerManager);
        if (player) {
            this.currentUser = player;
            console.log('Current user player spawned successfully');
        }

        return player;
    }

    /**
     * Load player sprite asynchronously using the avatar system
     */
    private async loadPlayerSprite(spriteComponent: Sprite, ownerId: string, playerManager: PlayerManager) {
        try {
            const playerSprite = await playerManager.getPlayerSpriteByUserId(ownerId);
            if (playerSprite) {
                spriteComponent.spriteFrame = playerSprite;
            } else {
                console.warn(`No sprite found for player ${ownerId}, using default`);
                const defaultSprite = playerManager.getDefaultPlayerSprite();
                if (defaultSprite) {
                    spriteComponent.spriteFrame = defaultSprite;
                }
            }
        } catch (error) {
            console.error(`Error loading sprite for player ${ownerId}:`, error);
            // Fallback to default sprite
            const defaultSprite = playerManager.getDefaultPlayerSprite();
            if (defaultSprite) {
                spriteComponent.spriteFrame = defaultSprite;
            }
        }
    }

    /**
     * Spawn a player (current user or friend)
     */
    public spawnPlayer(playerData: PlayerData, playerManager?: PlayerManager): Player | null {
        if (this.activePlayers.length >= this.maxPlayerCount) {
            console.warn('Maximum player count reached, cannot spawn more players');
            return null;
        }

        // Create a new node for the player
        const playerNode = new Node(`Player_${playerData.ownerId}`);
        this.node.addChild(playerNode);

        // Add Player component
        const playerComponent = playerNode.addComponent(Player);
        if (!playerComponent) {
            console.error('Failed to add Player component');
            playerNode.destroy();
            return null;
        }

        // Add Sprite component for player visual
        const spriteComponent = playerNode.addComponent(Sprite);
        if (spriteComponent && playerManager) {
            // Get player sprite from PlayerManager (now supports avatar system)
            this.loadPlayerSprite(spriteComponent, playerData.ownerId, playerManager);
        }

        // Initialize the player with data and bounds
        playerComponent.initializePlayer(playerData, this.tankBounds);

        // Add to active players array
        this.activePlayers.push(playerComponent);

        // Set up cleanup when player is destroyed
        playerNode.on(Node.EventType.NODE_DESTROYED, () => {
            const index = this.activePlayers.indexOf(playerComponent);
            if (index > -1) {
                this.activePlayers.splice(index, 1);
            }

            // Clear current user reference if this was the current user
            if (this.currentUser === playerComponent) {
                this.currentUser = null;
            }
        });

        return playerComponent;
    }
    /**
     * Remove all players including current user
     */
    public clearAllPlayers() {
        this.activePlayers.forEach(player => {
            if (player && player.node) {
                player.node.destroy();
            }
        });
        this.activePlayers = [];
        this.currentUser = null;
        console.log('Cleared all players');
    }

    /**
     * Remove a specific player
     */
    public removePlayer(player: Player) {
        const index = this.activePlayers.indexOf(player);
        if (index > -1) {
            this.activePlayers.splice(index, 1);

            // Clear current user reference if removing current user
            if (this.currentUser === player) {
                this.currentUser = null;
            }

            player.node.destroy();
        }
    }

    /**
     * Get the current user's player
     */
    public getCurrentUserPlayer(): Player | null {
        return this.currentUser;
    }

    /**
     * Get all active players
     */
    public getActivePlayers(): Player[] {
        return [...this.activePlayers];
    }

    /**
     * Get the number of active players
     */
    public getPlayerCount(): number {
        return this.activePlayers.length;
    }

    /**
     * 檢查並清理已死亡的魚
     * 這個方法應該定期調用，確保數據庫和遊戲狀態保持同步
     */
    public cleanupDeadFish() {
        if (!this.activeFish || this.activeFish.length === 0) return;
        
        console.log(`Checking ${this.activeFish.length} fish for dead ones...`);
        
        const deadFish = this.activeFish.filter(fish => {
            const fishData = fish.getFishData();
            return fishData && fishData.health <= 0;
        });
        
        if (deadFish.length > 0) {
            console.log(`Found ${deadFish.length} dead fish to clean up`);
            
            deadFish.forEach(fish => {
                const fishData = fish.getFishData();
                if (fishData && fishData.id) {
                    console.log(`Removing dead fish ${fishData.id} from database`);
                    
                    // 從數據庫中移除魚
                    databaseService.removeFish(fishData.id)
                        .then(() => {
                            console.log(`Fish ${fishData.id} successfully removed from database`);
                        })
                        .catch(error => {
                            console.error(`Error removing fish ${fishData.id} from database:`, error);
                        });
                    
                    // 從遊戲中移除魚
                    this.removeFish(fish);
                }
            });
        } else {
            console.log('No dead fish found');
        }
    }

    onDestroy() {
        this.clearAllFish();
        this.clearAllPlayers();
    }
}
